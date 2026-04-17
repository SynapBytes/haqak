import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";
import { getSecret } from "../_shared/secrets.ts";
import { validateProductionSecrets } from "../_shared/secret-validation.ts";

interface VerifyBody {
  email: string;
  code: string;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const csrfError = requireCsrfToken(req, cors);
    if (csrfError) return csrfError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = await getSecret("SUPABASE_SERVICE_ROLE_KEY");
    const OTP_HMAC_SECRET = await getSecret("OTP_HMAC_SECRET");

    validateProductionSecrets({
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      OTP_HMAC_SECRET: OTP_HMAC_SECRET,
    });

    if (!supabaseUrl || !serviceKey || !OTP_HMAC_SECRET) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const clientIp =
      req.headers.get("CF-Connecting-IP") ??
      req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
      "0.0.0.0";

    try {
      await rateLimiter(supabase, user.id, "/verify-email-code", clientIp, 200, {
        maxRequests: 10,
        windowMinutes: 10,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(error.retryAfterSeconds) },
        });
      }
      throw error;
    }

    const { email, code } = (await req.json()) as VerifyBody;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^\d{6}$/.test(String(code || ""))) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: verificationRow } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", normalizedEmail)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verificationRow) {
      return new Response(JSON.stringify({ error: "Invalid verification code" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if ((verificationRow.attempts ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many attempts" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const expected = await hmacSha256Hex(
      OTP_HMAC_SECRET,
      `${user.id}:${normalizedEmail}:${code}:${verificationRow.expires_at}`,
    );

    if (expected !== verificationRow.code_hash) {
      await supabase
        .from("email_verification_codes")
        .update({ attempts: (verificationRow.attempts ?? 0) + 1 })
        .eq("id", verificationRow.id);
      return new Response(JSON.stringify({ error: "Invalid verification code" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    await supabase
      .from("email_verification_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", verificationRow.id);

    await supabase
      .from("profiles")
      .update({ email: normalizedEmail, pending_email: null, email_verified: true })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
