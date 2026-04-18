import { supabase } from "@/integrations/supabase/client";
import { CSRF_HEADER, getOrCreateToken } from "@/lib/csrfToken";

type NotificationEvent =
  | "issue_submitted"
  | "issue_assigned"
  | "status_changed"
  | "admin_decision"
  | "moderation_update"
  | "poll_published"
  | "announcement_published"
  | "renomination_approved"
  | "renomination_request_submitted"
  | "project_refund_threshold_met";

type NotificationRoleTarget = "citizen" | "mp" | "admin";

interface DispatchOptions {
  recipients?: string[];
  issueId?: string;
  event: NotificationEvent;
  status?: string;
  actorName?: string;
  message?: string;
  reason?: string;
  channels?: ("email" | "sms" | "push")[];
  target?: {
    roles?: NotificationRoleTarget[];
    center_id?: string;
    user_ids?: string[];
    all_users?: boolean;
    verified_only?: boolean;
  };
  title?: string;
  body?: string;
  data_json?: Record<string, unknown>;
  csrfToken?: string;
}

export async function dispatchNotification(options: DispatchOptions) {
  const targets = options.recipients?.join(",") || options.target?.roles?.join(",") || "no recipients";
  try {
    const { error } = await supabase.functions.invoke("dispatch-notification", {
      body: options,
      headers: {
        [CSRF_HEADER]: options.csrfToken ?? getOrCreateToken(),
      },
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
