import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Landing footer review fixes", () => {
  const source = fs.readFileSync("src/pages/Landing.tsx", "utf8");

  it("uses i18n defaultValue for crafted_by fallback", () => {
    expect(source).toContain('t("footer.crafted_by", { defaultValue: "CRAFTED BY" })');
  });

  it("uses Framer whileHover for both y and scale without Tailwind hover scale class", () => {
    expect(source).toContain("whileHover={{ y: -2, scale: 1.05 }}");
    expect(source).toContain(
      'className="inline-flex items-center justify-center transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg p-1"',
    );
  });
});
