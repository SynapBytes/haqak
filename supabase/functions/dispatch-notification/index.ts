import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildParticipantSet } from "../shared/access-control.ts";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";

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

type DeliveryChannel = "inapp" | "sms" | "email";
type RoleTarget = "citizen" | "mp" | "admin";
type LegacyChannel = "email" | "sms" | "push";

interface DispatchRequest {
  recipients?: string[];
  issueId?: string;
  event: NotificationEvent;
  status?: string;
  actorName?: string;
  message?: string;
  reason?: string;
  channels?: LegacyChannel[];
  target?: {
    roles?: RoleTarget[];
    center_id?: string;
    user_ids?: string[];
    all_users?: boolean;
    verified_only?: boolean;
  };
  title?: string;
  body?: string;
  data_json?: Record<string, unknown>;
}

interface NotificationContent {
  title: string;
  body: string;
}

interface RecipientProfile {
  user_id: string;
  phone: string | null;
  contact_phone: string | null;
  center_id: string | null;
  email: string | null;
  email_verified: boolean;
  phone_verified: boolean;
}

interface RecipientRoleRow {
  user_id: string;
  role: RoleTarget | "moderator";
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_EVENTS = new Set<NotificationEvent>([
  "issue_submitted",
  "issue_assigned",
  "status_changed",
  "admin_decision",
  "moderation_update",
  "poll_published",
  "announcement_published",
  "renomination_approved",
  "renomination_request_submitted",
  "project_refund_threshold_met",
]);
const ALLOWED_LEGACY_CHANNELS = new Set<LegacyChannel>(["email", "push"]);
const MAX_RECIPIENTS = 300;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "team@haqak.org";

function buildContent(payload: DispatchRequest, issueTitle?: string): NotificationContent {
  if (payload.title && payload.body) {
    return { title: payload.title, body: payload.body };
  }

  const { event, status, actorName, reason, message } = payload;
  switch (event) {
    case "issue_submitted":
      return {
        title: "تم استلام الشكوى",
        body: issueTitle ? `تم استلام شكوى جديدة: ${issueTitle}` : "تم استلام شكواك وسيتم معالجتها.",
      };
    case "issue_assigned":
      return {
        title: "تم إحالة شكوى جديدة",
        body: issueTitle
          ? `${actorName || "مواطن"} أحال الشكوى "${issueTitle}" إليك للمتابعة`
          : "تم إحالة شكوى جديدة للمتابعة.",
      };
    case "status_changed":
      return {
        title: status ? `تحديث حالة الشكوى: ${status}` : "تحديث حالة الشكوى",
        body: issueTitle ? `تم تحديث حالة "${issueTitle}" إلى ${status || "حالة جديدة"}.` : "تم تحديث حالة الشكوى.",
      };
    case "admin_decision":
      return {
        title: reason === "rejected" ? "تم رفض طلبك" : "تمت الموافقة على حسابك",
        body:
          reason === "rejected"
            ? "تم رفض الطلب. يرجى تحديث بياناتك وإعادة التقديم."
            : "تمت الموافقة على حسابك. يمكنك الآن متابعة الصلاحيات الجديدة.",
      };
    case "moderation_update":
      return {
        title: "تحديث إشرافي",
        body: message || "هناك تحديث إشرافي يتعلق بطلبك أو محتواك.",
      };
    case "poll_published":
      return {
        title: "استطلاع جديد من النائب",
        body: message || "تم نشر استطلاع جديد في دائرتك. شارك برأيك الآن.",
      };
    case "announcement_published":
      return {
        title: "إعلان جديد في دائرتك",
        body: message || "نشر النائب إعلانًا/فعالية جديدة في دائرتك.",
      };
    case "renomination_approved":
      return {
        title: "إخطار رسمي من الإدارة",
        body: message || "اعتمدت الإدارة طلب إعادة الترشح الخاص بالنائب في دائرتكم.",
      };
    case "renomination_request_submitted":
      return {
        title: "طلب إعادة ترشح جديد",
        body: message || "تم استلام طلب إعادة ترشح جديد من نائب.",
      };
    case "project_refund_threshold_met":
      return {
        title: "إلغاء مشروع وبدء الاسترداد",
        body: message || "تم بلوغ حد الاسترداد (51%) وسيتم تنفيذ الاسترداد يدوياً بواسطة الإدارة.",
      };
    default:
      return { title: "إشعار جديد", body: message || "لديك إشعار جديد." };
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<{
  status: "sent" | "failed" | "skipped";
  provider_message_id?: string;
  error?: string;
}> {
  if (!RESEND_API_KEY) return { status: "skipped", error: "RESEND_API_KEY missing" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      return { status: "failed", error: await res.text() };
    }
    const parsed = await res.json().catch(() => ({} as Record<string, unknown>));
    const id = typeof parsed?.id === "string" ? parsed.id : undefined;
    return { status: "sent", provider_message_id: id };
  } catch (error) {
    return { status: "failed", error: String(error) };
  }
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const csrfError = requireCsrfToken(req, cors);
    if (csrfError) return csrfError;

    const body = (await req.json()) as DispatchRequest;
    if (!body.event || !ALLOWED_EVENTS.has(body.event)) {
      return new Response(JSON.stringify({ error: "Invalid event" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (body.issueId && !UUID_REGEX.test(body.issueId)) {
      return new Response(JSON.stringify({ error: "Invalid issueId" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (
      body.channels &&
      (!Array.isArray(body.channels) ||
        body.channels.length === 0 ||
        body.channels.some((ch) => !ALLOWED_LEGACY_CHANNELS.has(ch)))
    ) {
      return new Response(JSON.stringify({ error: "Invalid channels" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const clientIp =
      req.headers.get("CF-Connecting-IP") ??
      req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
      "0.0.0.0";

    try {
      await rateLimiter(supabase, user.id, "/dispatch-notification", clientIp, 200, {
        maxRequests: 40,
        windowMinutes: 10,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({
          error: error.reason === "storage_error"
            ? "Rate limiting is temporarily unavailable. Please retry shortly."
            : "Too many requests",
        }), {
          status: error.reason === "storage_error" ? 503 : 429,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Retry-After": String(error.retryAfterSeconds),
          },
        });
      }
      throw error;
    }

    const { data: actorRoleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator", "mp"]);
    const actorRoles = new Set((actorRoleRows ?? []).map((r) => r.role));
    const isAdmin = actorRoles.has("admin");
    const isModerator = actorRoles.has("moderator");
    const isMp = actorRoles.has("mp");

    let issueTitle: string | undefined;
    let issueUserId: string | null = null;
    let issueAssignedMpId: string | null = null;
    if (body.issueId) {
      const { data: issueData, error: issueError } = await supabase
        .from("issues")
        .select("id, title, user_id, assigned_mp_id")
        .eq("id", body.issueId)
        .single();
      if (issueError || !issueData) {
        return new Response(JSON.stringify({ error: "Issue not found" }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      issueTitle = issueData.title;
      issueUserId = issueData.user_id;
      issueAssignedMpId = issueData.assigned_mp_id;
      const issueParticipants = buildParticipantSet(issueData.user_id, issueData.assigned_mp_id);
      if (!isAdmin && !isModerator && !issueParticipants.has(user.id)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    } else if (!isAdmin && !isModerator) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const recipientSet = new Set<string>();
    (body.recipients ?? []).forEach((id) => {
      if (typeof id === "string" && UUID_REGEX.test(id)) recipientSet.add(id);
    });
    (body.target?.user_ids ?? []).forEach((id) => {
      if (typeof id === "string" && UUID_REGEX.test(id)) recipientSet.add(id);
    });

    if (body.target?.all_users) {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can target all users" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: allProfiles } = await supabase.from("profiles").select("user_id");
      (allProfiles ?? []).forEach((p) => recipientSet.add(p.user_id));
    }

    if (body.target?.roles?.length || body.target?.center_id) {
      const isCenterRoleBroadcast = !!body.target?.center_id && (body.target?.roles?.length ?? 0) > 0;
      const isVerifiedOnly = body.target?.verified_only ?? false;

      if (!isAdmin && !isModerator) {
        const allowVerifiedMpCenterBroadcast =
          isMp &&
          isCenterRoleBroadcast &&
          isVerifiedOnly &&
          body.target?.roles?.length === 1 &&
          body.target.roles[0] === "citizen";

        if (!allowVerifiedMpCenterBroadcast) {
          return new Response(JSON.stringify({ error: "Role/center targeting requires admin or moderator" }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        const { data: mpProfile } = await supabase
          .from("profiles")
          .select("center_id, verification_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mpProfile || mpProfile.verification_status !== "verified") {
          return new Response(JSON.stringify({ error: "Verified MP required" }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        if (mpProfile.center_id !== body.target?.center_id) {
          return new Response(JSON.stringify({ error: "MP can target only own center" }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      }

      const targetRoles = (body.target?.roles ?? []).filter(
        (role): role is RoleTarget => role === "citizen" || role === "mp" || role === "admin",
      );
      let roleUsers: string[] = [];
      if (targetRoles.length > 0) {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", targetRoles);
        roleUsers = ((roleRows ?? []) as RecipientRoleRow[]).map((r) => r.user_id);
      }

      if (targetRoles.length > 0 && body.target?.center_id) {
        let centerQuery = supabase
          .from("profiles")
          .select("user_id")
          .eq("center_id", body.target.center_id);
        if (isVerifiedOnly) {
          centerQuery = centerQuery.eq("verification_status", "verified");
        }
        const { data: centerProfiles } = await centerQuery;
        const centerSet = new Set((centerProfiles ?? []).map((p) => p.user_id));
        roleUsers.forEach((id) => {
          if (centerSet.has(id)) recipientSet.add(id);
        });
      } else if (targetRoles.length > 0) {
        roleUsers.forEach((id) => recipientSet.add(id));
      } else if (body.target?.center_id) {
        let centerQuery = supabase
          .from("profiles")
          .select("user_id")
          .eq("center_id", body.target.center_id);
        if (isVerifiedOnly) {
          centerQuery = centerQuery.eq("verification_status", "verified");
        }
        const { data: centerProfiles } = await centerQuery;
        (centerProfiles ?? []).forEach((p) => recipientSet.add(p.user_id));
      }
    }

    const recipients = Array.from(recipientSet);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients resolved" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return new Response(JSON.stringify({ error: `Too many recipients (max ${MAX_RECIPIENTS})` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (isMp && !isAdmin && !isModerator) {
      if (!body.issueId || !issueUserId || issueAssignedMpId !== user.id) {
        return new Response(JSON.stringify({ error: "MP dispatch requires an issue assigned to the MP" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const disallowed = recipients.some((recipientId) => recipientId !== issueUserId);
      if (disallowed) {
        return new Response(JSON.stringify({ error: "MP can only notify assigned issue participants" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const content = buildContent(body, issueTitle);
    const dataJson = {
      ...(body.data_json ?? {}),
      event: body.event,
      issue_id: body.issueId ?? null,
      actor_id: user.id,
      actor_name: body.actorName ?? null,
    };

    const enabledLegacy = new Set(body.channels ?? ["email"]);
    const allowEmail = enabledLegacy.has("email");

    const { data: recipientProfilesRaw } = await supabase
      .from("profiles")
      .select("user_id, phone, contact_phone, center_id, email, email_verified, phone_verified")
      .in("user_id", recipients);
    const recipientProfiles = (recipientProfilesRaw ?? []) as RecipientProfile[];
    const profileByUser = new Map(recipientProfiles.map((p) => [p.user_id, p]));

    const { data: recipientPrefsRaw } = await supabase
      .from("notification_preferences")
      .select("user_id, sms_opt_in, email_opt_in, inapp_opt_in")
      .in("user_id", recipients);
    const prefsByUser = new Map(
      (recipientPrefsRaw ?? []).map((p) => [
        p.user_id,
        {
          sms_opt_in: p.sms_opt_in ?? true,
          email_opt_in: p.email_opt_in ?? true,
          inapp_opt_in: p.inapp_opt_in ?? true,
        },
      ]),
    );

    const hourSlot = Math.floor(Date.now() / 3_600_000);
    const results: Record<string, unknown> = {};
    let deliveredCount = 0;

    for (const recipient of recipients) {
      const pref = prefsByUser.get(recipient) ?? {
        sms_opt_in: true,
        email_opt_in: true,
        inapp_opt_in: true,
      };

      if (!pref.inapp_opt_in) {
        results[recipient] = { skipped: true, reason: "inapp_opt_out" };
        continue;
      }

      const dedupKey = `${body.event}:${recipient}:${body.issueId ?? ""}:${hourSlot}`;
      const { data: notif, error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: recipient,
          target_user_id: recipient,
          title: content.title,
          message: content.body,
          body: content.body,
          issue_id: body.issueId,
          data_json: dataJson,
          dedup_key: dedupKey,
        })
        .select("id")
        .maybeSingle();

      if (notifError) {
        if (notifError.code === "23505") {
          results[recipient] = { skipped: true, reason: "duplicate_in_window" };
          continue;
        }
        results[recipient] = { sent: false, error: notifError.message };
        continue;
      }

      const notificationId = notif?.id;
      if (!notificationId) {
        results[recipient] = { sent: false, error: "notification_insert_failed" };
        continue;
      }

      deliveredCount += 1;
      await supabase.from("notification_deliveries").insert({
        notification_id: notificationId,
        channel: "inapp",
        status: "sent",
      });

      const recipientProfile = profileByUser.get(recipient);
      const recipientOutcome: Record<DeliveryChannel, unknown> = {
        inapp: { status: "sent" },
        sms: { status: "skipped", reason: "not_requested" },
        email: { status: "skipped", reason: "not_requested" },
      };

      if (allowEmail) {
        if (!pref.email_opt_in) {
          recipientOutcome.email = { status: "skipped", reason: "email_opt_out" };
        } else if (!recipientProfile?.email_verified) {
          recipientOutcome.email = { status: "skipped", reason: "email_not_verified" };
        } else if (!recipientProfile.email) {
          recipientOutcome.email = { status: "skipped", reason: "missing_email" };
        } else {
          const emailResult = await sendEmail(recipientProfile.email, content.title, content.body);
          recipientOutcome.email = emailResult;
          await supabase.from("notification_deliveries").insert({
            notification_id: notificationId,
            channel: "email",
            status: emailResult.status,
            provider_message_id: emailResult.provider_message_id ?? null,
            error: emailResult.error ?? null,
          });
        }
      }

      results[recipient] = recipientOutcome;
    }

    const actorCenterRow = await supabase
      .from("profiles")
      .select("center_id")
      .eq("user_id", user.id)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "dispatch_notification",
      entity_type: "notification",
      status: "success",
      context: {
        event: body.event,
        issue_id: body.issueId ?? null,
        recipient_count: recipients.length,
        delivered_count: deliveredCount,
        target_center_id: body.target?.center_id ?? null,
        actor_center_id: actorCenterRow.data?.center_id ?? null,
        target_roles: body.target?.roles ?? null,
        all_users: body.target?.all_users ?? false,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipients: recipients.length,
        delivered_inapp: deliveredCount,
        results,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Dispatch error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
