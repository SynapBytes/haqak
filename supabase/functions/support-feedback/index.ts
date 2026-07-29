import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders, isAllowedOrigin } from "../shared/cors.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";
import { getSecret } from "../_shared/secrets.ts";

type DeliveryState = "sent" | "delayed";

type RequestPayload = {
  submission_id?: unknown;
  contribution_id?: unknown;
  name?: unknown;
  email?: unknown;
  message?: unknown;
  honeypot?: unknown;
};

type StoredFeedback = {
  id: string;
  public_reference: string | null;
  delivery_status: string;
};

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
    const candidates: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? Object.values(parsed as Record<string, unknown>)
        : [];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().startsWith("sb_secret_")) {
        return candidate.trim();
      }
      if (candidate && typeof candidate === "object") {
        for (const nested of Object.values(candidate as Record<string, unknown>)) {
          if (typeof nested === "string" && nested.trim().startsWith("sb_secret_")) {
            return nested.trim();
          }
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getAdminKey(): Promise<string | null> {
  const legacy = (await getSecret("SUPABASE_SERVICE_ROLE_KEY"))?.trim();
  if (legacy) return legacy;

  const modernDirect = (await getSecret("SUPABASE_SECRET_KEY"))?.trim();
  if (modernDirect) return modernDirect;

  return extractModernSecretKey(await getSecret("SUPABASE_SECRET_KEYS"));
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

function validationError(
  code: string,
  message: string,
  cors: Record<string, string>,
): Response {
  return json({ accepted: false, code, message }, 422, cors);
}

function normalizeProviderError(status: number): string {
  if (status === 401 || status === 403) return "RESEND_AUTH_OR_DOMAIN";
  if (status === 429) return "RESEND_RATE_LIMITED";
  if (status >= 500) return "RESEND_UNAVAILABLE";
  return `RESEND_HTTP_${status}`;
}

async function sendNotification(params: {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  reference: string;
  name: string;
  email: string;
  message: string;
  contributionId: string | null;
}): Promise<{ sent: true; providerId: string } | { sent: false; errorCode: string }> {
  const { apiKey, fromEmail, toEmail, reference, name, email, message, contributionId } = params;
  const safeName = name || "Anonymous supporter";
  const subject = `[${reference}] New Haqak support message`;
  const replyTo = email ? [email] : undefined;

  const text = [
    `Reference: ${reference}`,
    `Name: ${safeName}`,
    `Email: ${email || "Not provided"}`,
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
<body style="margin:0;padding:0;background-color:#f6f4f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f6f4f0;">
    <tr>
      <td align="center" style="padding-top:28px;padding-right:16px;padding-bottom:28px;padding-left:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;border-collapse:collapse;background-color:#ffffff;border:1px solid #e6e0d8;">
          <tr>
            <td bgcolor="#1A1A1A" style="background-color:#1A1A1A;padding-top:22px;padding-right:24px;padding-bottom:22px;padding-left:24px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#D4AF84;letter-spacing:1.4px;text-transform:uppercase;">Haqak Support</p>
              <h1 style="margin-top:8px;margin-right:0;margin-bottom:0;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:32px;color:#ffffff;font-weight:700;">New support message</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px;">
              <p style="margin-top:0;margin-right:0;margin-bottom:16px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b6258;"><strong style="color:#1A1A1A;">Reference:</strong> ${escapeHtml(reference)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr><td style="padding-top:6px;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#1A1A1A;"><strong>Name:</strong> ${escapeHtml(safeName)}</td></tr>
                <tr><td style="padding-top:6px;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#1A1A1A;"><strong>Email:</strong> ${escapeHtml(email || "Not provided")}</td></tr>
                <tr><td style="padding-top:6px;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#1A1A1A;"><strong>Contribution:</strong> ${escapeHtml(contributionId || "Not linked")}</td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-top:18px;">
                <tr>
                  <td bgcolor="#F8F5F0" style="background-color:#F8F5F0;border:1px solid #EDE8E0;padding-top:18px;padding-right:18px;padding-bottom:18px;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2f2a25;white-space:pre-wrap;">${escapeHtml(message)}</td>
                </tr>
              </table>
              <p style="margin-top:18px;margin-right:0;margin-bottom:0;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8a8178;">Automated notification from haqak.org. Reply uses the visitor address when one was provided.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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
        "Idempotency-Key": `haqak-support-${reference}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
  } catch {
    return { sent: false, errorCode: "RESEND_NETWORK" };
  }

  let providerBody: unknown = null;
  try {
    providerBody = await response.json();
  } catch {
    providerBody = null;
  }

  const providerId =
    providerBody && typeof providerBody === "object" && typeof (providerBody as Record<string, unknown>).id === "string"
      ? String((providerBody as Record<string, unknown>).id)
      : "";

  if (response.ok && providerId) {
    return { sent: true, providerId };
  }

  return { sent: false, errorCode: normalizeProviderError(response.status) };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = buildCorsHeaders(origin, true);

  if (!isAllowedOrigin(origin)) {
    return json(
      { accepted: false, code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." },
      403,
      cors,
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: cors });
  }

  if (req.method !== "POST") {
    return json(
      { accepted: false, code: "METHOD_NOT_ALLOWED", message: "Method not allowed." },
      405,
      cors,
      { Allow: "POST, OPTIONS" },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const adminKey = await getAdminKey();
  const resendApiKey = (await getSecret("RESEND_API_KEY"))?.trim() ?? "";
  const fromEmail = (await getSecret("SUPPORT_FROM_EMAIL"))?.trim() ?? "";
  const toEmail = (await getSecret("SUPPORT_TO_EMAIL"))?.trim() ?? "";
  const rateLimitSalt = (await getSecret("SUPPORT_RATE_LIMIT_SALT"))?.trim() ?? "";

  if (!supabaseUrl || !adminKey) {
    console.error("support feedback configuration unavailable", { component: "database" });
    return json(
      { accepted: false, code: "SERVICE_MISCONFIGURED", message: "Support service is unavailable.", component: "database" },
      503,
      cors,
    );
  }

  if (!resendApiKey || !fromEmail || !toEmail) {
    console.error("support feedback configuration unavailable", { component: "email" });
    return json(
      { accepted: false, code: "SERVICE_MISCONFIGURED", message: "Support service is unavailable.", component: "email" },
      503,
      cors,
    );
  }

  if (rateLimitSalt.length < 32) {
    console.error("support feedback configuration unavailable", { component: "rate_limit" });
    return json(
      { accepted: false, code: "SERVICE_MISCONFIGURED", message: "Support service is unavailable.", component: "rate_limit" },
      503,
      cors,
    );
  }

  let body: RequestPayload;
  try {
    body = (await req.json()) as RequestPayload;
  } catch {
    return validationError("INVALID_JSON", "Request body must be valid JSON.", cors);
  }

  const submissionId = cleanString(body.submission_id, 64).toLowerCase();
  const contributionId = cleanString(body.contribution_id, 64).toLowerCase();
  const name = cleanString(body.name, 100);
  const email = cleanString(body.email, 255).toLowerCase();
  const message = cleanString(body.message, 2000);
  const honeypot = cleanString(body.honeypot, 200);

  if (honeypot) {
    return json(
      { accepted: true, reference: "HQK-SUP-RECEIVED", delivery: "sent", duplicate: false },
      200,
      cors,
    );
  }

  if (!UUID_PATTERN.test(submissionId)) {
    return validationError("INVALID_SUBMISSION_ID", "A valid submission identifier is required.", cors);
  }
  if (contributionId && !UUID_PATTERN.test(contributionId)) {
    return validationError("INVALID_CONTRIBUTION_ID", "Contribution identifier is invalid.", cors);
  }
  if (name.length > 100) {
    return validationError("INVALID_NAME", "Name is too long.", cors);
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    return validationError("INVALID_EMAIL", "Email address is invalid.", cors);
  }
  if (message.length < 10 || message.length > 2000) {
    return validationError("INVALID_MESSAGE", "Message must be between 10 and 2000 characters.", cors);
  }

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: replay, error: replayError } = await admin
    .from("feedbacks")
    .select("id, public_reference, delivery_status")
    .eq("submission_id", submissionId)
    .maybeSingle<StoredFeedback>();

  if (replayError) {
    console.error("support feedback replay lookup failed", { code: replayError.code });
    return json(
      { accepted: false, code: "PERSISTENCE_UNAVAILABLE", message: "Support service is temporarily unavailable." },
      503,
      cors,
    );
  }

  if (replay?.public_reference) {
    const delivery: DeliveryState = replay.delivery_status === "sent" ? "sent" : "delayed";
    return json(
      { accepted: true, reference: replay.public_reference, delivery, duplicate: true },
      delivery === "sent" ? 200 : 202,
      cors,
    );
  }

  const ipHash = await hmacSha256Hex(rateLimitSalt, getClientIp(req));
  try {
    await rateLimiter(admin, null, "/support-feedback", ipHash, 200, {
      maxRequests: 5,
      windowMinutes: 10,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      const status = error.reason === "storage_error" ? 503 : 429;
      return json(
        {
          accepted: false,
          code: error.reason === "storage_error" ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED",
          message: error.reason === "storage_error"
            ? "Support service is temporarily unavailable."
            : "Too many messages. Please wait before trying again.",
        },
        status,
        cors,
        { "Retry-After": String(error.retryAfterSeconds) },
      );
    }
    throw error;
  }

  const reference = createReference();
  const { error: insertError } = await admin.from("feedbacks").insert({
    contribution_id: contributionId || null,
    name: name || null,
    email: email || null,
    message,
    public_reference: reference,
    submission_id: submissionId,
    delivery_status: "pending",
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: duplicate } = await admin
        .from("feedbacks")
        .select("public_reference, delivery_status")
        .eq("submission_id", submissionId)
        .maybeSingle<{ public_reference: string | null; delivery_status: string }>();
      if (duplicate?.public_reference) {
        const delivery: DeliveryState = duplicate.delivery_status === "sent" ? "sent" : "delayed";
        return json(
          { accepted: true, reference: duplicate.public_reference, delivery, duplicate: true },
          delivery === "sent" ? 200 : 202,
          cors,
        );
      }
    }

    console.error("support feedback insert failed", { reference, code: insertError.code });
    return json(
      { accepted: false, code: "PERSISTENCE_UNAVAILABLE", message: "Support service is temporarily unavailable." },
      503,
      cors,
    );
  }

  const deliveryResult = await sendNotification({
    apiKey: resendApiKey,
    fromEmail,
    toEmail,
    reference,
    name,
    email,
    message,
    contributionId: contributionId || null,
  });

  if (deliveryResult.sent) {
    const { error: updateError } = await admin
      .from("feedbacks")
      .update({
        delivery_status: "sent",
        provider_message_id: deliveryResult.providerId,
        email_sent_at: new Date().toISOString(),
        delivery_error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("submission_id", submissionId);

    if (updateError) {
      console.error("support feedback delivery state update failed", { reference, code: updateError.code });
    }

    console.log("support feedback accepted", { reference, code: "DELIVERED" });
    return json(
      { accepted: true, reference, delivery: "sent", duplicate: false },
      200,
      cors,
    );
  }

  const { error: failureUpdateError } = await admin
    .from("feedbacks")
    .update({
      delivery_status: "failed",
      delivery_error_code: deliveryResult.errorCode,
      updated_at: new Date().toISOString(),
    })
    .eq("submission_id", submissionId);

  if (failureUpdateError) {
    console.error("support feedback failure state update failed", { reference, code: failureUpdateError.code });
  }

  console.error("support feedback notification delayed", { reference, code: deliveryResult.errorCode });
  return json(
    {
      accepted: true,
      reference,
      delivery: "delayed",
      duplicate: false,
      code: "NOTIFICATION_DELAYED",
    },
    202,
    cors,
  );
});
