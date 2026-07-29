import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, BarChart3, Building2, CheckCircle2, ClipboardCheck, Eye,
  FileCheck2, Globe2, HeartHandshake, LockKeyhole, MessageSquare,
  Network, Scale, Send, ShieldCheck, Sparkles, Users, Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { SupportForm } from "./Landing";

const ease = [0.22, 1, 0.36, 1] as const;

type Item = { title: string; description: string; icon: LucideIcon };

const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 22 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  );
};

const Heading = ({ badge, title, description, start = false }: { badge: string; title: string; description: string; start?: boolean }) => (
  <div className={start ? "max-w-2xl" : "mx-auto max-w-3xl text-center"}>
    <div className={`mb-5 flex ${start ? "justify-start" : "justify-center"}`}>
      <span className="premium-pill"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{badge}</span>
    </div>
    <h2 className="text-balance text-3xl font-bold leading-tight tracking-[-0.035em] text-foreground sm:text-4xl lg:text-5xl">{title}</h2>
    <p className="mt-5 text-pretty text-base leading-8 text-muted-foreground sm:text-lg">{description}</p>
  </div>
);

const CivicConsole = () => {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const flow = [
    { label: t("hero.step1"), icon: MessageSquare },
    { label: t("hero.step2"), icon: ShieldCheck },
    { label: t("hero.step3"), icon: CheckCircle2 },
  ];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.96, y: 26 }}
      animate={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease }}
      className="relative mx-auto w-full max-w-[620px]"
    >
      <div className="absolute -inset-10 rounded-[3rem] bg-[radial-gradient(circle,hsl(var(--accent)/0.16),transparent_66%)] blur-2xl" />
      <div className="premium-panel relative overflow-hidden rounded-[2rem] p-3 sm:p-4">
        <div className="premium-grid absolute inset-0 opacity-20" />
        <div className="relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-primary p-5 text-primary-foreground sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,hsl(var(--accent)/0.2),transparent_35%),radial-gradient(circle_at_90%_100%,hsl(var(--info)/0.16),transparent_40%)]" />
          <div className="relative flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.15] bg-white/[0.08]"><Scale className="h-5 w-5 text-accent" /></div>
              <div><p className="text-[0.65rem] font-semibold tracking-[0.2em] text-white/[0.45]">HAQAK CIVIC SYSTEM</p><p className="mt-1 text-sm font-semibold text-white">{t("hero.welcome_title")}</p></div>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[0.65rem] font-bold text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />SECURE</span>
          </div>
          <div className="relative py-7">
            <p className="text-xs text-white/[0.45]">{t("hero.welcome_sub")}</p>
            <h3 className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">{t("hero.from_citizen")}</h3>
            <div className="mt-7 grid gap-3">
              {flow.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={reduced ? false : { opacity: 0, x: 16 }}
                  animate={reduced ? undefined : { opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.65 + index * 0.12, ease }}
                  className="flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-white/[0.055] p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#102b3a]"><item.icon className="h-5 w-5 text-accent" /></div>
                  <div className="flex-1"><p className="text-[0.62rem] tracking-[0.16em] text-white/[0.35]">0{index + 1}</p><p className="mt-0.5 text-sm font-semibold text-white/90">{item.label}</p></div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300/80" />
                </motion.div>
              ))}
            </div>
          </div>
          <div className="relative flex justify-between border-t border-white/10 pt-5 text-[0.65rem] tracking-[0.12em] text-white/[0.35]"><span>PRIVACY-BY-DESIGN</span><span>DIRECT CONNECTION</span></div>
        </div>
      </div>
      <div className="premium-surface absolute -bottom-7 left-4 hidden rounded-2xl p-4 shadow-xl sm:flex lg:-left-8">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success"><LockKeyhole className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">{t("features.privacy")}</p><p className="text-sm font-bold text-foreground">Protected by design</p></div></div>
      </div>
    </motion.div>
  );
};

