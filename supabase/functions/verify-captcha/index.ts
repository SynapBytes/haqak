import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders, isAllowedOrigin } from "../shared/cors.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";

/** Maximum age of a CAPTCHA challenge response we accept (5 minutes). */
const TOKEN_TTL_SECONDS = 5 * 60;

/** Rate-limiting: max verification attempts per identifier per window. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_PATH = "/verify-captcha";

/** Compute a SHA-256 hex digest of `input`. */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = buildCorsHeaders(origin, true);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required env vars for verify-captcha", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    });
    return new Response(JSON.stringify({ error: "Server configuration error", valid: false }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const authHeader = req.headers.get("Authorization");
    const authToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    let userId: string | null = null;

    if (authToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
      if (!authError && user?.id) {
        userId = user.id;
      }
    }

    if (!userId && !isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: "Unauthorized origin or missing auth token", valid: false }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "CAPTCHA token is required", valid: false }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Rate limiting (5 attempts / 60 s per IP)
    try {
      await rateLimiter(
        supabase,
        userId,
        RATE_LIMIT_PATH,
        ipAddress,
        200,
        { maxRequests: RATE_LIMIT_MAX, windowMinutes: RATE_LIMIT_WINDOW_MINUTES },
      );
    } catch (rateError) {
      if (rateError instanceof RateLimitError) {
        const status = rateError.reason === "storage_error" ? 503 : 429;
        return new Response(
          JSON.stringify({
            error: rateError.reason === "storage_error"
              ? "Rate limiting is temporarily unavailable. Please retry shortly."
              : "Too many CAPTCHA attempts. Please wait and try again.",
            valid: false,
          }),
          {
            status,
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Retry-After": String(rateError.retryAfterSeconds),
            },
          },
        );
      }
      throw rateError;
    }

    const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
    const IS_DEV = Deno.env.get("ENVIRONMENT") === "development";
    
    if (!TURNSTILE_SECRET_KEY) {
      console.error("TURNSTILE_SECRET_KEY is not configured");
      // Only allow bypass in explicit development environment
      if (IS_DEV) {
        return new Response(JSON.stringify({ valid: true, score: 1.0, dev_mode: true }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "CAPTCHA service unavailable", valid: false }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── FIX #1: Single-use enforcement — reject already-verified tokens ────────
    // Compute the hash once and reuse it when recording the token later.
    const tokenHash = await sha256(token);
    if (tokenHash) {
      const { data: existing } = await supabase
        .from("captcha_verifications")
        .select("id")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "CAPTCHA token has already been used", valid: false }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    // Verify token with Cloudflare Turnstile
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error("Turnstile verification failed:", response.status);
      return new Response(JSON.stringify({ error: "CAPTCHA verification failed", valid: false }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    if (!data.success) {
      console.warn("CAPTCHA token invalid or expired:", data);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "CAPTCHA validation failed",
        errorCodes: data["error-codes"]
      }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── FIX #1: Server-side TTL enforcement (5 minutes) ───────────────────────
    if (data.challenge_ts) {
      const challengeTime = new Date(data.challenge_ts).getTime();
      const ageSeconds = (Date.now() - challengeTime) / 1000;
      if (ageSeconds > TOKEN_TTL_SECONDS) {
        return new Response(
          JSON.stringify({ error: "CAPTCHA token has expired. Please solve the challenge again.", valid: false }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    // ── FIX #1: Record the token hash to prevent replay ───────────────────────
    if (tokenHash) {
      await supabase.from("captcha_verifications").insert({
        token_hash: tokenHash,
        ip_address: ipAddress,
        verified_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn("captcha_verifications insert error:", error.message);
      });
    }

    // Return success with challenge metadata
    return new Response(JSON.stringify({
      valid: true,
      score: data.success ? 1.0 : 0.0,
      challengeTs: data.challenge_ts,
      hostname: data.hostname,
      errorCodes: data["error-codes"] || [],
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-captcha error:", e);
    return new Response(JSON.stringify({ error: "Internal server error", valid: false }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
