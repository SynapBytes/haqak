import { supabase } from "@/integrations/supabase/client";

/**
 * Send a push notification to a user via FCM edge function.
 * Fails silently — logs errors but doesn't throw.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const { error } = await supabase.functions.invoke("send-push-notification", {
      body: { user_id: userId, title, body, data },
    });
    if (error) {
      console.error("Push notification error:", error);
    }
  } catch (err) {
    console.error("Failed to send push notification:", err);
  }
}
