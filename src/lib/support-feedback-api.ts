export type SupportFeedbackPayload = {
  submission_id: string;
  contribution_id: string | null;
  name: string;
  email: string;
  message: string;
  honeypot: string;
};

export type SupportFeedbackReceipt = {
  accepted: true;
  reference: string;
  delivery: "sent" | "delayed";
  duplicate: boolean;
};

export type SupportFeedbackErrorKind =
  | "configuration"
  | "validation"
  | "rate_limit"
  | "unavailable"
  | "network"
  | "timeout";

export class SupportFeedbackApiError extends Error {
  readonly kind: SupportFeedbackErrorKind;
  readonly code: string;
  readonly retryable: boolean;

  constructor(kind: SupportFeedbackErrorKind, code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "SupportFeedbackApiError";
    this.kind = kind;
    this.code = code;
    this.retryable = retryable;
  }
}

type PublicErrorBody = {
  accepted?: unknown;
  code?: unknown;
  message?: unknown;
};

const REQUEST_TIMEOUT_MS = 12_000;

function getConfiguration(): { endpoint: string; key: string } {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new SupportFeedbackApiError(
      "configuration",
      "PUBLIC_CONFIG_MISSING",
      "The secure support service is not configured on this site.",
      false,
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new SupportFeedbackApiError(
      "configuration",
      "PUBLIC_CONFIG_INVALID",
      "The secure support service configuration is invalid.",
      false,
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new SupportFeedbackApiError(
      "configuration",
      "PUBLIC_CONFIG_INVALID",
      "The secure support service configuration is invalid.",
      false,
    );
  }

  return {
    endpoint: `${parsedUrl.origin}/functions/v1/support-feedback`,
    key,
  };
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isReceipt(value: unknown): value is SupportFeedbackReceipt {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.accepted === true &&
    typeof record.reference === "string" &&
    record.reference.trim().length >= 8 &&
    (record.delivery === "sent" || record.delivery === "delayed") &&
    typeof record.duplicate === "boolean"
  );
}

function publicError(value: unknown): { code: string; message: string } {
  const body = value && typeof value === "object" ? (value as PublicErrorBody) : {};
  return {
    code: typeof body.code === "string" ? body.code : "UNKNOWN",
    message:
      typeof body.message === "string" && body.message.trim()
        ? body.message
        : "The support service could not accept the message.",
  };
}

function mapHttpError(status: number, value: unknown): SupportFeedbackApiError {
  const error = publicError(value);

  if (status === 422) {
    return new SupportFeedbackApiError("validation", error.code, error.message, false);
  }
  if (status === 429) {
    return new SupportFeedbackApiError("rate_limit", error.code, error.message, true);
  }
  if (status === 403) {
    return new SupportFeedbackApiError("unavailable", error.code, error.message, false);
  }
  if (status >= 500) {
    return new SupportFeedbackApiError("unavailable", error.code, error.message, true);
  }

  return new SupportFeedbackApiError("unavailable", error.code, error.message, false);
}

export async function submitSupportFeedback(
  payload: SupportFeedbackPayload,
): Promise<SupportFeedbackReceipt> {
  const { endpoint, key } = getConfiguration();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SupportFeedbackApiError(
        "timeout",
        "REQUEST_TIMEOUT",
        "The request timed out. Your message is still preserved for a safe retry.",
        true,
      );
    }

    throw new SupportFeedbackApiError(
      "network",
      "NETWORK_ERROR",
      "The support service could not be reached. Your message is still preserved for a safe retry.",
      true,
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const responseBody = await parseJsonSafely(response);

  if (!response.ok) {
    throw mapHttpError(response.status, responseBody);
  }

  if (!isReceipt(responseBody)) {
    throw new SupportFeedbackApiError(
      "unavailable",
      "INVALID_RECEIPT",
      "The support service returned an incomplete receipt. Your message has not been marked as delivered.",
      true,
    );
  }

  return responseBody;
}
