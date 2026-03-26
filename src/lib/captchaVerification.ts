import { supabase } from "@/integrations/supabase/client";

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
      console.error("CAPTCHA verification error:", error);
      return { valid: false, error: "Failed to verify CAPTCHA" };
    }

    return {
      valid: data?.valid || false,
      error: data?.error,
      score: data?.score,
    };
  } catch (err) {
    console.error("CAPTCHA verification exception:", err);
    return { valid: false, error: "CAPTCHA verification failed" };
  }
}

/**
 * Check if CAPTCHA is required (always true for now as submission_attempts table doesn't exist)
 */
export async function isCaptchaRequired(_userId: string): Promise<boolean> {
  return true;
}
