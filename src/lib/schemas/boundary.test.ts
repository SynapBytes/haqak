import { describe, expect, it } from "vitest";
import {
  AttachmentMetadataSchema,
  AuthProfileSchema,
  CaptchaResponseSchema,
  ClassifyIssueResponseSchema,
  IdentityVerificationSchema,
  VerifyUploadIntegrityResponseSchema,
} from "@/lib/schemas/boundary";

describe("boundary schemas", () => {
  it("parses auth profile payload", () => {
    const result = AuthProfileSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "22222222-2222-4222-8222-222222222222",
      full_name: "Test User",
      phone: "01000000000",
      is_approved: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("parses classify-issue response payload", () => {
    const result = ClassifyIssueResponseSchema.safeParse({
      status: "accepted",
      refined_title: "refined",
      refined_description: "refined desc",
      issueCategory: "roads",
      category: "collective",
      ai_summary: "summary",
      priority: "urgent",
    });
    expect(result.success).toBe(true);
  });

  it("parses verify-upload-integrity response payload", () => {
    const result = VerifyUploadIntegrityResponseSchema.safeParse({ valid: true });
    expect(result.success).toBe(true);
  });

  it("normalizes captcha payload from valid key", () => {
    const parsed = CaptchaResponseSchema.parse({ valid: true, score: 0.9 });
    expect(parsed.valid).toBe(true);
    expect(parsed.score).toBe(0.9);
  });

  it("normalizes captcha payload from success key", () => {
    const parsed = CaptchaResponseSchema.parse({ success: true });
    expect(parsed.valid).toBe(true);
  });

  it("parses attachment metadata row", () => {
    const result = AttachmentMetadataSchema.safeParse({
      id: "33333333-3333-4333-8333-333333333333",
      file_path: "u/issue/file.pdf",
      file_name: "file.pdf",
      file_type: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("parses identity verification row", () => {
    const result = IdentityVerificationSchema.safeParse({
      id: "44444444-4444-4444-8444-444444444444",
      user_id: "55555555-5555-4555-8555-555555555555",
      role: "citizen",
      status: "pending",
      id_front_path: "front.jpg",
      id_back_path: "back.jpg",
      extracted_fields_json: null,
      submitted_at: new Date().toISOString(),
      decided_at: null,
      rejection_reason: null,
    });
    expect(result.success).toBe(true);
  });
});
