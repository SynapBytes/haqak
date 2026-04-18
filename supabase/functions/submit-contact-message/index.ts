import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders, isAllowedOrigin } from "../shared/cors.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";

const RATE_LIMIT_PATH = "/submit-contact-message";
const RATE_LIMIT_MAX = 4;
const RATE_LIMIT_WINDOW_MINUTES = 1;
const SUCCESS_RESPONSE_STATUS = 200;
const EMAIL_REGEX =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

type SubmitPayload = {
  name?: string;
  email?: string;
  message?: string;
  captchaToken?: string;
  website?: string;
};

const maskIp = (ip: string): string => {
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (ip.includes(":")) {
    const segments = ip.split(":");
    return `${segments.slice(0, 4).join(":")}::`;
  }
  return "unknown";
};

const json = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = buildCorsHeaders(origin, true);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed", valid: false }, 405, cors);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("submit-contact-message: missing supabase env");
    return json({ error: "server_unavailable", valid: false }, 503, cors);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  try {
    const authHeader = req.headers.get("Authorization");
    const authToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    let userId: string | null = null;
    if (authToken) {
      const { data: { user } } = await supabase.auth.getUser(authToken);
      userId = user?.id ?? null;
    }

    if (!userId && !isAllowedOrigin(origin)) {
      return json({ error: "origin_blocked", valid: false }, 403, cors);
    }

    let body: SubmitPayload;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_payload", valid: false }, 400, cors);
    }

    const name = (body.name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim();
    const message = (body.message ?? "").toString().trim();
    const captchaToken = (body.captchaToken ?? "").toString().trim();
    const website = (body.website ?? "").toString().trim();

    if (website.length > 0) {
      console.warn("submit-contact-message: honeypot_triggered", { ipAddress: maskIp(ipAddress) });
      return json({ error: "spam_detected", valid: false }, 400, cors);
    }

    if (!name || !email || !message || !captchaToken) {
      return json({ error: "missing_fields", valid: false }, 400, cors);
    }
    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return json({ error: "invalid_email", valid: false }, 400, cors);
    }

    try {
      await rateLimiter(
        supabase,
        userId,
        RATE_LIMIT_PATH,
        ipAddress,
        SUCCESS_RESPONSE_STATUS,
        { maxRequests: RATE_LIMIT_MAX, windowMinutes: RATE_LIMIT_WINDOW_MINUTES },
      );
    } catch (rateError) {
      if (rateError instanceof RateLimitError) {
        const status = rateError.reason === "storage_error" ? 503 : 429;
        return json(
          { error: rateError.reason === "storage_error" ? "rate_limiter_unavailable" : "rate_limit", valid: false },
          status,
          {
            ...cors,
            "Retry-After": String(rateError.retryAfterSeconds),
          },
        );
      }
      throw rateError;
    }

    const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
    const IS_DEV = Deno.env.get("ENVIRONMENT") === "development";

    if (!TURNSTILE_SECRET_KEY) {
      if (!IS_DEV) {
        return json({ error: "captcha_unavailable", valid: false }, 503, cors);
      }
      return json({ valid: true, dev_mode: true }, 200, cors);
    }

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: captchaToken,
      }),
    });

    if (!verifyResponse.ok) {
      return json({ error: "captcha_failed", valid: false }, 400, cors);
    }

    const verifyData = await verifyResponse.json();
    if (!verifyData?.success) {
      return json({ error: "captcha_invalid", valid: false }, 400, cors);
    }

    // Safe structured logging only (no message content).
    console.info("submit-contact-message: accepted", {
      hasName: Boolean(name),
      hasEmail: Boolean(email),
      messageLength: message.length,
      userId: userId ?? "anonymous",
      ipAddress: maskIp(ipAddress),
    });

    return json({ valid: true }, 200, cors);
  } catch (error) {
    console.error("submit-contact-message: failed", error);
    return json({ error: "internal_error", valid: false }, 500, cors);
  }
});
