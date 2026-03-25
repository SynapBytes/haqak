import { supabase } from "@/integrations/supabase/client";

/**
 * Verify CAPTCHA token with the server
 * @param token - The CAPTCHA token from Turnstile
 * @returns Promise with verification result
 */
export async function verifyCaptchaToken(token: string): Promise<{
  valid: boolean;
  error?: string;
  score?: number;
}> {
  if (!token) {
    return {
      valid: false,
      error: "CAPTCHA token is required",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("verify-captcha", {
      body: { token },
    });

    if (error) {
      console.error("CAPTCHA verification error:", error);
      return {
        valid: false,
        error: "Failed to verify CAPTCHA",
      };
    }

    return {
      valid: data?.valid || false,
      error: data?.error,
      score: data?.score,
    };
  } catch (err) {
    console.error("CAPTCHA verification exception:", err);
    return {
      valid: false,
      error: "CAPTCHA verification failed",
    };
  }
}

/**
 * Check if CAPTCHA is required based on user's submission history
 * @param userId - The user ID
 * @returns Promise with boolean indicating if CAPTCHA is required
 */
export async function isCaptchaRequired(userId: string): Promise<boolean> {
  try {
    // Get recent failed submissions
    const { data: recentFailures } = await supabase
      .from("submission_attempts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "rejected")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    // Require CAPTCHA if user has had recent rejections
    return (recentFailures?.length ?? 0) > 0;
  } catch (err) {
    console.error("Error checking CAPTCHA requirement:", err);
    // Default to requiring CAPTCHA on error
    return true;
  }
}
