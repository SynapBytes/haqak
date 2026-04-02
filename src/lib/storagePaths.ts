const hasTraversal = (value: string) => value.includes("..");
const FILE_EXTENSION_PATTERN = /\.[^/.]+$/;

export const sanitizeFileName = (fileName: string) => {
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

export const assertSafeSegment = (value: string, label: string) => {
  if (!value || value.includes("..") || value.includes("/") || value.includes("\\")) {
    throw new Error(`Invalid ${label}`);
  }
};

export const uniqueKey = () => {
  if (typeof crypto !== "undefined") {
    if ("randomUUID" in crypto) {
      return `${Date.now()}-${crypto.randomUUID()}`;
    }
    const buffer = new Uint32Array(2);
    (crypto as Crypto).getRandomValues(buffer);
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

export const buildIdentityVerificationPath = (
  userId: string,
  verificationId: string,
  side: "front" | "back",
  originalName: string,
) => {
  assertSafeSegment(userId, "user id");
  assertSafeSegment(verificationId, "verification id");
  const safe = sanitizeFileName(originalName);
  const ext = resolveExtension(safe, "jpg");
  const base = safe.replace(FILE_EXTENSION_PATTERN, "") || `id-${side}`;
  const path = `${userId}/${verificationId}/${side}-${uniqueKey()}-${base}.${ext}`;
  if (hasTraversal(path)) throw new Error("Invalid path");
  return path;
};

export const buildMpPublicImagePath = (userId: string, originalName: string) => {
  assertSafeSegment(userId, "user id");
  const safe = sanitizeFileName(originalName);
  const ext = resolveExtension(safe, "jpg");
  const base = safe.replace(FILE_EXTENSION_PATTERN, "") || "mp-public";
  const path = `${userId}/${uniqueKey()}-${base}.${ext}`;
  if (hasTraversal(path)) throw new Error("Invalid path");
  return path;
};
