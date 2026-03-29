import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  return `user_${cleaned}_${timestamp}@haqak.local`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as VerifyOtpRequest;
    const { phone, otp, mode, fullName, password, governorate, district, electoralDistrict, registrationNumber, displayName } = body;

    // Validate input
    if (!phone || !otp || !mode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const formattedPhone = formatPhoneNumber(phone);

    // Verify OTP from database
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", formattedPhone)
      .eq("code", otp)
      .eq("mode", mode)
      .single();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if OTP is expired
    const expiresAt = new Date(otpRecord.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: "OTP expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempt limit
    if (otpRecord.attempts >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many attempts" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user email from auth
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users.find((u) => u.id === profile.user_id);

      if (!user?.email) {
        return new Response(
          JSON.stringify({ error: "User email not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: user.email,
          userId: profile.user_id,
          message: "OTP verified successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate unique email
      const email = generateEmailFromPhone(phone);

      // Validate signup data
      if (!fullName || !password) {
        return new Response(
          JSON.stringify({ error: "Missing signup data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (mode === "signup-mp") {
        if (!governorate || !district || !electoralDistrict) {
          return new Response(
            JSON.stringify({ error: "Missing MP-specific data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user email
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users.find((u) => u.id === profile.user_id);

      if (!user?.email) {
        return new Response(
          JSON.stringify({ error: "User email not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: user.email,
          message: "OTP verified. Ready for password reset.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid mode" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
