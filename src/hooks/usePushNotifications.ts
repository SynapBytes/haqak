import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getFCMToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;

    const register = async () => {
      const token = await getFCMToken();
      if (!token) return;

      // Upsert token
      const { error } = await supabase
        .from("fcm_tokens" as any)
        .upsert(
          { user_id: user.id, token, updated_at: new Date().toISOString() },
          { onConflict: "user_id,token" }
        );

      if (error) {
        console.error("Failed to save FCM token:", error);
      } else {
        registered.current = true;
        console.log("FCM token registered successfully");
      }
    };

    register();
  }, [user]);

  // Foreground notifications
  useEffect(() => {
    if (!user) return;

    onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        toast(title, { description: body });
      }
    });
  }, [user]);
}
