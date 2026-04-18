import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import CitizenComplaintTimeline from "@/components/CitizenComplaintTimeline";
import { fetchComplaintTimeline } from "@/lib/complaintTimeline";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/lib/complaintTimeline", async () => {
  const actual = await vi.importActual<typeof import("@/lib/complaintTimeline")>("@/lib/complaintTimeline");
  return {
    ...actual,
    fetchComplaintTimeline: vi.fn(),
  };
});

const renderTimeline = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CitizenComplaintTimeline issue={{ id: "1f44a85d-5eb6-4752-ad65-f6f9873d2a67", status: "received", title: "Issue" }} />
    </QueryClientProvider>,
  );
};

describe("CitizenComplaintTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    vi.mocked(fetchComplaintTimeline).mockImplementation(() => new Promise(() => {}));

    renderTimeline();

    expect(screen.getByText("dashboard.timeline_loading")).toBeInTheDocument();
  });

  it("renders empty state when no events are returned", async () => {
    vi.mocked(fetchComplaintTimeline).mockResolvedValue({ events: [], isPartial: true });

    renderTimeline();

    await waitFor(() => {
      expect(screen.getByText("dashboard.timeline_no_events")).toBeInTheDocument();
    });
  });

  it("renders partial timeline hint for incomplete lifecycle", async () => {
    vi.mocked(fetchComplaintTimeline).mockResolvedValue({
      events: [
        { status: "submitted", timestamp: "2026-04-18T09:00:00.000Z", actor: "citizen", note: null },
        { status: "under_review", timestamp: "2026-04-18T09:30:00.000Z", actor: "system", note: null },
      ],
      isPartial: true,
    });

    renderTimeline();

    await waitFor(() => {
      expect(screen.getByText("dashboard.timeline_partial_hint")).toBeInTheDocument();
      expect(screen.getAllByText("dashboard.timeline_submitted").length).toBeGreaterThan(0);
    });
  });

  it("renders error state when request fails", async () => {
    vi.mocked(fetchComplaintTimeline).mockRejectedValue(new Error("network"));

    renderTimeline();

    await waitFor(() => {
      expect(screen.getByText("dashboard.timeline_error_title")).toBeInTheDocument();
      expect(screen.getByText("dashboard.timeline_retry")).toBeInTheDocument();
    });
  });
});

