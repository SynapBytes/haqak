import {
  ALLOWED_FILE_TYPES,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
} from "@/constants/uploadConstraints";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_MIME_SET = new Set([
  "application/pdf",
  "image/jpeg", // covers .jpg and .jpeg
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const getExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  const ext = parts.pop()?.toLowerCase() ?? "";
  return ext;
};

const isAllowedExtension = (file: File): boolean => {
  const ext = getExtension(file.name);
  if (!ext) return false;
  return ALLOWED_FILE_TYPES.some((allowed) => allowed === ext);
};

const isAllowedMime = (file: File): boolean => {
  if (!file.type) return false;
  return ALLOWED_MIME_SET.has(file.type);
};

const isFileTypeAllowed = (file: File): boolean =>
  isAllowedExtension(file) && isAllowedMime(file);

const ALLOWED_EXT_TEXT = ALLOWED_FILE_TYPES.map((ext) => ext.toUpperCase()).join(", ");

const exceedsMaxSize = (file: File): boolean => file.size > MAX_FILE_SIZE_BYTES;

/**
 * Validate a set of files against size, count, and type constraints.
 */
export function validateNewFiles(
  currentFiles: File[],
  incomingFiles: File[],
): FileValidationResult {
  if (incomingFiles.length === 0) return { valid: true };

  const combinedCount = currentFiles.length + incomingFiles.length;
  if (combinedCount > MAX_FILES_PER_UPLOAD) {
    return {
      valid: false,
      error: `Maximum ${MAX_FILES_PER_UPLOAD} files are allowed per upload.`,
    };
  }

  for (const file of incomingFiles) {
    if (!isFileTypeAllowed(file)) {
      return {
        valid: false,
        error: `Only ${ALLOWED_EXT_TEXT} files are allowed.`,
      };
    }

    if (exceedsMaxSize(file)) {
      return {
        valid: false,
        error: `Each file must be smaller than ${Math.floor(
          MAX_FILE_SIZE_BYTES / (1024 * 1024),
        )}MB.`,
      };
    }
  }

  const totalSize = [...currentFiles, ...incomingFiles].reduce(
    (acc, file) => acc + file.size,
    0,
  );

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return {
      valid: false,
      error: `Total upload size must be under ${Math.floor(
        MAX_TOTAL_SIZE_BYTES / (1024 * 1024),
      )}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Validate files before upload (defensive check).
 */
export function validateBeforeUpload(files: File[]): FileValidationResult {
  if (files.length === 0) return { valid: true };

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { valid: false, error: "Too many files in this upload batch." };
  }

  for (const file of files) {
    if (!isFileTypeAllowed(file)) {
      return {
        valid: false,
        error: `Only ${ALLOWED_EXT_TEXT} files are allowed.`,
      };
    }
    if (exceedsMaxSize(file)) {
      return { valid: false, error: "File size exceeds the allowed maximum." };
    }
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return { valid: false, error: "Total upload size exceeds the limit." };
  }

  return { valid: true };
}
