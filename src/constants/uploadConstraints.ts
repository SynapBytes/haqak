export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_UPLOAD = 5;
export const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024; // 50MB (intentional hard cap matching 5 files * 10MB each)

export const ALLOWED_FILE_TYPES = ["pdf", "jpg", "jpeg", "png", "doc", "docx"] as const;

export type AllowedFileExtension = (typeof ALLOWED_FILE_TYPES)[number];
