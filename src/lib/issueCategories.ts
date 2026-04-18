import type { TFunction } from "i18next";

export const ISSUE_CATEGORY_KEYS = [
  "water",
  "roads",
  "public_facilities",
  "health",
  "sanitation",
  "education",
  "electricity",
  "other",
] as const;

export type IssueCategoryKey = (typeof ISSUE_CATEGORY_KEYS)[number];

const ISSUE_CATEGORY_ALIASES: Record<string, IssueCategoryKey> = {
  // Canonical keys
  water: "water",
  roads: "roads",
  public_facilities: "public_facilities",
  health: "health",
  sanitation: "sanitation",
  education: "education",
  electricity: "electricity",
  other: "other",
  general: "other",

  // Arabic legacy values
  مياه: "water",
  الطرق: "roads",
  طرق: "roads",
  "مرافق عامة": "public_facilities",
  صحة: "health",
  النظافة: "sanitation",
  نظافة: "sanitation",
  تعليم: "education",
  الكهرباء: "electricity",
  كهرباء: "electricity",
  أخرى: "other",
  اخرى: "other",
};

export const isIssueCategoryKey = (value: string): value is IssueCategoryKey =>
  (ISSUE_CATEGORY_KEYS as readonly string[]).includes(value);

export const normalizeIssueCategory = (value: string | null | undefined): IssueCategoryKey => {
  const normalized = (value ?? "").trim();
  if (!normalized) return "other";
  if (isIssueCategoryKey(normalized)) return normalized;
  return ISSUE_CATEGORY_ALIASES[normalized] ?? "other";
};

export const getIssueCategoryLabel = (
  value: string | null | undefined,
  t: TFunction,
): string => t(`categories.${normalizeIssueCategory(value)}`);
