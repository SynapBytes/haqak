import twilio from "twilio";
import {
  consumeRateLimit,
  corsHeaders,
  getClientIp,
  isOriginAllowed,
  normalizeE164,
  sendJson,
} from "./_shared";

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type Res = {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
};

const WINDOW_MS = 60_000;
const IP_LIMIT_PER_WINDOW = 20;
const PHONE_LIMIT_PER_WINDOW = 3;

function applyCors(req: Req, res: Res): string | undefined {
  const origin = req.headers.origin;
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  return origin;
}

function requireEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const origin = applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!isOriginAllowed(origin)) {
    sendJson(res, 403, { error: "Origin not allowed" });
    return;
  }

  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const verifyServiceSid = requireEnv("TWILIO_VERIFY_SERVICE_SID");

  if (!accountSid || !authToken || !verifyServiceSid) {
    sendJson(res, 500, { error: "Server misconfiguration" });
    return;
  }

  const body = (req.body ?? {}) as { phone?: unknown };
  const phone = typeof body.phone === "string" ? normalizeE164(body.phone) : null;

  if (!phone) {
    sendJson(res, 400, { error: "Invalid phone, must be E.164 format" });
    return;
  }

  const ip = getClientIp(req.headers);
  const allowed = consumeRateLimit({
    ip,
    phone,
    ipLimit: IP_LIMIT_PER_WINDOW,
    phoneLimit: PHONE_LIMIT_PER_WINDOW,
    windowMs: WINDOW_MS,
  });

  if (!allowed) {
    res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
    sendJson(res, 429, { error: "Too many requests, please try again later" });
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    const result = await client.verify.v2.services(verifyServiceSid).verifications.create({
      to: phone,
      channel: "sms",
    });

    sendJson(res, 200, {
      success: true,
      sid: result.sid,
      status: result.status,
    });
  } catch (error) {
    console.error("OTP send failed:", error);
    sendJson(res, 502, { error: "Failed to send OTP" });
  }
}
