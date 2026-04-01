import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  AVAILABLE_CATEGORIES,
  BusinessCategorySelector,
  MAX_CATEGORIES,
  resolvePrimaryAfterAdd,
  resolvePrimaryAfterRemoval,
} from "./BusinessCategorySelector";

beforeAll(() => {
  // Polyfill ResizeObserver for Radix ScrollArea in jsdom
  // @ts-ignore - jsdom global assignment for tests
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("BusinessCategorySelector helpers", () => {
  it("assigns the first picked category as primary when none exists", () => {
    expect(resolvePrimaryAfterAdd(null, "alpha")).toBe("alpha");
    expect(resolvePrimaryAfterAdd("alpha", "beta")).toBe("alpha");
  });

  it("promotes the next category when primary is removed", () => {
    const sample = AVAILABLE_CATEGORIES.slice(0, 3);
    const updated = resolvePrimaryAfterRemoval(sample, sample[0].id);
    expect(updated).toBe(sample[0].id);

    const afterRemoval = resolvePrimaryAfterRemoval(sample.slice(1), sample[0].id);
    expect(afterRemoval).toBe(sample[1].id);

    const emptyRemoval = resolvePrimaryAfterRemoval([], sample[0].id);
    expect(emptyRemoval).toBeNull();
  });
});

describe("BusinessCategorySelector component", () => {
  it("renders with seeded categories and highlights primary", () => {
    render(<BusinessCategorySelector />);
    expect(screen.getAllByText(/Civic center/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("الفئة الأساسية")).toBeInTheDocument();
  });

  it("promotes the next category when the primary chip is removed", async () => {
    render(<BusinessCategorySelector />);
    const user = userEvent.setup();

    const primaryRemove = screen.getByLabelText(/إزالة Civic center/i);
    await user.click(primaryRemove);

    await waitFor(() => {
      expect(screen.queryByLabelText(/إزالة Civic center/i)).toBeNull();
    });
    const primaryBlock = screen.getAllByText(/Primary/i)[0].closest("div");
    expect(primaryBlock?.textContent).toContain("Social services organization");
  });

  it("caps selections at the maximum limit", async () => {
    render(<BusinessCategorySelector initialSelectedIds={[]} />);
    const user = userEvent.setup();

    const searchInput = screen.getByLabelText(/ابحث عن فئة أعمال/i);
    const categoriesToAdd = AVAILABLE_CATEGORIES.slice(0, MAX_CATEGORIES + 1);
    for (const category of categoriesToAdd) {
      await user.clear(searchInput);
      await user.type(searchInput, category.label.slice(0, 4));
      const [option] = await screen.findAllByRole("option", { name: new RegExp(category.label, "i") });
      await user.click(option!);
    }

    const chips = screen.getAllByLabelText(/تعيين كفئة أساسية|الفئة الأساسية/i);
    expect(chips.length).toBe(MAX_CATEGORIES);
  }, 15000);
});
