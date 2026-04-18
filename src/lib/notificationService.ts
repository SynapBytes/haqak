import { APP_CONFIG } from "@/lib/config";
import { dispatchNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/pushNotifications";

export type NotificationChannel = "push" | "sms";

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

export interface SmsProvider {
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

/**
 * TODO: replace stub with an external SMS provider adapter.
 * Required contract:
 * - POST /notifications/sms
 * - body: { recipientId, title, body, issueId?, status? }
 * - auth: server-side secret only
 */
class SmsProviderStub implements SmsProvider {
  async send(payload: NotificationPayload) {
    await dispatchNotification({
      event: "status_changed",
      recipients: [payload.recipientId],
      title: payload.title,
      body: payload.body,
      issueId: payload.issueId,
      status: payload.status,
      channels: ["sms"],
    });
  }
}

export const notificationService = {
  push: new WebPushProvider(),
  sms: new SmsProviderStub(),
  isEnabled: APP_CONFIG.FEATURES.ENABLE_NOTIFICATIONS_V2,
};
