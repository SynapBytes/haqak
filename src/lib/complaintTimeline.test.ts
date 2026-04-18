import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchComplaintTimeline, normalizeComplaintTimelineStatus } from "@/lib/complaintTimeline";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("complaintTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes known status aliases to canonical statuses", () => {
    expect(normalizeComplaintTimelineStatus("received")).toBe("under_review");
    expect(normalizeComplaintTimelineStatus("in-progress")).toBe("in_progress");
    expect(normalizeComplaintTimelineStatus("resolved")).toBe("resolved");
    expect(normalizeComplaintTimelineStatus("closed")).toBe("closed");
    expect(normalizeComplaintTimelineStatus("unknown")).toBeNull();
  });

  it("parses and sorts timeline endpoint response", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        issueId: "e4facf2c-7e66-4f34-8c30-5576dc4ce6f2",
        events: [
          {
            status: "resolved",
            timestamp: "2026-04-18T10:01:00.000Z",
            actor: "mp",
            note: null,
          },
          {
            status: "submitted",
            timestamp: "2026-04-18T09:00:00.000Z",
            actor: "citizen",
            note: null,
          },
        ],
      },
      error: null,
    });

    const result = await fetchComplaintTimeline("e4facf2c-7e66-4f34-8c30-5576dc4ce6f2");

    expect(result.events[0]?.status).toBe("submitted");
    expect(result.events[1]?.status).toBe("resolved");
    expect(result.isPartial).toBe(true);
  });

  it("throws when endpoint contract is invalid", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { issueId: "not-a-uuid", events: [] },
      error: null,
    });

    await expect(fetchComplaintTimeline("e4facf2c-7e66-4f34-8c30-5576dc4ce6f2")).rejects.toThrow();
  });
});

