import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  phone: string;
  mode: "login" | "signup-citizen" | "signup-mp" | "forgot-password";
}

interface TwilioResponse {
  sid?: string;
  status?: string;
  error_code?: string;
  message?: string;
}

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  
  // If it starts with 0, replace with 20 (Egypt country code)
  if (cleaned.startsWith("0")) {
    return `+20${cleaned.slice(1)}`;
  }
  
  // If it doesn't start with 20, assume it's Egyptian
  if (!cleaned.startsWith("20")) {
    return `+20${cleaned}`;
  }
  
  return `+${cleaned}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, mode } = (await req.json()) as SendOtpRequest;

    // Validate input
    if (!phone || !mode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone and mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format (Egyptian)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid Egyptian phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("Missing Twilio configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const formattedPhone = formatPhoneNumber(phone);

    // Send SMS via Twilio
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
        Body: `رمز التحقق الخاص بك في حقك: ${otp}\nلا تشارك هذا الرمز مع أحد\nصلاحية الرمز 5 دقائق`,
      }).toString(),
    });

    const twilioData = (await twilioResponse.json()) as TwilioResponse;

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      return new Response(
        JSON.stringify({ error: "Failed to send OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store OTP in Supabase with expiration
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Store OTP with 5-minute expiration
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      
      const { error: dbError } = await supabase
        .from("otp_codes")
        .insert({
          phone: formattedPhone,
          code: otp,
          mode,
          expires_at: expiresAt,
          attempts: 0,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Database error:", dbError);
        // Don't fail the request if DB storage fails, SMS was sent successfully
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        sid: twilioData.sid,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
