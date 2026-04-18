import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import SeoHead from "@/components/SeoHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 6;

const SuccessStories = () => {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const stories = useMemo(
    () => [
      {
        title: t("success_stories.items.0.title"),
        governorate: t("success_stories.items.0.governorate"),
        duration: t("success_stories.items.0.duration"),
        authority: t("success_stories.items.0.authority"),
        before: t("success_stories.items.0.before"),
        after: t("success_stories.items.0.after"),
      },
      {
        title: t("success_stories.items.1.title"),
        governorate: t("success_stories.items.1.governorate"),
        duration: t("success_stories.items.1.duration"),
        authority: t("success_stories.items.1.authority"),
        before: t("success_stories.items.1.before"),
        after: t("success_stories.items.1.after"),
      },
      {
        title: t("success_stories.items.2.title"),
        governorate: t("success_stories.items.2.governorate"),
        duration: t("success_stories.items.2.duration"),
        authority: t("success_stories.items.2.authority"),
        before: t("success_stories.items.2.before"),
        after: t("success_stories.items.2.after"),
      },
      {
        title: t("success_stories.items.3.title"),
        governorate: t("success_stories.items.3.governorate"),
        duration: t("success_stories.items.3.duration"),
        authority: t("success_stories.items.3.authority"),
        before: t("success_stories.items.3.before"),
        after: t("success_stories.items.3.after"),
      },
      {
        title: t("success_stories.items.4.title"),
        governorate: t("success_stories.items.4.governorate"),
        duration: t("success_stories.items.4.duration"),
        authority: t("success_stories.items.4.authority"),
        before: t("success_stories.items.4.before"),
        after: t("success_stories.items.4.after"),
      },
      {
        title: t("success_stories.items.5.title"),
        governorate: t("success_stories.items.5.governorate"),
        duration: t("success_stories.items.5.duration"),
        authority: t("success_stories.items.5.authority"),
        before: t("success_stories.items.5.before"),
        after: t("success_stories.items.5.after"),
      },
    ],
    [t],
  );

  const visibleStories = stories.slice(0, visibleCount);
  const hasMore = visibleCount < stories.length;

  return (
    <div className="min-h-screen bg-background">
      <SeoHead title={t("seo.success_stories_title")} description={t("seo.success_stories_description")} path="/success-stories" />
      <AppHeader />
      <main className="container px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold">{t("success_stories.title")}</h1>
        <p className="text-muted-foreground">{t("success_stories.subtitle")}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visibleStories.map((story) => (
            <Card key={`${story.title}-${story.governorate}`} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">{story.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>{t("success_stories.governorate")}:</strong> {story.governorate}</p>
                <p><strong>{t("success_stories.duration")}:</strong> {story.duration}</p>
                <p><strong>{t("success_stories.authority")}:</strong> {story.authority}</p>
                <p><strong>{t("success_stories.before")}:</strong> {story.before}</p>
                <p><strong>{t("success_stories.after")}:</strong> {story.after}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {hasMore ? (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
              {t("success_stories.load_more")}
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default SuccessStories;
