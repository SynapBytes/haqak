import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  submitSupportFeedback,
  SupportFeedbackApiError,
  type SupportFeedbackPayload,
} from "@/lib/support-feedback-api";

const payload: SupportFeedbackPayload = {
  submission_id: "9d08758d-4e3d-4b82-9c6c-4bb763bb7538",
  contribution_id: "043af65c-b34a-4302-8158-bde3b975f24f",
  name: "Haqak Production Test",
  email: "support@haqak.org",
  message: "Controlled support feedback delivery test.",
  language: "en",
  honeypot: "",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("submitSupportFeedback", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPPORT_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPPORT_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("accepts a canonical sent receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          accepted: true,
          reference: "HQK-SUP-20260729-ABCDEF123456",
          delivery: "sent",
          duplicate: false,
        }),
      ),
    );

    await expect(submitSupportFeedback(payload)).resolves.toEqual({
      accepted: true,
      reference: "HQK-SUP-20260729-ABCDEF123456",
      delivery: "sent",
      duplicate: false,
    });
  });

  it("accepts an HTTP 202 delayed receipt without claiming delivery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            accepted: true,
            reference: "HQK-SUP-20260729-ABCDEF123456",
            delivery: "delayed",
            duplicate: false,
            code: "NOTIFICATION_DELAYED",
          },
          202,
        ),
      ),
    );

    const receipt = await submitSupportFeedback(payload);
    expect(receipt.delivery).toBe("delayed");
  });

  it("rejects malformed 2xx responses to prevent false success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ accepted: true })));

    await expect(submitSupportFeedback(payload)).rejects.toMatchObject({
      name: "SupportFeedbackApiError",
      kind: "unavailable",
      code: "INVALID_RECEIPT",
    });
  });

  it("rejects non-canonical references", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({ accepted: true, reference: "received", delivery: "sent", duplicate: false }),
      ),
    );

    await expect(submitSupportFeedback(payload)).rejects.toMatchObject({
      code: "INVALID_RECEIPT",
    });
  });

  it("maps validation failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            accepted: false,
            code: "INVALID_MESSAGE",
            message: "Message must be between 10 and 4000 characters.",
          },
          422,
        ),
      ),
    );

    await expect(submitSupportFeedback(payload)).rejects.toMatchObject({
      kind: "validation",
      code: "INVALID_MESSAGE",
      retryable: false,
    });
  });

  it("maps durable rate limiting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            accepted: false,
            code: "RATE_LIMITED",
            message: "Too many messages. Please wait before trying again.",
          },
          429,
        ),
      ),
    );

    await expect(submitSupportFeedback(payload)).rejects.toMatchObject({
      kind: "rate_limit",
      code: "RATE_LIMITED",
      retryable: true,
    });
  });

  it("fails before network activity when isolated public configuration is missing", async () => {
    vi.stubEnv("VITE_SUPPORT_SUPABASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitSupportFeedback(payload)).rejects.toBeInstanceOf(SupportFeedbackApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
