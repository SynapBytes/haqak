import { describe, expect, it } from "vitest";
import { SOCIAL_LINKS_CONFIG, getEnabledSocialLinks, isValidSocialHref } from "./socialLinks";

describe("social links config", () => {
  it("enables only valid href links", () => {
    const enabled = getEnabledSocialLinks();
    expect(enabled.length).toBeGreaterThan(0);
    for (const entry of enabled) {
      expect(isValidSocialHref(entry.href)).toBe(true);
    }
  });

  it("keeps every configured social href either valid or hidden", () => {
    for (const entry of SOCIAL_LINKS_CONFIG) {
      const visible = getEnabledSocialLinks().some((item) => item.id === entry.id);
      if (visible) {
        expect(isValidSocialHref(entry.href)).toBe(true);
      }
    }
  });
});
