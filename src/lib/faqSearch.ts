export type FAQSearchItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const SYNONYMS: Record<string, string[]> = {
  complaint: ["issue", "problem", "بلاغ", "شكوى", "شكوي"],
  login: ["sign in", "account access", "تسجيل", "دخول"],
  security: ["privacy", "safety", "أمان", "خصوصية"],
  account: ["profile", "user", "حساب", "ملف"],
  legal: ["law", "حقوق", "قانون"],
};

const normalizeArabic = (input: string) =>
  input
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

export const normalizeSearchTerm = (input: string) =>
  normalizeArabic(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const expandTokens = (tokens: string[]) => {
  const expanded = new Set(tokens);
  const normalizedSynonyms = Object.entries(SYNONYMS).map(([key, values]) => ({
    key: normalizeSearchTerm(key),
    values: values.map((entry) => normalizeSearchTerm(entry)),
  }));
  for (const token of tokens) {
    for (const { key, values } of normalizedSynonyms) {
      if (key === token || values.includes(token)) {
        expanded.add(key);
        values.forEach((entry) => expanded.add(entry));
      }
    }
  }
  return [...expanded];
};

const scoreItem = (item: FAQSearchItem, tokens: string[]) => {
  const question = normalizeSearchTerm(item.question);
  const answer = normalizeSearchTerm(item.answer);
  const category = normalizeSearchTerm(item.category);
  return tokens.reduce((score, token) => {
    if (question.includes(token)) return score + 5;
    if (category.includes(token)) return score + 3;
    if (answer.includes(token)) return score + 2;
    return score;
  }, 0);
};

export const searchFaqItems = (items: FAQSearchItem[], query: string) => {
  const normalized = normalizeSearchTerm(query);
  if (!normalized) return items;

  const tokens = expandTokens(normalized.split(" ").filter(Boolean));

  return items
    .map((item) => ({ item, score: scoreItem(item, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
};
