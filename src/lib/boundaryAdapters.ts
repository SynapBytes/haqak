import { z } from "zod";
import {
  AttachmentMetadataSchema,
  CaptchaResponseSchema,
  ClassifyIssueResponseSchema,
  IdentityVerificationSchema,
  UuidStringSchema,
  VerifyUploadIntegrityResponseSchema,
} from "@/lib/schemas/boundary";

export const parseCaptchaResponse = (input: unknown) => CaptchaResponseSchema.parse(input);
export const parseClassifyIssueResponse = (input: unknown) => ClassifyIssueResponseSchema.parse(input);
export const parseVerifyUploadIntegrityResponse = (input: unknown) => VerifyUploadIntegrityResponseSchema.parse(input);

export const safeParseAttachmentRows = (input: unknown) => z.array(AttachmentMetadataSchema).safeParse(input);
export const safeParseIdentityVerificationRows = (input: unknown) =>
  z.array(IdentityVerificationSchema).safeParse(input);
export const isUuidString = (input: string) => UuidStringSchema.safeParse(input).success;

export type ClassifyDefaults = {
  title: string;
  description: string;
  category: string;
  issueType: "individual" | "collective";
  aiSummary: string | null;
  priority: "normal" | "urgent" | "humanitarian";
};

export type ClassifyNormalizedResult = ClassifyDefaults & {
  rejected: boolean;
  rejectionReason?: string;
  usedFallback: boolean;
};

export const normalizeClassifyIssueResponse = (
  input: unknown,
  defaults: ClassifyDefaults,
): ClassifyNormalizedResult => {
  const parsed = ClassifyIssueResponseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ...defaults,
      rejected: false,
      usedFallback: true,
    };
  }

  const data = parsed.data;
  if (data.status === "rejected") {
    return {
      ...defaults,
      rejected: true,
      rejectionReason: data.rejectionReason,
      usedFallback: false,
    };
  }

  return {
    title: data.refined_title || defaults.title,
    description: data.refined_description || defaults.description,
    category: data.issueCategory || defaults.category,
    issueType:
      data.category === "collective"
        ? "collective"
        : data.category === "individual"
          ? "individual"
          : defaults.issueType,
    aiSummary: data.ai_summary || defaults.aiSummary,
    priority: data.priority || defaults.priority,
    rejected: false,
    usedFallback: false,
  };
};
