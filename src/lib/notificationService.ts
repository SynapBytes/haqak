import { APP_CONFIG } from "@/lib/config";
import { sendPushToUser } from "@/lib/pushNotifications";

export type NotificationChannel = "push";

export type NotificationPayload = {
  recipientId: string;
  title: string;
  body: string;
  issueId?: string;
  status?: string;
};

export interface PushProvider {
  send(payload: NotificationPayload): Promise<void>;
}

class WebPushProvider implements PushProvider {
  async send(payload: NotificationPayload) {
    await sendPushToUser(payload.recipientId, payload.title, payload.body, {
      issue_id: payload.issueId || "",
      status: payload.status || "",
    });
  }
}

export const notificationService = {
  push: new WebPushProvider(),
  isEnabled: APP_CONFIG.FEATURES.ENABLE_NOTIFICATIONS_V2,
};
