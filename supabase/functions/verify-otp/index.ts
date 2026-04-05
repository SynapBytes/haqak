import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OTP_CORS_HEADERS, jsonResponse } from "../_shared/cors.ts";
import {
  buildRequestId,
  extractOtpCode,
  getTwilioCode,
  getTwilioMessage,
  getTwilioSecrets,
  hasCallerAuth,
  isApprovedVerification,
  isExpiredVerification,
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

  const code = extractOtpCode(payload);
  if (!code) {
    return structuredError({
      status: 400,
      code: "INVALID_OTP",
      message: "Invalid OTP code format",
    });
  }

  const maskedPhone = maskPhone(phone);

  try {
    const secrets = getTwilioSecrets();

    const twilioResult = await twilioFormRequest({
      url: `https://verify.twilio.com/v2/Services/${secrets.verifyServiceSid}/VerificationCheck`,
      formBody: new URLSearchParams({ To: phone, Code: code }),
      secrets,
      requestId,
      operation: "verify",
      maskedPhone,
    });

    if (!twilioResult.response) {
      const errorCode = twilioResult.timedOut ? "TWILIO_TIMEOUT" : "TWILIO_UNAVAILABLE";
      const status = twilioResult.timedOut ? 504 : 502;
      logError("otp.verify.twilio_unavailable", requestId, { maskedPhone, errorCode });
      return structuredError({
        status,
        code: errorCode,
        message: "Unable to verify OTP at this time. Please try again.",
      });
    }

    if (!twilioResult.response.ok) {
      const twilioCode = getTwilioCode(twilioResult.data);
      const twilioMessage = getTwilioMessage(twilioResult.data);

      if (twilioResult.response.status === 429) {
        return structuredError({
          status: 429,
          code: "OTP_RATE_LIMITED",
          message: twilioMessage ?? "Too many OTP attempts. Please wait and try again.",
          details: { twilio_code: twilioCode },
        });
      }

      if (isExpiredVerification(twilioResult.data)) {
        logWarn("otp.verify.expired", requestId, { maskedPhone, twilioCode });
        return structuredError({
          status: 410,
          code: "OTP_EXPIRED",
          message: "OTP expired. Request a new code.",
          details: { approved: false, verification_status: "expired", twilio_code: twilioCode },
        });
      }

      const status = twilioResult.response.status >= 500 ? 502 : 401;
      const errorCode = twilioResult.response.status >= 500 ? "TWILIO_UNAVAILABLE" : "OTP_REJECTED";
      logWarn("otp.verify.rejected", requestId, {
        maskedPhone,
        twilioStatus: twilioResult.response.status,
        twilioCode,
      });

      return structuredError({
        status,
        code: errorCode,
        message: status === 401
          ? "OTP verification failed"
          : "Unable to verify OTP at this time. Please try again.",
        details: {
          approved: false,
          verification_status: status === 401 ? "rejected" : "unavailable",
          twilio_code: twilioCode,
        },
      });
    }

    if (!isApprovedVerification(twilioResult.data)) {
      if (isExpiredVerification(twilioResult.data)) {
        logWarn("otp.verify.expired_status", requestId, { maskedPhone });
        return structuredError({
          status: 410,
          code: "OTP_EXPIRED",
          message: "OTP expired. Request a new code.",
          details: { approved: false, verification_status: "expired" },
        });
      }

      const verificationStatus = typeof twilioResult.data.status === "string" ? twilioResult.data.status : "rejected";
      logWarn("otp.verify.not_approved", requestId, { maskedPhone, verificationStatus });
      return structuredError({
        status: 401,
        code: "OTP_REJECTED",
        message: "OTP verification failed",
        details: {
          approved: false,
          verification_status: verificationStatus,
        },
      });
    }

    const sid = typeof twilioResult.data.sid === "string" ? twilioResult.data.sid : null;
    const verificationStatus = typeof twilioResult.data.status === "string" ? twilioResult.data.status : "approved";

    logInfo("otp.verify.approved", requestId, { maskedPhone, verificationStatus });

    return jsonResponse({
      approved: true,
      success: true,
      status: verificationStatus,
      sid,
      phone_masked: maskedPhone,
      request_id: requestId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_TWILIO_SECRET") {
      logError("otp.verify.missing_secret", requestId);
      return structuredError({
        status: 500,
        code: "MISSING_SECRET",
        message: "OTP service is not configured",
      });
    }

    logError("otp.verify.internal_error", requestId, {
      errorType: error instanceof Error ? error.name : "unknown",
    });

    return structuredError({ status: 500, code: "INTERNAL_ERROR", message: "Internal server error" });
  }
});
