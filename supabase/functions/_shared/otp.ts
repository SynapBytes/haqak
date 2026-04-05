import { jsonResponse } from "./cors.ts";

const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export type OtpErrorCode =
  | "INVALID_METHOD"
  | "AUTH_REQUIRED"
  | "INVALID_JSON"
  | "INVALID_PHONE"
  | "INVALID_OTP"
  | "MISSING_SECRET"
  | "TWILIO_TIMEOUT"
  | "TWILIO_UNAVAILABLE"
  | "OTP_SEND_FAILED"
  | "OTP_RATE_LIMITED"
  | "OTP_REJECTED"
  | "OTP_EXPIRED"
  | "INTERNAL_ERROR";

export interface StructuredErrorOptions {
  status: number;
  code: OtpErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface TwilioSecrets {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
}

export interface TwilioRequestResult {
  response: Response | null;
  data: Record<string, unknown>;
  timedOut: boolean;
  networkError: boolean;
}

export function buildRequestId(req: Request): string {
  return req.headers.get("x-request-id")?.trim() || crypto.randomUUID();
}

export function hasCallerAuth(req: Request): boolean {
  const auth = req.headers.get("authorization")?.trim();
  const apikey = req.headers.get("apikey")?.trim();
  return Boolean(auth || apikey);
}

export function logInfo(event: string, requestId: string, details: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level: "info", event, requestId, ...details }));
}

export function logWarn(event: string, requestId: string, details: Record<string, unknown> = {}): void {
  console.warn(JSON.stringify({ level: "warn", event, requestId, ...details }));
}

export function logError(event: string, requestId: string, details: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({ level: "error", event, requestId, ...details }));
}

export function structuredError(options: StructuredErrorOptions): Response {
  return jsonResponse(
    {
      ...(options.details ?? {}),
      success: false,
      status: options.status,
      error_code: options.code,
      error: options.message,
      message: options.message,
    },
    options.status,
  );
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizePhone(inputPhone: unknown, inputCountryCode?: unknown): string | null {
  if (typeof inputPhone !== "string") return null;
  const rawPhone = inputPhone.trim();
  if (!rawPhone) return null;

  if (rawPhone.startsWith("+")) {
    const normalized = `+${rawPhone.slice(1).replace(/\D/g, "")}`;
    return E164_REGEX.test(normalized) ? normalized : null;
  }

  const subscriberDigits = rawPhone.replace(/\D/g, "");
  if (!subscriberDigits) return null;

  if (typeof inputCountryCode !== "string") return null;
  const countryDigits = inputCountryCode.trim().replace(/\D/g, "");
  if (!countryDigits) return null;

  const normalized = `+${countryDigits}${subscriberDigits}`;
  return E164_REGEX.test(normalized) ? normalized : null;
}

export function extractOtpCode(payload: Record<string, unknown>): string | null {
  const candidate = typeof payload.code === "string"
    ? payload.code
    : typeof payload.otp === "string"
    ? payload.otp
    : null;

  if (!candidate) return null;
  const normalized = candidate.trim();
  return OTP_CODE_REGEX.test(normalized) ? normalized : null;
}

export function maskPhone(phone: string): string {
  const normalized = phone.trim();
  if (!normalized) return "***";

  const sign = normalized.startsWith("+") ? "+" : "";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length <= 4) return `${sign}${"*".repeat(Math.max(digits.length, 3))}`;

  const prefixLen = Math.min(2, digits.length - 2);
  const suffixLen = 2;
  const middleLen = Math.max(0, digits.length - prefixLen - suffixLen);

  return `${sign}${digits.slice(0, prefixLen)}${"*".repeat(middleLen)}${digits.slice(-suffixLen)}`;
}

export function getTwilioSecrets(): TwilioSecrets {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
  const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")?.trim();

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error("MISSING_TWILIO_SECRET");
  }

  return { accountSid, authToken, verifyServiceSid };
}

function getRetryConfig() {
  const rawMaxRetries = Number.parseInt(Deno.env.get("OTP_TWILIO_MAX_RETRIES") ?? "1", 10);
  const maxRetries = Number.isFinite(rawMaxRetries) ? Math.min(Math.max(rawMaxRetries, 0), 3) : 1;

  const rawTimeoutMilliseconds = Number.parseInt(Deno.env.get("OTP_TWILIO_TIMEOUT_MS") ?? "8000", 10);
  const timeoutMs = Number.isFinite(rawTimeoutMilliseconds)
    ? Math.min(Math.max(rawTimeoutMilliseconds, 1000), 20000)
    : 8000;

  return { maxRetries, timeoutMs };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseTwilioJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Execute a Twilio Verify form-encoded POST with bounded retries.
 *
 * Retries occur on network/timeout failures and HTTP 429/5xx statuses until
 * OTP_TWILIO_MAX_RETRIES is exhausted; OTP_TWILIO_TIMEOUT_MS applies per
 * attempt. Returns parsed JSON when available plus terminal timeout/network
 * indicators in TwilioRequestResult.
 */
export async function twilioFormRequest(options: {
  url: string;
  formBody: URLSearchParams;
  secrets: TwilioSecrets;
  requestId: string;
  operation: "send" | "verify";
  maskedPhone: string;
}): Promise<TwilioRequestResult> {
  const { maxRetries, timeoutMs } = getRetryConfig();
  const basicAuth = btoa(`${options.secrets.accountSid}:${options.secrets.authToken}`);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(options.url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: options.formBody.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await parseTwilioJson(response);

      if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) {
        logWarn("otp.twilio_retry", options.requestId, {
          operation: options.operation,
          maskedPhone: options.maskedPhone,
          status: response.status,
          attempt: attempt + 1,
        });
        await delay(250 * (attempt + 1));
        continue;
      }

      return { response, data, timedOut: false, networkError: false };
    } catch (error) {
      clearTimeout(timeout);
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      const shouldRetry = attempt < maxRetries;

      if (shouldRetry) {
        logWarn("otp.twilio_request_retry", options.requestId, {
          operation: options.operation,
          maskedPhone: options.maskedPhone,
          timedOut,
          attempt: attempt + 1,
        });
        await delay(250 * (attempt + 1));
        continue;
      }

      return { response: null, data: {}, timedOut, networkError: !timedOut };
    }
  }

  return { response: null, data: {}, timedOut: false, networkError: true };
}

export function getTwilioMessage(data: Record<string, unknown>): string | null {
  return typeof data.message === "string" && data.message.trim() ? data.message.trim() : null;
}

export function getTwilioCode(data: Record<string, unknown>): number | null {
  return typeof data.code === "number" ? data.code : null;
}

export function isExpiredVerification(data: Record<string, unknown>): boolean {
  const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
  const message = getTwilioMessage(data)?.toLowerCase() ?? "";
  return status === "expired" || message.includes("expired");
}

export function isApprovedVerification(data: Record<string, unknown>): boolean {
  const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
  return status === "approved" || data.valid === true;
}
