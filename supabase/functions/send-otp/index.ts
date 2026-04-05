import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OTP_CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";

interface SendOtpRequest {
  phone: string;
  dryRun?: boolean;
}

interface TwilioVerificationResponse {
  sid?: string;
  status?: string;
  message?: string;
  code?: number;
}

const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const VERIFY_SERVICE_SID_REGEX = /^VA[0-9a-fA-F]{32}$/;
const REQUIRED_ENV_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
] as const;

function normalizePhone(input: string): string {
  const trimmed = input.trim().replace(/[\s\-().]/g, "");
  if (trimmed.startsWith("00")) {
    return `+${trimmed.slice(2)}`;
  }
  return trimmed;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  const suffix = phone.slice(-3);
  return `${phone.slice(0, 2)}***${suffix}`;
}

function getRequestId(req: Request): string | null {
  return req.headers.get("x-request-id")
    ?? req.headers.get("x-correlation-id")
    ?? req.headers.get("x-supabase-request-id")
    ?? null;
}

function getMissingRequiredEnvKeys(): string[] {
  return REQUIRED_ENV_KEYS.filter((key) => !Deno.env.get(key)?.trim());
}

function isDebugOtpEnabled(): boolean {
  const value = Deno.env.get("DEBUG_OTP")?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function getEnvConfig() {
  return {
    accountSid: Deno.env.get("TWILIO_ACCOUNT_SID")?.trim() ?? "",
    authToken: Deno.env.get("TWILIO_AUTH_TOKEN")?.trim() ?? "",
    verifyServiceSid: Deno.env.get("TWILIO_VERIFY_SERVICE_SID")?.trim() ?? "",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: OTP_CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = (await req.json()) as SendOtpRequest;
    const normalizedPhone = typeof payload.phone === "string" ? normalizePhone(payload.phone) : "";
    const dryRun = payload.dryRun === true;
    const requestId = getRequestId(req);

    if (!normalizedPhone || !E164_REGEX.test(normalizedPhone)) {
      return jsonResponse({ error: "Invalid phone. Use E.164 format, e.g. +201012345678" }, 400);
    }

    const missingEnv = getMissingRequiredEnvKeys();
    if (missingEnv.length > 0) {
      console.error("send-otp missing env vars", {
        missing_env: missingEnv,
        phone_masked: maskPhone(normalizedPhone),
        request_id: requestId,
      });
      return jsonResponse(
        {
          error: "Missing required environment variables",
          missing_env: missingEnv,
        },
        500,
      );
    }

    const { accountSid, authToken, verifyServiceSid } = getEnvConfig();
    const verifyServiceSidFormatOk = VERIFY_SERVICE_SID_REGEX.test(verifyServiceSid);
    const debugEnabled = isDebugOtpEnabled();
    const debugFields = debugEnabled
      ? {
        twilio_request_sent: false,
        verify_service_sid_suffix: verifyServiceSid.slice(-6),
        twilio_status: null as string | null,
        twilio_error_code: null as number | null,
      }
      : {};

    if (dryRun) {
      const readiness = verifyServiceSidFormatOk;
      console.log("send-otp dryRun readiness", {
        phone_masked: maskPhone(normalizedPhone),
        request_id: requestId,
        readiness,
        verify_service_sid_format_ok: verifyServiceSidFormatOk,
      });
      return jsonResponse(
        {
          success: true,
          dryRun: true,
          readiness,
          env_present: true,
          verify_service_sid_format_ok: verifyServiceSidFormatOk,
          ...debugFields,
        },
        200,
      );
    }

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          Channel: "sms",
        }).toString(),
      },
    );

    const data = (await response.json().catch((parseError) => {
      console.error("Failed to parse Twilio Verify send response JSON:", parseError);
      return {};
    })) as TwilioVerificationResponse;

    const twilioStatus = data.status ?? null;
    const twilioErrorCode = data.code ?? null;
    const twilioMessage = data.message ?? null;

    console.log("send-otp Twilio Verify response", {
      phone_masked: maskPhone(normalizedPhone),
      request_id: requestId,
      http_status: response.status,
      twilio_status: twilioStatus,
      twilio_error_code: twilioErrorCode,
      twilio_message: twilioMessage,
    });

    if (!response.ok) {
      return jsonResponse(
        {
          error: "Twilio Verify send failed",
          twilio: {
            status: twilioStatus,
            code: twilioErrorCode,
            message: twilioMessage,
          },
          ...(debugEnabled
            ? {
              twilio_request_sent: true,
              verify_service_sid_suffix: verifyServiceSid.slice(-6),
              twilio_status: twilioStatus,
              twilio_error_code: twilioErrorCode,
            }
            : {}),
        },
        502,
      );
    }

    if (!data.sid || !twilioStatus) {
      return jsonResponse(
        {
          error: "Twilio Verify send failed",
          twilio: {
            status: twilioStatus,
            code: twilioErrorCode,
            message: twilioMessage,
          },
          ...(debugEnabled
            ? {
              twilio_request_sent: true,
              verify_service_sid_suffix: verifyServiceSid.slice(-6),
              twilio_status: twilioStatus,
              twilio_error_code: twilioErrorCode,
            }
            : {}),
        },
        502,
      );
    }

    return jsonResponse(
      {
        success: true,
        sid: data.sid ?? null,
        status: twilioStatus,
        channel: "sms",
        ...(debugEnabled
          ? {
            twilio_request_sent: true,
            verify_service_sid_suffix: verifyServiceSid.slice(-6),
            twilio_status: twilioStatus,
            twilio_error_code: twilioErrorCode,
          }
          : {}),
      },
      200,
    );
  } catch (error) {
    console.error("send-otp unexpected error", { error });
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
