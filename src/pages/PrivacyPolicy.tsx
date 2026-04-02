import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, FileText, Eye, Lock, UserCheck, Bell, Trash2, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useTranslation } from "react-i18next";
import { getIconWithFallback } from "@/lib/iconWithFallback";

// Section represents a privacy clause with an icon key that must match iconMap.
type Section = { icon: string; title: string; content: string };

const iconMap = {
  alert: AlertTriangle,
  data: FileText,
  eye: Eye,
  lock: Lock,
  user: UserCheck,
  bell: Bell,
  trash: Trash2,
};

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const translatedSections = t("privacy_policy.sections", { returnObjects: true }) as unknown;
  const sections = Array.isArray(translatedSections) ? (translatedSections as Section[]) : [];
  const getIcon = (icon: string) => getIconWithFallback(iconMap, icon);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-4xl px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10 text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/10 bg-accent/[0.08] px-4 py-2 text-xs font-bold text-accent">
            <Shield className="h-4 w-4" />
            {t("privacy_policy.badge")}
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("privacy_policy.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {t("privacy_policy.subtitle")}
          </p>
        </motion.div>

        <div className="space-y-5">
          {sections.map((section, index) => {
            const Icon = getIcon(section.icon);
            return (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground md:text-xl">{section.title}</h2>
                </div>
                <p className="text-sm leading-8 text-muted-foreground md:text-base">{section.content}</p>
              </motion.section>
            );
          })}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          <span>{t("privacy_policy.see_also")} </span>
          <Link to="/terms" className="font-medium text-accent hover:underline">
            {t("privacy_policy.terms_link")}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
