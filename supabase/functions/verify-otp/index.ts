import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { buildCorsHeaders } from "../shared/cors.ts";

/**
 * Verify an HMAC-SHA256 signature using the Web Crypto API.
 * crypto.subtle.verify performs a constant-time comparison internally,
 * protecting against timing attacks.
 */
async function verifyHmac(key: string, message: string, expectedHex: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    // Convert the stored hex string back to bytes for comparison
    const expectedBytes = new Uint8Array(
      (expectedHex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)),
    );
    return await crypto.subtle.verify("HMAC", cryptoKey, expectedBytes, enc.encode(message));
  } catch {
    return false;
  }
}

// Max failed verify attempts before locking — must match send-otp configuration
const OTP_MAX_VERIFY_ATTEMPTS = 5;

interface VerifyOtpRequest {
  phone: string;
  otp: string;
  mode: "login" | "signup-citizen" | "signup-mp" | "forgot-password";
  fullName?: string;
  password?: string;
  newPassword?: string;
  governorate?: string;
  district?: string;
  electoralDistrict?: string;
  registrationNumber?: string;
  displayName?: string;
  nationalId?: string;
  /** E.164 dial prefix (e.g. "+966") for the selected country.
   * Must match the value sent during send-otp so the phone is formatted identically. */
  countryCode?: string;
}

/** Format a raw phone string to E.164.
 * Mirrors the implementation in send-otp so both functions produce identical output.
 * @param phone      Raw phone input from the user.
 * @param countryCode  Optional E.164 dial prefix (e.g. "+966").  When omitted,
 *                   falls back to the TWILIO_DEFAULT_COUNTRY_CODE env var, then "+20".
 */
function formatPhoneNumber(phone: string, countryCode?: string): string {
  const cc = countryCode ?? Deno.env.get("TWILIO_DEFAULT_COUNTRY_CODE") ?? "+20";
  const numeric = cc.replace(/\D/g, "");
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return `+${numeric}${cleaned.slice(1)}`;
  if (!cleaned.startsWith(numeric)) return `+${numeric}${cleaned}`;
  return `+${cleaned}`;
}

// Generate a unique email from phone number
function generateEmailFromPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const timestamp = Date.now();
  return `user_${cleaned}_${timestamp}@haqak.app`;
}

/**
 * Retrieves the Supabase service-role key, with optional Supabase Vault fallback.
 *
 * Resolution order:
 *  1. SUPABASE_SERVICE_ROLE_KEY environment variable (auto-injected by Supabase runtime,
 *     or manually set via: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>`)
 *  2. Supabase Vault (see docs/DEPLOYMENT.md) — uncomment the block below to enable.
 *
 * The service-role key is never logged.  A boolean flag is logged on failure only.
 */
async function getServiceRoleKey(): Promise<string | null> {
  // Primary path: environment variable injected by Supabase Edge Functions runtime.
  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (envKey) return envKey;

  // Optional Vault fallback — enable when using Supabase Vault for secret rotation.
  // See docs/DEPLOYMENT.md for prerequisites and setup instructions.
  //
  // try {
  //   const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  //   const supabaseUrl = Deno.env.get("SUPABASE_URL");
  //   if (anonKey && supabaseUrl) {
  //     const vaultClient = createClient(supabaseUrl, anonKey);
  //     const { data, error } = await vaultClient
  //       .from("vault.decrypted_secrets")
  //       .select("decrypted_secret")
  //       .eq("name", "SERVICE_ROLE_KEY")
  //       .maybeSingle();
  //     if (!error && data?.decrypted_secret) return data.decrypted_secret;
  //   }
  // } catch {
  //   console.error("Vault lookup failed — falling back gracefully");
  // }

  console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return null;
}

serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = (await req.json()) as VerifyOtpRequest;
    const { phone, otp, mode, fullName, password, newPassword, governorate, district, electoralDistrict, registrationNumber, displayName, nationalId, countryCode } = body;

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
    // SECURITY: resolved via getServiceRoleKey() which supports optional Supabase
    // Vault fallback.  See docs/DEPLOYMENT.md for the full setup guide.
    const supabaseServiceKey = await getServiceRoleKey();
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
    const formattedPhone = formatPhoneNumber(phone, countryCode);

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
    if ((otpRecord.attempts ?? 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Too many attempts" }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Verify HMAC using constant-time comparison via crypto.subtle.verify
    // (prevents theoretical timing attacks on the HMAC comparison).
    const hmacValid = await verifyHmac(
      otpHmacSecret,
      `${formattedPhone}:${otp}:${otpRecord.expires_at}`,
      otpRecord.code,
    );

    if (!hmacValid) {
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

      // Generate unique email (internal identifier — never shown to user)
      const email = generateEmailFromPhone(phone);

      // Create the Supabase Auth user via admin API.
      // email_confirm: true and phone_confirm: true bypass any confirmation
      // requirements so the user can sign in immediately after registration.
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: formattedPhone,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: formattedPhone,
          role: mode === "signup-mp" ? "mp" : "citizen",
          governorate: governorate ?? null,
          district: district ?? null,
          electoral_district: electoralDistrict ?? null,
          membership_number: registrationNumber ?? null,
          registration_number: registrationNumber ?? null,
          display_name: displayName ?? null,
          national_id: nationalId ?? null,
          center: district ?? null,
        },
      });

      if (createError || !authData?.user) {
        console.error("Admin createUser failed:", createError?.message);
        return new Response(
          JSON.stringify({ error: "Failed to create account" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          email,
          userId: authData.user.id,
          phone: formattedPhone,
          message: "Account created successfully.",
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

      // Validate new password
      if (!newPassword || newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: "New password is required and must be at least 8 characters" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // Update the user's password directly via admin API — no email link required
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        profile.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update failed:", updateError.message);
        return new Response(
          JSON.stringify({ error: "Failed to update password" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Password updated successfully.",
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
