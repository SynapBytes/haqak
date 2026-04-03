import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { buildCorsHeaders } from "../shared/cors.ts";

// Limits for OTP/auth sensitive paths
const OTP_RATE_LIMIT_PER_PHONE = 5;   // max sends per phone per window
const OTP_RATE_LIMIT_PER_IP = 10;     // max sends per IP per window
const OTP_WINDOW_MINUTES = 10;
const OTP_MAX_VERIFY_ATTEMPTS = 5;    // max failed verify attempts before lock
const OTP_LOCK_MINUTES = 15;          // lock duration after too many failures
const OTP_TTL_MINUTES = 5;            // OTP validity window

interface SendOtpRequest {
  phone: string;
  mode: "login" | "signup-citizen" | "signup-mp" | "forgot-password";
  turnstileToken?: string;
}

interface TwilioResponse {
  sid?: string;
  status?: string;
  error_code?: string;
  message?: string;
}

function isDevelopmentEnvironment(): boolean {
  const env = (Deno.env.get("ENVIRONMENT") ?? Deno.env.get("NODE_ENV") ?? "").toLowerCase();
  return env === "development" || env === "dev" || env === "local";
}

/** Generate a cryptographically secure 6-digit OTP */
function generateOTP(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

/** Compute HMAC-SHA256 of `message` with `key`, return hex string */
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

/** Format a raw phone string to E.164, using TWILIO_DEFAULT_COUNTRY_CODE env (default +20) */
function formatPhoneNumber(phone: string): string {
  const countryCode = Deno.env.get("TWILIO_DEFAULT_COUNTRY_CODE") ?? "+20";
  const numeric = countryCode.replace(/\D/g, "");
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return `+${numeric}${cleaned.slice(1)}`;
  if (!cleaned.startsWith(numeric)) return `+${numeric}${cleaned}`;
  return `+${cleaned}`;
}

/** Verify a Cloudflare Turnstile token. */
async function verifyTurnstile(secret: string, token: string | undefined, ip: string): Promise<boolean> {
  if (!token) return false;
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    form.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // Extract client IP from standard Cloudflare/Vercel headers
    const clientIp =
      req.headers.get("CF-Connecting-IP") ??
      req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
      "0.0.0.0";

    const { phone, mode, turnstileToken } = (await req.json()) as SendOtpRequest;

    // Validate required fields
    if (!phone || !mode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone and mode" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Validate phone number — configurable via env, defaults to Egyptian format.
    // VULN-09 fix: guard against ReDoS by validating the pattern before use.
    const DEFAULT_PHONE_REGEX = "^01[0125][0-9]{8}$";
    const phoneRegexSrc = Deno.env.get("PHONE_REGEX") ?? DEFAULT_PHONE_REGEX;
    let phoneRegex: RegExp;
    try {
      phoneRegex = new RegExp(phoneRegexSrc);
      // Reject patterns that are suspiciously long or contain nested quantifiers
      // which are the primary source of catastrophic ReDoS backtracking.
      if (phoneRegexSrc.length > 200 || /(\+|\*|\?)\s*(\+|\*|\?)/.test(phoneRegexSrc) || /\([^)]*(\+|\*|\?)\)\s*(\+|\*|\?)/.test(phoneRegexSrc)) {
        throw new Error("Unsafe regex pattern");
      }
    } catch {
      console.error("Invalid or unsafe PHONE_REGEX env var, falling back to default");
      phoneRegex = new RegExp(DEFAULT_PHONE_REGEX);
    }
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret && !isDevelopmentEnvironment()) {
      return new Response(
        JSON.stringify({ error: "CAPTCHA verification failed" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Verify Turnstile CAPTCHA (mandatory outside development when configured)
    const turnstileOk = turnstileSecret
      ? await verifyTurnstile(turnstileSecret, turnstileToken, clientIp)
      : isDevelopmentEnvironment();
    if (!turnstileOk) {
      return new Response(
        JSON.stringify({ error: "CAPTCHA verification failed" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Load required env vars
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // TODO[Vault]: move SUPABASE_SERVICE_ROLE_KEY to Supabase Vault / secrets manager
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // HMAC key for signing OTP tokens — must be set in production
    const otpHmacSecret = Deno.env.get("OTP_HMAC_SECRET");
    if (!otpHmacSecret) {
      // OTP_HMAC_SECRET is required in production; refuse to proceed without it
      // to avoid storing OTP tokens that offer no HMAC protection.
      console.error("OTP_HMAC_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const formattedPhone = formatPhoneNumber(phone);
    const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000).toISOString();

    // ── Per-phone rate limit ──────────────────────────────────────────────────
    const { count: phoneCount } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", formattedPhone)
      .gte("created_at", windowStart);

    if ((phoneCount ?? 0) >= OTP_RATE_LIMIT_PER_PHONE) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests for this phone. Please try again later." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(OTP_WINDOW_MINUTES * 60) } },
      );
    }

    // ── Per-IP rate limit ─────────────────────────────────────────────────────
    const { count: ipCount } = await supabase
      .from("rate_limit_logs")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .eq("request_path", "/send-otp")
      .gte("request_timestamp", windowStart);

    if ((ipCount ?? 0) >= OTP_RATE_LIMIT_PER_IP) {
      return new Response(
        JSON.stringify({ error: "Too many requests from your network. Please try again later." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(OTP_WINDOW_MINUTES * 60) } },
      );
    }

    // ── Check for a locked phone (too many failed verification attempts) ──────
    const lockWindow = new Date(Date.now() - OTP_LOCK_MINUTES * 60 * 1000).toISOString();
    const { data: lockedRows } = await supabase
      .from("otp_codes")
      .select("attempts")
      .eq("phone", formattedPhone)
      .gte("created_at", lockWindow)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lockedRows && lockedRows.length > 0 && lockedRows[0].attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Account temporarily locked due to too many failed attempts. Please try again later." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(OTP_LOCK_MINUTES * 60) } },
      );
    }

    // ── Generate OTP and compute HMAC token (raw OTP is never stored) ─────────
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    // The stored token is HMAC(secret, phone + ":" + otp + ":" + expiresAt)
    const tokenInput = `${formattedPhone}:${otp}:${expiresAt}`;
    const hashedToken = await hmacSha256Hex(otpHmacSecret, tokenInput);

    // ── Send SMS via Twilio ───────────────────────────────────────────────────
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: twilioPhoneNumber,
        To: formattedPhone,
        Body: `رمز التحقق الخاص بك في حقك: ${otp}\nلا تشارك هذا الرمز مع أحد\nصلاحية الرمز ${OTP_TTL_MINUTES} دقائق`,
      }).toString(),
    });

    const twilioData = (await twilioResponse.json()) as TwilioResponse;

    if (!twilioResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send OTP" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── Persist HMAC token (not raw OTP) with expiry and zero attempts ────────
    const { error: dbError } = await supabase
      .from("otp_codes")
      .insert({
        phone: formattedPhone,
        code: hashedToken, // HMAC token, not raw OTP
        mode,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      // Log only the error code, not any sensitive data
      console.error("OTP DB insert failed:", dbError.code);
    }

    // ── Log IP-based request for rate limiting ────────────────────────────────
    await supabase.from("rate_limit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // anonymous placeholder
      request_path: "/send-otp",
      response_status: 200,
      ip_address: clientIp,
    });

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
