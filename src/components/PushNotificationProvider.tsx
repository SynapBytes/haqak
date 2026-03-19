import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";

/** Drop this component inside AuthProvider to auto-register push notifications */
const PushNotificationProvider = () => {
  usePushNotifications();
  return null;
};

export default PushNotificationProvider;
