import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import SeoHead from "@/components/SeoHead";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type FAQItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

const FaqCenter = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const faqs = useMemo<FAQItem[]>(
    () => [
      { id: "faq-1", category: t("faq.categories.legal"), question: t("faq.q1.question"), answer: t("faq.q1.answer") },
      { id: "faq-2", category: t("faq.categories.platform"), question: t("faq.q2.question"), answer: t("faq.q2.answer") },
      { id: "faq-3", category: t("faq.categories.security"), question: t("faq.q3.question"), answer: t("faq.q3.answer") },
      { id: "faq-4", category: t("faq.categories.accounts"), question: t("faq.q4.question"), answer: t("faq.q4.answer") },
      { id: "faq-5", category: t("faq.categories.legal"), question: t("faq.q5.question"), answer: t("faq.q5.answer") },
      { id: "faq-6", category: t("faq.categories.platform"), question: t("faq.q6.question"), answer: t("faq.q6.answer") },
    ],
    [t],
  );

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      faqs.filter((item) =>
        !normalized ||
        item.question.toLowerCase().includes(normalized) ||
        item.answer.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized),
      ),
    [faqs, normalized],
  );

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: filtered.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title={t("seo.faq_title")}
        description={t("seo.faq_description")}
        path="/faq"
        structuredData={faqSchema}
      />
      <AppHeader />
      <main className="container px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold">{t("faq.title")}</h1>
        <p className="text-muted-foreground">{t("faq.subtitle")}</p>
        <Input
          placeholder={t("faq.search_placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("faq.search_placeholder")}
        />

        <Accordion type="single" collapsible className="space-y-3">
          {filtered.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="rounded-xl border px-4">
              <AccordionTrigger className="text-start">
                <span className="inline-flex flex-col items-start gap-1">
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                  <span>{item.question}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
};

export default FaqCenter;
