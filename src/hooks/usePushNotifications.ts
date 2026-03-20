import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPush } from "@/lib/webPush";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;

    const register = async () => {
      const sub = await subscribeToPush();
      if (!sub) return;

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,endpoint" }
        );

      if (error) {
        console.error("Failed to save push subscription:", error);
      } else {
        registered.current = true;
        console.log("Push subscription registered successfully");
      }
    };

    register();
  }, [user]);
}
