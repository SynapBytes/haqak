import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OTP_CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";

interface SendOtpRequest {
  phone: string;
}

interface TwilioVerificationResponse {
  sid?: string;
  status?: string;
  message?: string;
  code?: number;
}

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

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
    const { phone } = (await req.json()) as SendOtpRequest;

    if (!phone || !E164_REGEX.test(phone)) {
      return jsonResponse({ error: "Invalid phone. Use E.164 format, e.g. +201012345678" }, 400);
    }

    const accountSid = getRequiredSecret("TWILIO_ACCOUNT_SID");
    const authToken = getRequiredSecret("TWILIO_AUTH_TOKEN");
    const verifyServiceSid = getRequiredSecret("TWILIO_VERIFY_SERVICE_SID");

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "sms",
        }).toString(),
      },
    );

    const data = (await response.json().catch((parseError) => {
      console.error("Failed to parse Twilio Verify send response JSON:", parseError);
      return {};
    })) as TwilioVerificationResponse;

    if (!response.ok) {
      const status = response.status >= 400 && response.status < 500 ? response.status : 502;
      return jsonResponse(
        {
          error: data.message ?? "Twilio Verify send failed",
          twilio_code: data.code ?? null,
        },
        status,
      );
    }

    return jsonResponse(
      {
        success: true,
        sid: data.sid ?? null,
        status: data.status ?? "pending",
        channel: "sms",
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
