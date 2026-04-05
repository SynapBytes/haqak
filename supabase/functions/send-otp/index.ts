import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OTP_CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import {
  buildRequestId,
  getTwilioCode,
  getTwilioMessage,
  getTwilioSecrets,
  hasCallerAuth,
  logError,
  logInfo,
  logWarn,
  maskPhone,
  normalizePhone,
  readJsonBody,
  structuredError,
  twilioFormRequest,
} from "../_shared/otp.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: OTP_CORS_HEADERS });
  }

  const requestId = buildRequestId(req);

  if (req.method !== "POST") {
    return structuredError({ status: 405, code: "INVALID_METHOD", message: "Method not allowed" });
  }

  if (!hasCallerAuth(req)) {
    return structuredError({
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Authorization required. Provide Supabase anon apikey or Bearer token.",
    });
  }

  const payload = await readJsonBody(req);
  if (!payload) {
    return structuredError({
      status: 400,
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    });
  }

  const phone = normalizePhone(payload.phone, payload.countryCode);
  if (!phone) {
    return structuredError({
      status: 400,
      code: "INVALID_PHONE",
      message: "Invalid phone. Provide E.164 format or include countryCode.",
    });
  }

  const maskedPhone = maskPhone(phone);

  try {
    const secrets = getTwilioSecrets();

    const twilioResult = await twilioFormRequest({
      url: `https://verify.twilio.com/v2/Services/${secrets.verifyServiceSid}/Verifications`,
      formBody: new URLSearchParams({ To: phone, Channel: "sms" }),
      secrets,
      requestId,
      operation: "send",
      maskedPhone,
    });

    if (!twilioResult.response) {
      const errorCode = twilioResult.timedOut ? "TWILIO_TIMEOUT" : "TWILIO_UNAVAILABLE";
      const status = twilioResult.timedOut ? 504 : 502;
      logError("otp.send.twilio_unavailable", requestId, { maskedPhone, errorCode });
      return structuredError({
        status,
        code: errorCode,
        message: "Unable to send OTP at this time. Please try again.",
      });
    }

    if (!twilioResult.response.ok) {
      const twilioCode = getTwilioCode(twilioResult.data);
      const twilioMessage = getTwilioMessage(twilioResult.data);
      const status = twilioResult.response.status === 429
        ? 429
        : twilioResult.response.status >= 500
        ? 502
        : 400;
      const errorCode = twilioResult.response.status === 429 ? "OTP_RATE_LIMITED" : "OTP_SEND_FAILED";

      logWarn("otp.send.twilio_rejected", requestId, {
        maskedPhone,
        twilioStatus: twilioResult.response.status,
        twilioCode,
      });

      return structuredError({
        status,
        code: errorCode,
        message: twilioMessage ?? "Failed to send OTP",
        details: { twilio_code: twilioCode },
      });
    }

    const sid = typeof twilioResult.data.sid === "string" ? twilioResult.data.sid : null;
    const status = typeof twilioResult.data.status === "string" ? twilioResult.data.status : "pending";

    logInfo("otp.send.success", requestId, { maskedPhone, status });

    return jsonResponse({
      success: true,
      status: "sent",
      twilio_status: status,
      sid,
      channel: "sms",
      phone_masked: maskedPhone,
      request_id: requestId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_TWILIO_SECRET") {
      logError("otp.send.missing_secret", requestId);
      return structuredError({
        status: 500,
        code: "MISSING_SECRET",
        message: "OTP service is not configured",
      });
    }

    logError("otp.send.internal_error", requestId, {
      errorType: error instanceof Error ? error.name : "unknown",
    });

    return structuredError({ status: 500, code: "INTERNAL_ERROR", message: "Internal server error" });
  }
});
