import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

type DeliveryState = "sent" | "delayed";

type RequestPayload = {
  submission_id?: unknown;
  contribution_id?: unknown;
  name?: unknown;
  email?: unknown;
  message?: unknown;
  language?: unknown;
  honeypot?: unknown;
};

type StoredFeedback = {
  public_reference: string;
  delivery_status: string;
};

type RateLimitResult = {
  allowed: boolean;
  retry_after_seconds: number;
  current_count: number;
};

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 16_384;

function allowedOrigins(): Set<string> {
  const raw = Deno.env.get("SUPPORT_ALLOWED_ORIGINS") ?? "https://haqak.org,https://www.haqak.org";
  return new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && allowedOrigins().has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  cors: Record<string, string>,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...JSON_HEADERS, ...extraHeaders },
  });
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createReference(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `HQK-SUP-${date}-${suffix}`;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extractModernSecretKey(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("sb_secret_")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? Object.values(parsed as Record<string, unknown>)
        : [];
    for (const value of values) {
      if (typeof value === "string" && value.startsWith("sb_secret_")) return value;
      if (value && typeof value === "object") {
        for (const nested of Object.values(value as Record<string, unknown>)) {
          if (typeof nested === "string" && nested.startsWith("sb_secret_")) return nested;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

function getAdminKey(): string {
  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
    Deno.env.get("SUPABASE_SECRET_KEY")?.trim() ||
    extractModernSecretKey(Deno.env.get("SUPABASE_SECRET_KEYS")) ||
    ""
  );
}

function clientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

function validationError(code: string, message: string, cors: Record<string, string>): Response {
  return json({ accepted: false, code, message }, 422, cors);
}

function providerError(status: number): string {
  if (status === 401 || status === 403) return "RESEND_AUTH_OR_DOMAIN";
  if (status === 429) return "RESEND_RATE_LIMITED";
  if (status >= 500) return "RESEND_UNAVAILABLE";
  return `RESEND_HTTP_${status}`;
}

async function consumeLimit(
  admin: ReturnType<typeof createClient>,
  bucketKey: string,
  windowSeconds: number,
  maxRequests: number,
): Promise<RateLimitResult> {
  const { data, error } = await admin.rpc("consume_support_feedback_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });
  if (error) throw new Error(`RATE_LIMIT_STORAGE:${error.code}`);
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object") throw new Error("RATE_LIMIT_STORAGE:INVALID_RESULT");
  const record = value as Record<string, unknown>;
  return {
    allowed: record.allowed === true,
    retry_after_seconds: Number(record.retry_after_seconds ?? 0),
    current_count: Number(record.current_count ?? 0),
  };
}

async function sendNotification(params: {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  reference: string;
  submissionId: string;
  contributionId: string | null;
  name: string;
  email: string;
  message: string;
  language: string;
}): Promise<{ sent: true; providerId: string } | { sent: false; errorCode: string }> {
  const { apiKey, fromEmail, toEmail, reference, submissionId, contributionId, name, email, message, language } = params;
  const safeName = name || "Anonymous supporter";
  const subject = `[${reference}] رسالة دعم جديدة | New Haqak support message`;
  const text = [
    `Reference: ${reference}`,
    `Name: ${safeName}`,
    `Email: ${email || "Not provided"}`,
    `Language: ${language || "Not provided"}`,
    `Contribution ID: ${contributionId || "Not linked"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;background-color:#f6f4f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f6f4f0;">
    <tr><td align="center" style="padding-top:28px;padding-right:16px;padding-bottom:28px;padding-left:16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;border-collapse:collapse;background-color:#ffffff;border:1px solid #e6e0d8;">
        <tr><td bgcolor="#1A1A1A" style="background-color:#1A1A1A;padding-top:22px;padding-right:24px;padding-bottom:22px;padding-left:24px;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#D4AF84;letter-spacing:1.4px;text-transform:uppercase;">Haqak Support</p>
          <h1 style="margin-top:8px;margin-right:0;margin-bottom:0;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:32px;color:#ffffff;font-weight:700;">New support message</h1>
        </td></tr>
        <tr><td style="padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px;">
          <p style="margin-top:0;margin-right:0;margin-bottom:16px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b6258;"><strong style="color:#1A1A1A;">Reference:</strong> ${escapeHtml(reference)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
            <tr><td style="padding-top:6px;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#1A1A1A;"><strong>Name:</strong> ${escapeHtml(safeName)}</td></tr>
            <tr><td style="padding-top:6px;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#1A1A1A;"><strong>Email:</strong> ${escapeHtml(email || "Not provided")}</td></tr>
            <tr><td style="padding-top:6px;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#1A1A1A;"><strong>Contribution:</strong> ${escapeHtml(contributionId || "Not linked")}</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-top:18px;">
            <tr><td bgcolor="#F8F5F0" style="background-color:#F8F5F0;border:1px solid #EDE8E0;padding-top:18px;padding-right:18px;padding-bottom:18px;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2f2a25;white-space:pre-wrap;">${escapeHtml(message)}</td></tr>
          </table>
          <p style="margin-top:18px;margin-right:0;margin-bottom:0;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8a8178;">Automated notification from haqak.org. Reply uses the visitor address when supplied.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Haqak-Support/1.0",
        "Idempotency-Key": `haqak-support-${submissionId}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        text,
        html,
        ...(email ? { reply_to: [email] } : {}),
      }),
    });
  } catch {
    return { sent: false, errorCode: "RESEND_NETWORK" };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const providerId = body && typeof body === "object" && typeof (body as Record<string, unknown>).id === "string"
    ? String((body as Record<string, unknown>).id)
    : "";
  if (response.ok && providerId) return { sent: true, providerId };
  return { sent: false, errorCode: providerError(response.status) };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  if (!origin || !allowedOrigins().has(origin)) {
    return json({ accepted: false, code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." }, 403, cors);
  }
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (req.method !== "POST") {
    return json({ accepted: false, code: "METHOD_NOT_ALLOWED", message: "Method not allowed." }, 405, cors, { Allow: "POST, OPTIONS" });
  }

  const declaredLength = Number(req.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ accepted: false, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." }, 413, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const adminKey = getAdminKey();
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
  const fromEmail = Deno.env.get("SUPPORT_FROM_EMAIL")?.trim() ?? "";
  const toEmail = Deno.env.get("SUPPORT_TO_EMAIL")?.trim() ?? "";
  const rateLimitSalt = Deno.env.get("SUPPORT_RATE_LIMIT_SALT")?.trim() ?? "";

  if (!supabaseUrl || !adminKey) {
    console.error("support feedback configuration unavailable", { component: "database" });
    return json({ accepted: false, code: "SERVICE_MISCONFIGURED", message: "Support service is unavailable." }, 503, cors);
  }
  if (!resendApiKey || !fromEmail || !toEmail) {
    console.error("support feedback configuration unavailable", { component: "email" });
    return json({ accepted: false, code: "SERVICE_MISCONFIGURED", message: "Support service is unavailable." }, 503, cors);
  }
  if (rateLimitSalt.length < 64) {
    console.error("support feedback configuration unavailable", { component: "rate_limit" });
    return json({ accepted: false, code: "SERVICE_MISCONFIGURED", message: "Support service is unavailable." }, 503, cors);
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return validationError("INVALID_BODY", "Request body could not be read.", cors);
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ accepted: false, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." }, 413, cors);
  }

  let body: RequestPayload;
  try {
    body = JSON.parse(rawBody) as RequestPayload;
  } catch {
    return validationError("INVALID_JSON", "Request body must be valid JSON.", cors);
  }

  const submissionId = readString(body.submission_id).toLowerCase();
  const contributionId = readString(body.contribution_id).toLowerCase();
  const name = readString(body.name);
  const email = readString(body.email).toLowerCase();
  const message = readString(body.message);
  const language = readString(body.language).slice(0, 16);
  const honeypot = readString(body.honeypot);

  if (honeypot) {
    return json({ accepted: true, reference: createReference(), delivery: "sent", duplicate: false }, 200, cors);
  }
  if (!UUID_PATTERN.test(submissionId)) return validationError("INVALID_SUBMISSION_ID", "A valid submission identifier is required.", cors);
  if (contributionId && !UUID_PATTERN.test(contributionId)) return validationError("INVALID_CONTRIBUTION_ID", "Contribution identifier is invalid.", cors);
  if (name.length > 100) return validationError("INVALID_NAME", "Name is too long.", cors);
  if (email.length > 255 || (email && !EMAIL_PATTERN.test(email))) return validationError("INVALID_EMAIL", "Email address is invalid.", cors);
  if (message.length < 10 || message.length > 4000) return validationError("INVALID_MESSAGE", "Message must be between 10 and 4000 characters.", cors);

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: replay, error: replayError } = await admin
    .from("support_feedback_messages")
    .select("public_reference, delivery_status")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (replayError) {
    console.error("support feedback replay lookup failed", { code: replayError.code });
    return json({ accepted: false, code: "PERSISTENCE_UNAVAILABLE", message: "Support service is temporarily unavailable." }, 503, cors);
  }
  if (replay) {
    const stored = replay as StoredFeedback;
    const delivery: DeliveryState = stored.delivery_status === "sent" ? "sent" : "delayed";
    return json({ accepted: true, reference: stored.public_reference, delivery, duplicate: true }, delivery === "sent" ? 200 : 202, cors);
  }

  const fingerprint = await hmacSha256Hex(rateLimitSalt, clientIp(req));
  try {
    const shortWindow = await consumeLimit(admin, `support:10m:${fingerprint}`, 600, 5);
    const dailyWindow = await consumeLimit(admin, `support:24h:${fingerprint}`, 86_400, 20);
    const rejected = !shortWindow.allowed ? shortWindow : !dailyWindow.allowed ? dailyWindow : null;
    if (rejected) {
      return json(
        { accepted: false, code: "RATE_LIMITED", message: "Too many messages. Please wait before trying again." },
        429,
        cors,
        { "Retry-After": String(Math.max(1, rejected.retry_after_seconds)) },
      );
    }
  } catch (error) {
    console.error("support feedback rate limit unavailable", { code: error instanceof Error ? error.message.split(":")[0] : "UNKNOWN" });
    return json({ accepted: false, code: "RATE_LIMIT_UNAVAILABLE", message: "Support service is temporarily unavailable." }, 503, cors);
  }

  const reference = createReference();
  const { error: insertError } = await admin.from("support_feedback_messages").insert({
    public_reference: reference,
    submission_id: submissionId,
    legacy_contribution_id: contributionId || null,
    name: name || null,
    email: email || null,
    message,
    language: language || null,
    request_fingerprint: fingerprint,
    delivery_status: "pending",
    metadata: { source_path: "/support" },
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: duplicate } = await admin
        .from("support_feedback_messages")
        .select("public_reference, delivery_status")
        .eq("submission_id", submissionId)
        .maybeSingle();
      if (duplicate) {
        const stored = duplicate as StoredFeedback;
        const delivery: DeliveryState = stored.delivery_status === "sent" ? "sent" : "delayed";
        return json({ accepted: true, reference: stored.public_reference, delivery, duplicate: true }, delivery === "sent" ? 200 : 202, cors);
      }
    }
    console.error("support feedback insert failed", { code: insertError.code });
    return json({ accepted: false, code: "PERSISTENCE_UNAVAILABLE", message: "Support service is temporarily unavailable." }, 503, cors);
  }

  const deliveryResult = await sendNotification({
    apiKey: resendApiKey,
    fromEmail,
    toEmail,
    reference,
    submissionId,
    contributionId: contributionId || null,
    name,
    email,
    message,
    language,
  });

  if (deliveryResult.sent) {
    const { error: updateError } = await admin
      .from("support_feedback_messages")
      .update({
        delivery_status: "sent",
        provider_message_id: deliveryResult.providerId,
        email_sent_at: new Date().toISOString(),
        delivery_error_code: null,
      })
      .eq("submission_id", submissionId);
    if (updateError) console.error("support feedback delivery-state update failed", { code: updateError.code });
    console.log("support feedback accepted", { reference, code: "DELIVERED" });
    return json({ accepted: true, reference, delivery: "sent", duplicate: false }, 200, cors);
  }

  const { error: failureUpdateError } = await admin
    .from("support_feedback_messages")
    .update({ delivery_status: "failed", delivery_error_code: deliveryResult.errorCode })
    .eq("submission_id", submissionId);
  if (failureUpdateError) console.error("support feedback failure-state update failed", { code: failureUpdateError.code });
  console.error("support feedback notification delayed", { reference, code: deliveryResult.errorCode });
  return json({ accepted: true, reference, delivery: "delayed", duplicate: false, code: "NOTIFICATION_DELAYED" }, 202, cors);
});