const PremiumLanding = () => {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const steps: Item[] = [
    { title: t("steps.step1"), description: t("steps.step1_desc"), icon: Users },
    { title: t("steps.step2"), description: t("steps.step2_desc"), icon: MessageSquare },
    { title: t("steps.step3"), description: t("steps.step3_desc"), icon: ClipboardCheck },
    { title: t("steps.step4"), description: t("steps.step4_desc"), icon: Eye },
  ];
  const features: Item[] = [
    { title: t("features.easy_report"), description: t("features.easy_report_desc"), icon: Send },
    { title: t("features.privacy"), description: t("features.privacy_desc"), icon: ShieldCheck },
    { title: t("features.analytics"), description: t("features.analytics_desc"), icon: BarChart3 },
    { title: t("features.realtime"), description: t("features.realtime_desc"), icon: Zap },
    { title: t("features.coverage"), description: t("features.coverage_desc"), icon: Globe2 },
    { title: t("features.review"), description: t("features.review_desc"), icon: FileCheck2 },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SeoHead title={t("seo.landing_title")} description={t("seo.landing_description")} path="/" />
      <AppHeader />
      <main>
        <section className="relative isolate overflow-hidden pb-24 pt-20 sm:pb-28 sm:pt-24 lg:min-h-[calc(100vh-5rem)] lg:pt-28">
          <div className="premium-grid absolute inset-0 -z-20 opacity-[0.18]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_22%,hsl(var(--accent)/0.14),transparent_30%),radial-gradient(circle_at_88%_36%,hsl(var(--info)/0.12),transparent_34%),linear-gradient(to_bottom,transparent,hsl(var(--background))_90%)]" />
          <div className="container px-5 sm:px-8">
            <div className="grid items-center gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
              <motion.div initial={reduced ? false : { opacity: 0, y: 25 }} animate={reduced ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.78, ease }} className="max-w-3xl">
                <span className="premium-pill"><Sparkles className="h-3.5 w-3.5" />{t("hero.badge")}</span>
                <h1 className="mt-7 text-balance text-5xl font-bold leading-[1.05] tracking-[-0.05em] sm:text-6xl lg:text-[4.8rem]"><span className="block">{t("hero.title_1")}</span><span className="premium-text-gradient mt-2 block">{t("hero.title_2")}</span></h1>
                <p className="mt-7 max-w-2xl text-pretty text-lg leading-9 text-muted-foreground sm:text-xl">{t("hero.subtitle")}</p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link to="/auth"><Button className="premium-cta h-14 w-full rounded-2xl px-8 text-base font-bold sm:w-auto">{t("hero.cta_citizen")}<ArrowLeft className="h-4 w-4" /></Button></Link>
                  <Link to="/auth?type=mp"><Button variant="outline" className="h-14 w-full rounded-2xl bg-card/60 px-8 text-base font-bold backdrop-blur-xl sm:w-auto"><Building2 className="h-4 w-4" />{t("hero.cta_mp")}</Button></Link>
                </div>
                <div className="mt-10 grid max-w-xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  {[{ icon: LockKeyhole, label: t("features.privacy") }, { icon: Network, label: t("features.realtime") }, { icon: Scale, label: t("features.review") }].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border/[0.65] bg-card/50 px-3 py-3"><item.icon className="h-4 w-4 text-accent" /><span className="truncate font-medium">{item.label}</span></div>
                  ))}
                </div>
              </motion.div>
              <CivicConsole />
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/[0.45] py-6">
          <div className="container grid gap-3 px-5 sm:grid-cols-3 sm:gap-0 sm:px-8">
            {[{ icon: Building2, label: t("partners.mps") }, { icon: HeartHandshake, label: t("partners.civil_society") }, { icon: Users, label: t("partners.citizens") }].map((item, index) => (
              <div key={item.label} className={`flex items-center justify-center gap-3 py-2 text-sm font-semibold text-muted-foreground ${index ? "sm:border-r" : ""}`}><item.icon className="h-4 w-4 text-accent" />{item.label}</div>
            ))}
          </div>
        </section>

        <section className="py-24 sm:py-28 lg:py-36">
          <div className="container px-5 sm:px-8"><Reveal><Heading badge={t("steps.badge")} title={t("steps.title")} description={t("steps.subtitle")} /></Reveal>
            <div className="mx-auto mt-16 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => <Reveal key={step.title} delay={index * 0.07}><article className="premium-surface group relative h-full overflow-hidden rounded-[1.75rem] p-6 transition-transform duration-500 hover:-translate-y-1.5"><span className="absolute left-5 top-4 text-5xl font-black text-foreground/[0.035]">0{index + 1}</span><div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent"><step.icon className="h-6 w-6" /></div><h3 className="relative mt-7 text-xl font-bold">{step.title}</h3><p className="relative mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p></article></Reveal>)}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-border/60 bg-card/[0.35] py-24 sm:py-28 lg:py-36">
          <div className="premium-grid absolute inset-0 opacity-[0.12]" />
          <div className="container relative px-5 sm:px-8"><Reveal><Heading badge={t("features.badge")} title={t("features.title")} description={t("features.subtitle")} /></Reveal>
            <div className="mx-auto mt-16 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => <Reveal key={feature.title} delay={(index % 3) * 0.06}><article className="premium-surface group h-full rounded-[1.8rem] p-7 transition-all duration-500 hover:-translate-y-1 hover:border-accent/30"><div className="flex items-center justify-between"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-accent"><feature.icon className="h-6 w-6" /></div><span className="text-xs font-bold tracking-[0.2em] text-muted-foreground/[0.55]">0{index + 1}</span></div><h3 className="mt-7 text-xl font-bold">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p></article></Reveal>)}
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-28 lg:py-36">
          <div className="container grid max-w-6xl items-start gap-12 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <Reveal><div className="lg:sticky lg:top-28"><Heading badge={t("support.badge")} title={t("support.title")} description={t("support.subtitle")} start /><div className="premium-surface mt-9 rounded-2xl p-5"><div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-bold">{t("features.privacy")}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t("features.privacy_desc")}</p></div></div></div></div></Reveal>
            <Reveal delay={0.1}><div className="premium-form-shell"><SupportForm /></div></Reveal>
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/[0.35] py-20">
          <div className="container px-5 sm:px-8"><Reveal><div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-primary px-6 py-14 text-center text-primary-foreground"><div className="premium-grid absolute inset-0 opacity-[0.15]" /><div className="relative mx-auto max-w-3xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.15] bg-white/[0.08] text-accent"><Scale className="h-6 w-6" /></div><h2 className="mt-7 text-3xl font-bold text-white sm:text-4xl">{t("cta.title")}</h2><p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/[0.65] sm:text-lg">{t("cta.subtitle")}</p><Link to="/auth" className="mt-8 inline-flex"><Button className="h-14 rounded-2xl bg-white px-8 font-bold text-primary hover:bg-white/90">{t("cta.button")}<ArrowLeft className="h-4 w-4" /></Button></Link></div></div></Reveal></div>
        </section>
      </main>

      <footer className="border-t border-border/[0.65] bg-card/[0.35] py-10">
        <div className="container flex flex-col items-center justify-between gap-7 px-5 sm:px-8 md:flex-row">
          <div className="flex items-center gap-3"><img src="/haqak-logo.webp" alt="HAQAK" className="h-9 w-9" /><div><p className="text-sm font-bold">{t("app_name")}</p><p className="text-xs text-muted-foreground">{t("footer.rights")}</p></div></div>
          <nav className="flex flex-wrap justify-center gap-5 text-sm text-muted-foreground"><Link to="/privacy">{t("footer.privacy")}</Link><Link to="/terms">{t("footer.terms")}</Link><Link to="/careers">{t("footer.careers")}</Link><Link to="/support">{t("footer.support")}</Link></nav>
          <a href="https://capsorix.tech" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border/[0.65] bg-background/[0.65] px-4 py-2.5"><span className="text-[0.62rem] font-semibold tracking-[0.16em] text-muted-foreground">{t("footer.crafted_by")}</span><img src="/capsorix-logo.svg" alt="Capsorix" className="h-7 w-auto opacity-80" /></a>
        </div>
      </footer>
    </div>
  );
};

export default PremiumLanding;
