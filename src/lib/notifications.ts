import { supabase } from "@/integrations/supabase/client";

type NotificationEvent =
  | "issue_submitted"
  | "issue_assigned"
  | "status_changed"
  | "admin_decision"
  | "moderation_update";

interface DispatchOptions {
  recipients: string[];
  issueId?: string;
  event: NotificationEvent;
  status?: string;
  actorName?: string;
  message?: string;
  reason?: string;
  channels?: ("email" | "sms" | "push")[];
}

export async function dispatchNotification(options: DispatchOptions) {
  const targets = options.recipients.join(",") || "no recipients";
  try {
    const { error } = await supabase.functions.invoke("dispatch-notification", {
      body: options,
    });
    if (error) {
      console.error(
        `Failed to dispatch notification (${options.event} -> ${targets})`,
        error,
      );
      return { ok: false, error };
    }
    return { ok: true };
  } catch (error) {
    console.error(
      `Failed to dispatch notification (${options.event} -> ${targets})`,
      error,
    );
    return { ok: false, error };
  }
}
