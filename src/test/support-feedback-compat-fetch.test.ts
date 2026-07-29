import { describe, expect, it, vi } from "vitest";
import {
  createSupportAwareFetch,
} from "@/lib/support-feedback-compat-fetch";
import {
  SupportFeedbackApiError,
  type SupportFeedbackPayload,
  type SupportFeedbackReceipt,
} from "@/lib/support-feedback-api";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const endpoint = "https://legacy.supabase.co/rest/v1/feedbacks";
const body = JSON.stringify({
  contribution_id: "043af65c-b34a-4302-8158-bde3b975f24f",
  name: "Supporter",
  email: "supporter@example.com",
  message: "A message long enough for the secure support service.",
});

const queuedReceipt: SupportFeedbackReceipt = {
  accepted: true,
  reference: "HQK-SUP-20260729-ABCDEF123456",
  delivery: "delayed",
  duplicate: false,
};

describe("createSupportAwareFetch", () => {
  it("passes every non-feedback request through untouched", async () => {
    const baseResponse = new Response("ok", { status: 200 });
    const baseFetch = vi.fn().mockResolvedValue(baseResponse);
    const submitFeedback = vi.fn();
    const supportFetch = createSupportAwareFetch({ baseFetch, submitFeedback });

    const response = await supportFetch(
      "https://legacy.supabase.co/rest/v1/contributions",
      { method: "POST", body: "{}" },
    );

    expect(response).toBe(baseResponse);
    expect(baseFetch).toHaveBeenCalledOnce();
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it("translates the legacy insert into an isolated queued submission", async () => {
    const submitFeedback = vi.fn().mockResolvedValue(queuedReceipt);
    const baseFetch = vi.fn();
    const supportFetch = createSupportAwareFetch({
      baseFetch,
      submitFeedback,
      storage: new MemoryStorage(),
      getLanguage: () => "ar",
      createSubmissionId: () => "9d08758d-4e3d-4b82-9c6c-4bb763bb7538",
    });

    const response = await supportFetch(endpoint, { method: "POST", body });

    expect(response.status).toBe(201);
    expect(response.headers.get("X-Haqak-Support-Reference")).toBe(
      queuedReceipt.reference,
    );
    expect(response.headers.get("X-Haqak-Support-Delivery")).toBe("delayed");
    expect(baseFetch).not.toHaveBeenCalled();
    expect(submitFeedback).toHaveBeenCalledWith({
      submission_id: "9d08758d-4e3d-4b82-9c6c-4bb763bb7538",
      contribution_id: "043af65c-b34a-4302-8158-bde3b975f24f",
      name: "Supporter",
      email: "supporter@example.com",
      message: "A message long enough for the secure support service.",
      language: "ar",
      honeypot: "",
    } satisfies SupportFeedbackPayload);
  });

  it("reuses the same submission id after an ambiguous failure", async () => {
    const storage = new MemoryStorage();
    const createSubmissionId = vi
      .fn()
      .mockReturnValueOnce("9d08758d-4e3d-4b82-9c6c-4bb763bb7538")
      .mockReturnValueOnce("043af65c-b34a-4302-8158-bde3b975f24f");
    const submitFeedback = vi
      .fn()
      .mockRejectedValueOnce(
        new SupportFeedbackApiError(
          "network",
          "NETWORK_ERROR",
          "Temporary network failure.",
          true,
        ),
      )
      .mockResolvedValueOnce(queuedReceipt)
      .mockResolvedValueOnce(queuedReceipt);
    const supportFetch = createSupportAwareFetch({
      baseFetch: vi.fn(),
      submitFeedback,
      storage,
      getLanguage: () => "en",
      createSubmissionId,
    });

    const first = await supportFetch(endpoint, { method: "POST", body });
    const second = await supportFetch(endpoint, { method: "POST", body });
    const third = await supportFetch(endpoint, { method: "POST", body });

    expect(first.status).toBe(503);
    expect(second.status).toBe(201);
    expect(third.status).toBe(201);
    expect(submitFeedback.mock.calls[0][0].submission_id).toBe(
      "9d08758d-4e3d-4b82-9c6c-4bb763bb7538",
    );
    expect(submitFeedback.mock.calls[1][0].submission_id).toBe(
      "9d08758d-4e3d-4b82-9c6c-4bb763bb7538",
    );
    expect(submitFeedback.mock.calls[2][0].submission_id).toBe(
      "043af65c-b34a-4302-8158-bde3b975f24f",
    );
    expect(createSubmissionId).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed legacy inserts before network activity", async () => {
    const submitFeedback = vi.fn();
    const baseFetch = vi.fn();
    const supportFetch = createSupportAwareFetch({
      baseFetch,
      submitFeedback,
      storage: new MemoryStorage(),
    });

    const response = await supportFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ message: "" }),
    });

    expect(response.status).toBe(422);
    expect(submitFeedback).not.toHaveBeenCalled();
    expect(baseFetch).not.toHaveBeenCalled();
  });
});
