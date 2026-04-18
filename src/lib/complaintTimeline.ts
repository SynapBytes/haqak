import { supabase } from "@/integrations/supabase/client";
import {
  ComplaintTimelineEventSchema,
  ComplaintTimelineResponseSchema,
  type ComplaintTimelineEvent,
} from "@/lib/schemas/boundary";

export const CANONICAL_TIMELINE_STATUSES = [
  "submitted",
  "under_review",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
] as const;

export type ComplaintTimelineStatus = (typeof CANONICAL_TIMELINE_STATUSES)[number];

const STATUS_ALIAS_MAP: Record<string, ComplaintTimelineStatus> = {
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

export const normalizeComplaintTimelineStatus = (rawStatus: string | null | undefined): ComplaintTimelineStatus | null => {
  if (!rawStatus) return null;
  const normalized = rawStatus.trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_ALIAS_MAP[normalized] ?? null;
};

type FetchTimelineResult = {
  events: ComplaintTimelineEvent[];
  isPartial: boolean;
};

export const fetchComplaintTimeline = async (issueId: string): Promise<FetchTimelineResult> => {
  const { data, error } = await supabase.functions.invoke("complaint-timeline", {
    body: { issueId },
  });

  if (error) throw error;

  const parsed = ComplaintTimelineResponseSchema.parse(data);
  const events = parsed.events
    .map((event) => ComplaintTimelineEventSchema.parse(event))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const seen = new Set(events.map((event) => event.status));
  const isPartial = CANONICAL_TIMELINE_STATUSES.some((status) => !seen.has(status));

  return { events, isPartial };
};

