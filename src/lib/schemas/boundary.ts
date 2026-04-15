import { z } from "zod";

export const UuidStringSchema = z.string().uuid();

export const AuthProfileSchema = z
  .object({
    id: UuidStringSchema,
    user_id: UuidStringSchema,
    full_name: z.string().min(1),
    phone: z.string().optional().default(""),
    governorate: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    electoral_district: z.string().nullable().optional(),
    constituency: z.string().nullable().optional(),
    center: z.string().nullable().optional(),
    center_id: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    is_approved: z.boolean(),
    verification_status: z.string().nullable().optional(),
    contact_phone: z.string().nullable().optional(),
    membership_number: z.string().nullable().optional(),
    banned_until: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const ClassifyIssueResponseSchema = z
  .object({
    status: z.enum(["accepted", "rejected"]).optional(),
    rejectionReason: z.string().optional(),
    refined_title: z.string().optional(),
    refined_description: z.string().optional(),
    issueCategory: z.string().optional(),
    category: z.enum(["individual", "collective"]).optional(),
    ai_summary: z.string().nullable().optional(),
    priority: z.enum(["normal", "urgent", "humanitarian"]).optional(),
  })
  .passthrough();

export const VerifyUploadIntegrityResponseSchema = z
  .object({
    valid: z.boolean(),
    error: z.string().optional(),
  })
  .strict();

export const CaptchaResponseSchema = z
  .object({
    valid: z.boolean().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    score: z.number().optional(),
  })
  .strict()
  .transform((value) => ({
    valid: value.valid ?? value.success ?? false,
    error: value.error,
    score: value.score,
  }));

export const AttachmentMetadataSchema = z
  .object({
    id: UuidStringSchema,
    file_path: z.string().min(1),
    file_name: z.string().min(1),
    file_type: z.string().nullable().optional(),
    bucket: z.string().optional(),
  })
  .strict();

export const IdentityVerificationSchema = z
  .object({
    id: UuidStringSchema,
    user_id: UuidStringSchema,
    role: z.enum(["citizen", "mp", "admin", "moderator"]),
    status: z.enum(["pending", "verified", "rejected"]),
    id_front_path: z.string().min(1),
    id_back_path: z.string().min(1),
    extracted_fields_json: z.record(z.unknown()).nullable(),
    submitted_at: z.string(),
    decided_at: z.string().nullable(),
    rejection_reason: z.string().nullable(),
  })
  .strict();

export type AuthProfile = z.infer<typeof AuthProfileSchema>;
export type ClassifyIssueResponse = z.infer<typeof ClassifyIssueResponseSchema>;
export type VerifyUploadIntegrityResponse = z.infer<typeof VerifyUploadIntegrityResponseSchema>;
export type CaptchaResponse = z.infer<typeof CaptchaResponseSchema>;
export type AttachmentMetadata = z.infer<typeof AttachmentMetadataSchema>;
export type IdentityVerification = z.infer<typeof IdentityVerificationSchema>;
