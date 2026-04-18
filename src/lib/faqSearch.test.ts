import { describe, expect, it } from "vitest";
import { normalizeSearchTerm, searchFaqItems } from "./faqSearch";

const faqs = [
  { id: "1", category: "Security", question: "How is my data protected?", answer: "We use layered controls." },
  { id: "2", category: "Accounts", question: "How do I login?", answer: "Use your email and password." },
  { id: "3", category: "Legal", question: "Can I submit a complaint?", answer: "Yes, from your dashboard." },
];

describe("faqSearch", () => {
  it("normalizes Arabic variants", () => {
    expect(normalizeSearchTerm("إدارة الشُكوى")).toBe("اداره الشكوي");
  });

  it("supports synonym matching and ranking", () => {
    const results = searchFaqItems(faqs, "privacy");
    expect(results[0].id).toBe("1");
  });

  it("returns matches for Arabic complaint synonym", () => {
    const results = searchFaqItems(faqs, "شكوى");
    expect(results[0].id).toBe("3");
  });
});
