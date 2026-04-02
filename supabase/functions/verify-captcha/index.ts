import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";

/** Maximum age of a CAPTCHA challenge response we accept (5 minutes). */
const TOKEN_TTL_SECONDS = 5 * 60;

/** Rate-limiting: max verification attempts per identifier per window. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;

/** Compute a SHA-256 hex digest of `input`. */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"), true);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase =
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "CAPTCHA token is required", valid: false }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── FIX #5: Rate limiting (5 attempts / 60 s per IP) ──────────────────────
    if (supabase) {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
      const { count } = await supabase
        .from("rate_limit_logs")
        .select("*", { count: "exact", head: true })
        .eq("identifier", ipAddress)
        .eq("action", "verify-captcha")
        .gte("attempted_at", windowStart);

      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({ error: "Too many CAPTCHA attempts. Please wait and try again.", valid: false }),
          { status: 429, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      // Record this attempt (best-effort; don't fail the request if insert fails)
      await supabase.from("rate_limit_logs").insert({
        identifier: ipAddress,
        action: "verify-captcha",
        attempted_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn("rate_limit_logs insert error:", error.message);
      });
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
    const tokenHash = supabase ? await sha256(token) : null;
    if (supabase && tokenHash) {
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
    if (supabase && tokenHash) {
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
