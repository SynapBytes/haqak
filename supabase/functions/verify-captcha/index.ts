import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "CAPTCHA token is required", valid: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!TURNSTILE_SECRET_KEY) {
      console.error("TURNSTILE_SECRET_KEY is not configured");
      // If secret is not configured, allow the request (for development)
      return new Response(JSON.stringify({ valid: true, score: 1.0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-captcha error:", e);
    return new Response(JSON.stringify({ error: "Internal server error", valid: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
