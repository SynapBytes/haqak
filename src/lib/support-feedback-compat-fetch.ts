import {
  submitSupportFeedback,
  SupportFeedbackApiError,
  type SupportFeedbackPayload,
  type SupportFeedbackReceipt,
} from "@/lib/support-feedback-api";

type FetchInput = Parameters<typeof fetch>[0];
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type SubmitFeedback = (
  payload: SupportFeedbackPayload,
) => Promise<SupportFeedbackReceipt>;

type SupportAwareFetchOptions = {
  baseFetch?: typeof fetch;
  submitFeedback?: SubmitFeedback;
  storage?: StorageLike | null;
  getLanguage?: () => string;
  createSubmissionId?: () => string;
};

type LegacyFeedbackInsert = {
  contribution_id?: unknown;
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

const LEGACY_FEEDBACK_PATH = "/rest/v1/feedbacks";
const STORAGE_PREFIX = "haqak:support-feedback:";
const volatileSubmissionIds = new Map<string, string>();

function requestUrl(input: FetchInput): URL | null {
  const raw = input instanceof Request ? input.url : String(input);
  try {
    return new URL(raw, "https://haqak.org");
  } catch {
    return null;
  }
}

function requestMethod(input: FetchInput, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
}

async function requestBody(input: FetchInput, init?: RequestInit): Promise<string> {
  if (typeof init?.body === "string") return init.body;
  if (init?.body) {
    try {
      return await new Response(init.body).text();
    } catch {
      return "";
    }
  }
  if (input instanceof Request) {
    try {
      return await input.clone().text();
    } catch {
      return "";
    }
  }
  return "";
}

function singleInsert(value: unknown): LegacyFeedbackInsert | null {
  const candidate = Array.isArray(value) ? (value.length === 1 ? value[0] : null) : value;
  return candidate && typeof candidate === "object"
    ? (candidate as LegacyFeedbackInsert)
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableUuid(value: unknown): string | null {
  const normalized = stringValue(value).toLowerCase();
  return normalized || null;
}

async function payloadFingerprint(payload: LegacyFeedbackInsert): Promise<string> {
  const canonical = JSON.stringify({
    contribution_id: nullableUuid(payload.contribution_id),
    name: stringValue(payload.name),
    email: stringValue(payload.email).toLowerCase(),
    message: stringValue(payload.message),
  });

  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonical),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Deterministic non-reversible fallback for older browsers.
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function defaultSubmissionId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function storedSubmissionId(
  key: string,
  storage: StorageLike | null,
  createSubmissionId: () => string,
): string {
  try {
    const stored = storage?.getItem(key);
    if (stored) return stored;
  } catch {
    // Use the volatile fallback below.
  }

  const volatile = volatileSubmissionIds.get(key);
  if (volatile) return volatile;

  const created = createSubmissionId();
  volatileSubmissionIds.set(key, created);
  try {
    storage?.setItem(key, created);
  } catch {
    // Volatile storage still preserves retries during this page session.
  }
  return created;
}

function clearSubmissionId(key: string, storage: StorageLike | null): void {
  volatileSubmissionIds.delete(key);
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing else is required after a valid receipt.
  }
}

function errorResponse(error: unknown): Response {
  const normalized =
    error instanceof SupportFeedbackApiError
      ? error
      : new SupportFeedbackApiError(
          "unavailable",
          "SUPPORT_BRIDGE_UNAVAILABLE",
          "The support service could not accept the message.",
          true,
        );

  const status =
    normalized.kind === "validation"
      ? 422
      : normalized.kind === "rate_limit"
        ? 429
        : 503;

  return new Response(
    JSON.stringify({
      code: normalized.code,
      message: normalized.message,
      details: null,
      hint: null,
    }),
    {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}

/**
 * Temporary migration adapter for the existing Support page.
 *
 * It intercepts only the legacy POST to public.feedbacks. Every other request
 * continues to the original Haqak Supabase project unchanged.
 */
export function createSupportAwareFetch(
  options: SupportAwareFetchOptions = {},
): typeof fetch {
  const baseFetch = options.baseFetch ?? globalThis.fetch.bind(globalThis);
  const submitFeedback = options.submitFeedback ?? submitSupportFeedback;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const getLanguage =
    options.getLanguage ??
    (() =>
      (typeof document !== "undefined" && document.documentElement.lang) ||
      (typeof navigator !== "undefined" && navigator.language) ||
      "en");
  const createSubmissionId = options.createSubmissionId ?? defaultSubmissionId;

  return async (input: FetchInput, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    const isLegacyFeedbackInsert =
      url?.pathname === LEGACY_FEEDBACK_PATH && requestMethod(input, init) === "POST";

    if (!isLegacyFeedbackInsert) return baseFetch(input, init);

    const rawBody = await requestBody(input, init);
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return errorResponse(
        new SupportFeedbackApiError(
          "validation",
          "INVALID_LEGACY_PAYLOAD",
          "The feedback request is invalid.",
          false,
        ),
      );
    }

    const legacyPayload = singleInsert(parsedBody);
    if (!legacyPayload || !stringValue(legacyPayload.message)) {
      return errorResponse(
        new SupportFeedbackApiError(
          "validation",
          "INVALID_LEGACY_PAYLOAD",
          "The feedback request is invalid.",
          false,
        ),
      );
    }

    const fingerprint = await payloadFingerprint(legacyPayload);
    const storageKey = `${STORAGE_PREFIX}${fingerprint}`;
    const submissionId = storedSubmissionId(storageKey, storage, createSubmissionId);

    try {
      const receipt = await submitFeedback({
        submission_id: submissionId,
        contribution_id: nullableUuid(legacyPayload.contribution_id),
        name: stringValue(legacyPayload.name),
        email: stringValue(legacyPayload.email).toLowerCase(),
        message: stringValue(legacyPayload.message),
        language: getLanguage().slice(0, 16),
        honeypot: "",
      });

      clearSubmissionId(storageKey, storage);
      return new Response(null, {
        status: 201,
        headers: {
          "Preference-Applied": "return=minimal",
          "X-Haqak-Support-Reference": receipt.reference,
          "X-Haqak-Support-Delivery": receipt.delivery,
        },
      });
    } catch (error) {
      // Keep the submission ID in session storage so an ambiguous retry cannot
      // create a duplicate message.
      return errorResponse(error);
    }
  };
}
