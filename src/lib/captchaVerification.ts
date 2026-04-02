import { supabase } from "@/integrations/supabase/client";
import { parseCaptchaResponse } from "@/lib/boundaryAdapters";
import { handleClientError } from "@/lib/errors";

/**
 * Verify CAPTCHA token with the server
 */
export async function verifyCaptchaToken(token: string): Promise<{
  valid: boolean;
  error?: string;
  score?: number;
}> {
  if (!token) {
    return { valid: false, error: "CAPTCHA token is required" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("verify-captcha", {
      body: { token },
    });

    if (error) {
      handleClientError(
        { code: "captcha.verify.invoke_failed", message: "Failed to verify CAPTCHA", retryable: true },
        error,
        { showToast: false, extras: { boundary: "verify-captcha.invoke" } },
      );
      return { valid: false, error: "Failed to verify CAPTCHA" };
    }

    const parsed = parseCaptchaResponse(data);
    return parsed;
  } catch (err) {
    handleClientError(
      { code: "captcha.verify.exception", message: "CAPTCHA verification failed", retryable: true },
      err,
      { showToast: false, extras: { boundary: "verify-captcha.catch" } },
    );
    return { valid: false, error: "CAPTCHA verification failed" };
  }
}

/**
 * Check if CAPTCHA is required (always true for now as submission_attempts table doesn't exist)
 */
export async function isCaptchaRequired(_userId: string): Promise<boolean> {
  return true;
}
