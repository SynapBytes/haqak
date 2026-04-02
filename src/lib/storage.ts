import { supabase } from "@/integrations/supabase/client";
import { validateBeforeUpload } from "@/lib/fileValidation";
import {
  buildAvatarPath,
  buildIdentityVerificationPath,
  buildIssueAttachmentPath,
  buildMpPublicImagePath,
  buildModerationEvidencePath,
} from "@/lib/storagePaths";

export const ATTACHMENTS_BUCKET = "issue-attachments";
export const AVATARS_BUCKET = "avatars";
export const MODERATION_BUCKET = "moderation-evidence";
export const ID_VERIFICATIONS_BUCKET = "id_verifications";
export const RECEIPTS_BUCKET = "receipts";
export const MP_PUBLIC_IMAGES_BUCKET = "mp-public-images";
const DEFAULT_SIGNED_URL_EXPIRY = 60; // seconds

export {
  buildAvatarPath,
  buildIdentityVerificationPath,
  buildIssueAttachmentPath,
  buildMpPublicImagePath,
  buildModerationEvidencePath,
} from "@/lib/storagePaths";

/**
 * Placeholder hook for antivirus / content-scanning before a file is stored.
 *
 * TODO[AV]: Integrate a real AV scanner here (e.g. ClamAV via a sidecar
 *   service, or a cloud API such as VirusTotal / Microsoft Defender for Cloud)
 *   when AV_SCAN_ENABLED is set to "true" in the environment.
 *
 * For now, the function resolves successfully so that the upload pipeline
 * continues.  Once a real scanner is wired in, it should throw on detection.
 */
async function avScanFile(_file: File): Promise<void> {
  // When AV_SCAN_ENABLED=true but the actual scanner is not yet wired in,
  // log a warning so operators are aware the security layer is inactive.
  if (import.meta.env.VITE_AV_SCAN_ENABLED === "true") {
    console.warn("[storage] AV_SCAN_ENABLED is true but no AV scanner is configured. TODO[AV]: wire in a real scanner.");
  }
  // TODO[AV]: call external AV service here
}

export const uploadIssueAttachment = async (path: string, file: File) => {
  const validation = validateBeforeUpload([file]);
  if (!validation.valid) throw new Error(validation.error ?? "File validation failed");
  await avScanFile(file);
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file);
  if (error) throw error;
  return { bucket: ATTACHMENTS_BUCKET, path };
};

export const uploadAvatar = async (path: string, file: File) => {
  const validation = validateBeforeUpload([file]);
  if (!validation.valid) throw new Error(validation.error ?? "File validation failed");
  await avScanFile(file);
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return { bucket: AVATARS_BUCKET, path };
};

export const uploadModerationEvidence = async (path: string, file: File) => {
  const validation = validateBeforeUpload([file]);
  if (!validation.valid) throw new Error(validation.error ?? "File validation failed");
  await avScanFile(file);
  const { error } = await supabase.storage.from(MODERATION_BUCKET).upload(path, file);
  if (error) throw error;
  return { bucket: MODERATION_BUCKET, path };
};

export const uploadIdentityVerificationImage = async (path: string, file: File) => {
  const allowedTypes = new Set(["image/jpeg", "image/png"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Only JPG/PNG images are allowed for identity verification");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Identity image size must be 8MB or smaller");
  }
  await avScanFile(file);
  const { error } = await supabase.storage.from(ID_VERIFICATIONS_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return { bucket: ID_VERIFICATIONS_BUCKET, path };
};

export const uploadMpPublicImage = async (path: string, file: File) => {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Only JPG/PNG/WEBP images are allowed");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image size must be 5MB or smaller");
  }
  await avScanFile(file);
  const { error } = await supabase.storage.from(MP_PUBLIC_IMAGES_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return { bucket: MP_PUBLIC_IMAGES_BUCKET, path };
};

export const saveModerationEvidence = async (issueId: string, file: File, uploadedBy: string) => {
  const path = buildModerationEvidencePath(issueId, uploadedBy, file.name);
  await uploadModerationEvidence(path, file);
  const { error } = await supabase.from("issue_attachments").insert({
    issue_id: issueId,
    file_path: path,
    file_name: file.name,
    file_type: file.type,
  } as never);
  if (error) throw error;
  return { bucket: MODERATION_BUCKET, path };
};

export const getSignedDownloadUrl = async (
  bucket: string,
  path: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY,
) => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw error ?? new Error("Unable to create signed URL");
  return data.signedUrl;
};
