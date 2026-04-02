import * as Sentry from "@sentry/react";
import { toast } from "sonner";

export type ClientProblem = {
  code: string;
  message: string;
  retryable: boolean;
  cause?: string;
};

// Intentionally scrub payload/body/message keys because these frequently carry
// free-text user input and backend details that may contain PII.
const SENSITIVE_KEY_PATTERN =
  /(token|password|secret|authorization|cookie|email|phone|payload|body|request_body|response_body|raw_message|stack_trace|session)/i;

const sanitizeValue = (value: unknown): string | number | boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, 200);
  if (typeof value === "number" || typeof value === "boolean") return value;
  return "[redacted]";
};

const scrubExtras = (extras?: Record<string, unknown>) => {
  if (!extras) return undefined;
  const safe: Record<string, string | number | boolean | null> = {};
  Object.entries(extras).forEach(([key, value]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      safe[key] = "[redacted]";
      return;
    }
    safe[key] = sanitizeValue(value);
  });
  return safe;
};

const sanitizeCause = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (error instanceof Error) return error.name;
  if (typeof error === "string") return error.slice(0, 120);
  return "unknown_error";
};

export const createClientProblem = (problem: ClientProblem): ClientProblem => ({
  code: problem.code,
  message: problem.message,
  retryable: problem.retryable,
  cause: problem.cause,
});

export const handleClientError = (
  problem: ClientProblem,
  error?: unknown,
  options?: { showToast?: boolean; extras?: Record<string, unknown> },
) => {
  const normalized = createClientProblem({
    ...problem,
    cause: problem.cause ?? sanitizeCause(error),
  });

  if (options?.showToast !== false) {
    toast.error(normalized.message);
  }

  Sentry.withScope((scope) => {
    scope.setTag("error_code", normalized.code);
    scope.setLevel("error");
    scope.setContext("client_problem", {
      code: normalized.code,
      retryable: normalized.retryable,
      cause: normalized.cause ?? null,
    });
    const extras = scrubExtras(options?.extras);
    if (extras) {
      Object.entries(extras).forEach(([key, value]) => scope.setExtra(key, value));
    }
    Sentry.captureException(error instanceof Error ? error : new Error(normalized.code));
  });
};
