/**
 * Central input sanitization utility using DOMPurify.
 * Strips all HTML tags and attributes, returning plain text only.
 */
import DOMPurify from "dompurify";

/**
 * Sanitizes a string by stripping ALL HTML tags and attributes.
 * Returns plain text only - safe for database insertion.
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  // Strip all HTML, returning only text content
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Sanitizes multiple fields in an object.
 * Only sanitizes string values.
 */
export function sanitizeFields<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === "string") {
      (sanitized as Record<string, unknown>)[key] = sanitizeText(sanitized[key] as string);
    }
  }
  return sanitized;
}
