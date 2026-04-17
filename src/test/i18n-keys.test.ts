/**
 * i18n Audit Test
 *
 * Ensures every translation key used in source files is present in both
 * ar.json and en.json, and that both locale files stay in sync with each
 * other.  This catches "raw key shown instead of translated string" bugs
 * before they reach production.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect every leaf key path, e.g. "common.cancel". */
function getAllKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const nested of getAllKeys(v as Record<string, unknown>, full)) {
        keys.add(nested);
      }
    } else {
      keys.add(full);
    }
  }
  return keys;
}

/** Extract every `t("some.key")` / `t('some.key')` call from source text. */
function extractUsedKeys(source: string): string[] {
  const pattern = /\bt\(\s*["']([^"']+)["']/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(source)) !== null) {
    const key = m[1];
    // Only consider keys that look like namespaced i18n keys (contain a dot
    // and don't look like SQL column lists, URLs, etc.)
    if (key.includes(".") && !key.startsWith("http") && !key.startsWith("/")) {
      found.push(key);
    }
  }
  return found;
}

/** Recursively list all .ts/.tsx files under a directory, excluding patterns. */
function listSourceFiles(dir: string, exclude: string[] = []): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!exclude.includes(entry.name)) {
        results.push(...listSourceFiles(full, exclude));
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const isTest = entry.name.includes(".test.") || entry.name.includes(".spec.");
      const isSetup = entry.name === "setup.ts";
      if (!isTest && !isSetup) {
        results.push(full);
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Load locale files
// ---------------------------------------------------------------------------

const root = path.resolve(__dirname, "../..");
const ar: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.join(root, "src/i18n/ar.json"), "utf8"),
);
const en: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.join(root, "src/i18n/en.json"), "utf8"),
);

const arKeys = getAllKeys(ar);
const enKeys = getAllKeys(en);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("i18n locale files", () => {
  it("ar.json and en.json have the same set of keys (no drift)", () => {
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k)).sort();
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k)).sort();

    expect(missingInAr, `Keys in en.json but missing from ar.json:\n${missingInAr.join("\n")}`).toHaveLength(0);
    expect(missingInEn, `Keys in ar.json but missing from en.json:\n${missingInEn.join("\n")}`).toHaveLength(0);
  });

  it("every t() call in source files has a matching key in ar.json", () => {
    const srcDir = path.join(root, "src");
    const sourceFiles = listSourceFiles(srcDir, ["i18n"]);

    const missing: string[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      for (const key of extractUsedKeys(content)) {
        if (!arKeys.has(key) && !missing.includes(key)) {
          missing.push(key);
        }
      }
    }

    missing.sort();

    expect(
      missing,
      `The following translation keys are used in code but missing from ar.json:\n${missing.join("\n")}`,
    ).toHaveLength(0);
  });

  it("every t() call in source files has a matching key in en.json", () => {
    const srcDir = path.join(root, "src");
    const sourceFiles = listSourceFiles(srcDir, ["i18n"]);

    const missing: string[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      for (const key of extractUsedKeys(content)) {
        if (!enKeys.has(key) && !missing.includes(key)) {
          missing.push(key);
        }
      }
    }

    missing.sort();

    expect(
      missing,
      `The following translation keys are used in code but missing from en.json:\n${missing.join("\n")}`,
    ).toHaveLength(0);
  });
});
