import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";
import { getSecret } from "../_shared/secrets.ts";
import { validateProductionSecrets } from "../_shared/secret-validation.ts";

interface RequestBody {
  email: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

serve(async (req) => {
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
    const RESEND_API_KEY = await getSecret("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = await getSecret("RESEND_FROM_EMAIL") ?? "team@haqak.org";

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
      await rateLimiter(supabase, user.id, "/request-email-verification", clientIp, 200, {
        maxRequests: 8,
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

    const { email } = (await req.json()) as RequestBody;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const codeHash = await hmacSha256Hex(OTP_HMAC_SECRET, `${user.id}:${normalizedEmail}:${code}:${expiresAt}`);

    await supabase.from("email_verification_codes").insert({
      user_id: user.id,
      email: normalizedEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
    });

    await supabase
      .from("profiles")
      .update({ pending_email: normalizedEmail, email_verified: false })
      .eq("user_id", user.id);

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [normalizedEmail],
          subject: "تأكيد البريد الإلكتروني - حقك",
          text: `رمز تأكيد البريد الإلكتروني: ${code}\nينتهي خلال 10 دقائق.`,
        }),
      });
    }

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
