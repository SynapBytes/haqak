import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";

type CanonicalStatus = "submitted" | "under_review" | "assigned" | "in_progress" | "resolved" | "closed";

type TimelineEventDto = {
  status: CanonicalStatus;
  timestamp: string;
  actor: string;
  note: string | null;
};

const json = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

const ISSUE_STATUS_ALIASES: Record<string, CanonicalStatus> = {
  submitted: "submitted",
  created: "submitted",
  received: "under_review",
  under_review: "under_review",
  "under-review": "under_review",
  reviewing: "under_review",
  triaged: "under_review",
  assigned: "assigned",
  routed_to_mp: "assigned",
  routed: "assigned",
  assigned_to_mp: "assigned",
  "in-progress": "in_progress",
  in_progress: "in_progress",
  "in progress": "in_progress",
  processing: "in_progress",
  resolved: "resolved",
  done: "resolved",
  completed: "resolved",
  closed: "closed",
  archived: "closed",
};

const normalizeStatus = (rawStatus: string | null | undefined): CanonicalStatus | null => {
  if (!rawStatus) return null;
  const normalized = rawStatus.trim().toLowerCase().replace(/\s+/g, "_");
  return ISSUE_STATUS_ALIASES[normalized] ?? null;
};

const normalizeActionStatus = (actionType: string): CanonicalStatus | null => {
  const normalized = actionType.trim().toLowerCase();
  if (normalized.startsWith("status_change_to_")) {
    return normalizeStatus(normalized.slice("status_change_to_".length));
  }
  if (normalized.includes("assign")) return "assigned";
  if (normalized.includes("close")) return "closed";
  return null;
};

const resolveActor = (
  actorUserId: string | null | undefined,
  issueOwnerId: string,
  assignedMpId: string | null,
): "citizen" | "mp" | "system" => {
  if (actorUserId && actorUserId === issueOwnerId) return "citizen";
  if (actorUserId && assignedMpId && actorUserId === assignedMpId) return "mp";
  return "system";
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = buildCorsHeaders(origin, true);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, cors);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401, cors);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("complaint-timeline: missing supabase env");
    return json({ error: "server_unavailable" }, 503, cors);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const url = new URL(req.url);
  let issueId = url.searchParams.get("issueId") || url.searchParams.get("issue_id");

  if (!issueId && req.method === "POST") {
    try {
      const body = (await req.json()) as { issueId?: string; issue_id?: string };
      issueId = body.issueId || body.issue_id || null;
    } catch {
      issueId = null;
    }
  }

  if (!issueId) {
    return json({ error: "missing_issue_id" }, 400, cors);
  }

  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("id, user_id, assigned_mp_id, status, created_at, updated_at")
    .eq("id", issueId)
    .maybeSingle();

  if (issueError) {
    console.error("complaint-timeline: issue query failed", issueError);
    return json({ error: "query_failed" }, 500, cors);
  }

  if (!issue) {
    return json({ error: "not_found" }, 404, cors);
  }

  const [historyResult, actionsResult] = await Promise.all([
    supabase
      .from("issue_status_history")
      .select("new_status, changed_at, note, changed_by")
      .eq("issue_id", issueId)
      .order("changed_at", { ascending: true }),
    supabase
      .from("issue_actions")
      .select("action_type, created_at, note, user_id")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true }),
  ]);

  if (historyResult.error || actionsResult.error) {
    console.error("complaint-timeline: event queries failed", {
      historyError: historyResult.error,
      actionsError: actionsResult.error,
    });
    return json({ error: "query_failed" }, 500, cors);
  }

  const rawEvents: TimelineEventDto[] = [
    {
      status: "submitted",
      timestamp: issue.created_at,
      actor: "citizen",
      note: null,
    },
  ];

  for (const row of historyResult.data ?? []) {
    const status = normalizeStatus(row.new_status);
    if (!status) continue;
    rawEvents.push({
      status,
      timestamp: row.changed_at,
      actor: resolveActor(row.changed_by, issue.user_id, issue.assigned_mp_id),
      note: row.note,
    });
  }

  for (const row of actionsResult.data ?? []) {
    const status = normalizeActionStatus(row.action_type);
    if (!status) continue;
    rawEvents.push({
      status,
      timestamp: row.created_at,
      actor: resolveActor(row.user_id, issue.user_id, issue.assigned_mp_id),
      note: row.note,
    });
  }

  const fallbackStatus = normalizeStatus(issue.status);
  if (fallbackStatus) {
    rawEvents.push({
      status: fallbackStatus,
      timestamp: issue.updated_at,
      actor: issue.assigned_mp_id ? "mp" : "system",
      note: null,
    });
  }

  const deduped = new Map<string, TimelineEventDto>();
  for (const event of rawEvents) {
    const key = `${event.status}:${event.timestamp}`;
    if (!deduped.has(key)) deduped.set(key, event);
  }

  const events = Array.from(deduped.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return json(
    {
      issueId,
      events,
    },
    200,
    cors,
  );
});
