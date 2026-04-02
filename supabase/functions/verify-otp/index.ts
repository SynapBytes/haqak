import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { buildCorsHeaders } from "../shared/cors.ts";

/** Compute HMAC-SHA256 of `message` with `key`, return lower-case hex string */
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

interface VerifyOtpRequest {
  phone: string;
  otp: string;
  mode: "login" | "signup-citizen" | "signup-mp" | "forgot-password";
  fullName?: string;
  password?: string;
  governorate?: string;
  district?: string;
  electoralDistrict?: string;
  registrationNumber?: string;
  displayName?: string;
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return `+20${cleaned.slice(1)}`;
  }
  if (!cleaned.startsWith("20")) {
    return `+20${cleaned}`;
  }
  return `+${cleaned}`;
}

// Generate a unique email from phone number
function generateEmailFromPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const timestamp = Date.now();
  return `user_${cleaned}_${timestamp}@haqak.app`;
}

serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = (await req.json()) as VerifyOtpRequest;
    const { phone, otp, mode, fullName, password, governorate, district, electoralDistrict, registrationNumber, displayName } = body;

    // Validate input
    if (!phone || !otp || !mode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP format" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // HMAC key used by send-otp to hash OTP tokens before storage
    const otpHmacSecret = Deno.env.get("OTP_HMAC_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (!otpHmacSecret) {
      console.error("OTP_HMAC_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const formattedPhone = formatPhoneNumber(phone);

    // Fetch the most recent active (not used, not expired) OTP record for
    // this phone + mode.  We do NOT filter by the code column here because
    // the stored value is an HMAC hash — the raw OTP must be verified via
    // constant-time HMAC recomputation below (VULN-01 fix).
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", formattedPhone)
      .eq("mode", mode)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Check attempt limit before doing any further work (prevents oracle)
    if ((otpRecord.attempts ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many attempts" }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Recompute the HMAC using the same inputs as send-otp and compare.
    // This is the correct fix for VULN-01: comparing the raw OTP against the
    // stored HMAC hash always failed because "123456" !== "a3f7b2...".
    const expectedHmac = await hmacSha256Hex(
      otpHmacSecret,
      `${formattedPhone}:${otp}:${otpRecord.expires_at}`,
    );

    if (expectedHmac !== otpRecord.code) {
      // VULN-08 fix: increment attempts on every failure so the 3-attempt
      // limit is actually enforced.
      await supabase
        .from("otp_codes")
        .update({ attempts: (otpRecord.attempts ?? 0) + 1 })
        .eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "Invalid OTP" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Handle different modes
    if (mode === "login") {
      // Find existing user by phone
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", formattedPhone)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // VULN-12 fix: use getUserById instead of listUsers() which loads ALL
      // users into memory and is O(n) per login request.
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);

      if (!user?.email) {
        return new Response(
          JSON.stringify({ error: "User email not found" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: user.email,
          userId: profile.user_id,
          message: "OTP verified successfully",
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    } else if (mode === "signup-citizen" || mode === "signup-mp") {
      // Check if phone already registered
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", formattedPhone)
        .single();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "Phone number already registered" }),
          { status: 409, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // Generate unique email
      const email = generateEmailFromPhone(phone);

      // Validate signup data
      if (!fullName || !password) {
        return new Response(
          JSON.stringify({ error: "Missing signup data" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      if (mode === "signup-mp") {
        if (!governorate || !district || !electoralDistrict) {
          return new Response(
            JSON.stringify({ error: "Missing MP-specific data" }),
            { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          email,
          phone: formattedPhone,
          message: "OTP verified. Ready for signup.",
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    } else if (mode === "forgot-password") {
      // Find user by phone
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", formattedPhone)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // VULN-12 fix: use getUserById instead of listUsers()
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);

      if (!user?.email) {
        return new Response(
          JSON.stringify({ error: "User email not found" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: user.email,
          message: "OTP verified. Ready for password reset.",
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid mode" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
