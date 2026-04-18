import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Support from "./Support";

const mockLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [{ name: "كريم" }] }));
const mockChain = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: mockLimit,
}));
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => {
  mockFrom.mockReturnValue(mockChain);
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

vi.mock("@/components/AppHeader", () => ({
  default: () => <div data-testid="app-header" />,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ar" },
  }),
}));

describe("Support page", () => {
  it("fetches contributors on mount and renders their names", async () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("contributions"));
    expect(mockChain.limit).toHaveBeenCalledWith(20);

    await waitFor(() => expect(screen.getByText("كريم")).toBeInTheDocument());
  });

  it("uses a valid in-page anchor for transparency charter navigation", async () => {
    const { container } = render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>
    );
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("contributions"));

    const transparencyLinks = screen.getAllByRole("link", { name: "contribute.transparency" });
    expect(transparencyLinks.some((link) => link.getAttribute("href")?.includes("#transparency-charter"))).toBe(true);
    expect(container.querySelector("#transparency-charter")).toBeInTheDocument();
  });
});
