import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import SeoHead from "@/components/SeoHead";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type FAQItem = {
  category: string;
  question: string;
  answer: string;
};

const FaqCenter = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const faqs = useMemo<FAQItem[]>(
    () => [
      { category: t("faq.categories.legal"), question: t("faq.items.0.q"), answer: t("faq.items.0.a") },
      { category: t("faq.categories.platform"), question: t("faq.items.1.q"), answer: t("faq.items.1.a") },
      { category: t("faq.categories.security"), question: t("faq.items.2.q"), answer: t("faq.items.2.a") },
      { category: t("faq.categories.accounts"), question: t("faq.items.3.q"), answer: t("faq.items.3.a") },
      { category: t("faq.categories.legal"), question: t("faq.items.4.q"), answer: t("faq.items.4.a") },
      { category: t("faq.categories.platform"), question: t("faq.items.5.q"), answer: t("faq.items.5.a") },
    ],
    [t],
  );

  const normalized = query.trim().toLowerCase();
  const filtered = faqs.filter((item) =>
    !normalized ||
    item.question.toLowerCase().includes(normalized) ||
    item.answer.toLowerCase().includes(normalized) ||
    item.category.toLowerCase().includes(normalized),
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
      <SeoHead title={t("seo.faq_title")} description={t("seo.faq_description")} path="/faq" />
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
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
          {filtered.map((item, index) => (
            <AccordionItem key={`${item.question}-${index}`} value={`faq-${index}`} className="rounded-xl border px-4">
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
