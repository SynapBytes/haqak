import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OTP_CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";

interface VerifyOtpRequest {
  phone: string;
  code: string;
}

interface TwilioVerifyCheckResponse {
  sid?: string;
  status?: string;
  valid?: boolean;
  message?: string;
  code?: number;
}

const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;

function getRequiredSecret(name: "TWILIO_ACCOUNT_SID" | "TWILIO_AUTH_TOKEN" | "TWILIO_VERIFY_SERVICE_SID"): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: OTP_CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { phone, code } = (await req.json()) as VerifyOtpRequest;

    if (!phone || !E164_REGEX.test(phone)) {
      return jsonResponse({ error: "Invalid phone. Use E.164 format, e.g. +201012345678" }, 400);
    }

    if (!code || !OTP_CODE_REGEX.test(code)) {
      return jsonResponse({ error: "Invalid code format" }, 400);
    }

    const accountSid = getRequiredSecret("TWILIO_ACCOUNT_SID");
    const authToken = getRequiredSecret("TWILIO_AUTH_TOKEN");
    const verifyServiceSid = getRequiredSecret("TWILIO_VERIFY_SERVICE_SID");

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Code: code,
        }).toString(),
      },
    );

    const data = (await response.json().catch((parseError) => {
      console.error("Failed to parse Twilio Verify check response JSON:", parseError);
      return {};
    })) as TwilioVerifyCheckResponse;

    if (!response.ok) {
      const status = response.status >= 400 && response.status < 500 ? response.status : 502;
      return jsonResponse(
        {
          error: data.message ?? "Twilio Verify check failed",
          twilio_code: data.code ?? null,
        },
        status,
      );
    }

    const approved = data.status === "approved" || data.valid === true;

    if (!approved) {
      return jsonResponse(
        {
          approved: false,
          status: data.status ?? "denied",
          message: "OTP verification failed",
        },
        401,
      );
    }

    return jsonResponse(
      {
        approved: true,
        status: data.status ?? "approved",
        sid: data.sid ?? null,
      },
      200,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required secret:")) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
