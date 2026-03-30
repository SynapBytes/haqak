import { supabase } from "@/integrations/supabase/client";

export const ATTACHMENTS_BUCKET = "issue-attachments";
export const AVATARS_BUCKET = "avatars";
export const MODERATION_BUCKET = "moderation-evidence";
const DEFAULT_SIGNED_URL_EXPIRY = 60; // seconds

const hasTraversal = (value: string) => value.includes("..");
const FILE_EXTENSION_PATTERN = /\.[^/.]+$/;

const sanitizeFileName = (fileName: string) => {
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("Invalid path segments in file name");
  }
  const trimmed = fileName.trim() || "upload";
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  const collapsed = cleaned.replace(/\.+/g, ".");
  const withoutLeadingDot = collapsed.startsWith(".") ? collapsed.slice(1) : collapsed;
  return withoutLeadingDot || "upload";
};

const resolveExtension = (safe: string, fallback: string) => {
  const ext = safe.includes(".") ? safe.split(".").pop() : "";
  return ext && ext !== "" ? ext : fallback;
};

const assertSafeSegment = (value: string, label: string) => {
  if (!value || value.includes("..") || value.includes("/") || value.includes("\\")) {
    throw new Error(`Invalid ${label}`);
  }
};

const uniqueKey = () => {
  if (typeof crypto !== "undefined") {
    if ("randomUUID" in crypto) {
      return `${Date.now()}-${crypto.randomUUID()}`;
    }
    const buffer = new Uint32Array(2);
    crypto.getRandomValues(buffer);
    const randomHex = Array.from(buffer).map((n) => n.toString(16)).join("");
    return `${Date.now()}-${randomHex}`;
  }
  throw new Error("Secure random generator is not available in this environment");
};

export const buildIssueAttachmentPath = (userId: string, issueId: string, originalName: string) => {
  assertSafeSegment(userId, "user id");
  assertSafeSegment(issueId, "issue id");
  const safe = sanitizeFileName(originalName);
  const ext = resolveExtension(safe, "bin");
  const base = safe.replace(FILE_EXTENSION_PATTERN, "") || "file";
  const path = `${userId}/${issueId}/${uniqueKey()}-${base}.${ext}`;
  if (hasTraversal(path)) throw new Error("Invalid path");
  return path;
};

export const buildAvatarPath = (userId: string, originalName: string) => {
  assertSafeSegment(userId, "user id");
  const safe = sanitizeFileName(originalName);
  const ext = resolveExtension(safe, "jpg");
  const path = `${userId}/avatar.${ext}`;
  if (hasTraversal(path)) throw new Error("Invalid path");
  return path;
};

export const buildModerationEvidencePath = (issueId: string, uploaderId: string, originalName: string) => {
  assertSafeSegment(issueId, "issue id");
  assertSafeSegment(uploaderId, "uploader id");
  const safe = sanitizeFileName(originalName);
  const ext = resolveExtension(safe, "bin");
  const base = safe.replace(FILE_EXTENSION_PATTERN, "") || "evidence";
  const path = `${issueId}/${uploaderId}/${uniqueKey()}-${base}.${ext}`;
  if (hasTraversal(path)) throw new Error("Invalid path");
  return path;
};

export const uploadIssueAttachment = async (path: string, file: File) => {
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file);
  if (error) throw error;
  return { bucket: ATTACHMENTS_BUCKET, path };
};

export const uploadAvatar = async (path: string, file: File) => {
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return { bucket: AVATARS_BUCKET, path };
};

export const uploadModerationEvidence = async (path: string, file: File) => {
  const { error } = await supabase.storage.from(MODERATION_BUCKET).upload(path, file);
  if (error) throw error;
  return { bucket: MODERATION_BUCKET, path };
};

export const saveModerationEvidence = async (issueId: string, file: File, uploadedBy: string) => {
  const path = buildModerationEvidencePath(issueId, uploadedBy, file.name);
  await uploadModerationEvidence(path, file);
  const { error } = await supabase.from("moderation_evidence").insert({
    issue_id: issueId,
    uploaded_by: uploadedBy,
    bucket: MODERATION_BUCKET,
    file_path: path,
    file_name: file.name,
    file_type: file.type,
  });
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
