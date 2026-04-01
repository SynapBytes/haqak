import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { 
  Briefcase, Users, Shield, Rocket, Globe, 
  ArrowLeft, CheckCircle2, Heart, Sparkles,
  Code, Layout, Terminal, Database, Cpu, Search,
  Palette, FileText, BarChart, Scale, Mail, ExternalLink
} from "lucide-react";
import DecorativeBackground, { FooterDecorations } from "@/components/DecorativeBackground";

const Careers = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const openRoles = [
    {
      category: t("careers.engineering"),
      icon: Code,
      roles: [
        { title: t("careers.role_fullstack"), type: "Full-time" },
        { title: t("careers.role_mobile"), type: "Full-time" },
        { title: t("careers.role_cyber"), type: "Full-time" },
        { title: t("careers.role_devops"), type: "Full-time" },
        { title: t("careers.role_ai"), type: "Full-time" },
        { title: t("careers.role_qa"), type: "Full-time" },
      ]
    },
    {
      category: t("careers.product_design"),
      icon: Palette,
      roles: [
        { title: t("careers.role_pm"), type: "Full-time" },
        { title: t("careers.role_uiux"), type: "Full-time" },
        { title: t("careers.role_content"), type: "Full-time" },
      ]
    },
    {
      category: t("careers.commercial"),
      icon: BarChart,
      roles: [
        { title: t("careers.role_sales"), type: "Full-time" },
        { title: t("careers.role_marketing"), type: "Full-time" },
      ]
    },
    {
      category: t("careers.legal_admin"),
      icon: Scale,
      roles: [
        { title: t("careers.role_legal"), type: "Full-time" },
      ]
    }
  ];

  const values = [
    { icon: Rocket, title: t("careers.values_impact"), desc: t("careers.values_impact_desc") },
    { icon: Globe, title: t("careers.values_openness"), desc: t("careers.values_openness_desc") },
    { icon: Shield, title: t("careers.values_security"), desc: t("careers.values_security_desc") },
    { icon: Heart, title: t("careers.values_growth"), desc: t("careers.values_growth_desc") },
  ];

  const benefits = [
    { icon: Globe, title: t("careers.why_remote"), desc: t("careers.why_remote_desc") },
    { icon: Sparkles, title: t("careers.why_growth"), desc: t("careers.why_growth_desc") },
    { icon: Users, title: t("careers.why_inclusion"), desc: t("careers.why_inclusion_desc") },
    { icon: Shield, title: t("careers.why_security"), desc: t("careers.why_security_desc") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-cairo">
      <AppHeader />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="container px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.span 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs font-bold tracking-wider mb-6 border border-accent/20"
            >
              <Briefcase className="w-3.5 h-3.5" />
              {t("careers.title")}
            </motion.span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
              {t("careers.hero_title")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
              {t("careers.hero_desc")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="rounded-2xl h-14 px-8 text-lg font-bold gap-2" onClick={() => document.getElementById('open-roles')?.scrollIntoView({ behavior: 'smooth' })}>
                {t("careers.roles_title")}
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Haqak Section */}
      <section className="py-24 bg-card/30 border-y border-border/50">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("careers.why_title")}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border p-8 rounded-3xl hover:border-accent/30 hover:shadow-xl transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <benefit.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles Section */}
      <section id="open-roles" className="py-24">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("careers.roles_title")}</h2>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-12">
            {openRoles.map((category, i) => (
              <div key={i} className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <category.icon className="w-5 h-5 text-accent" />
                  <h3 className="text-xl font-bold">{category.category}</h3>
                </div>
                <div className="grid gap-4">
                  {category.roles.map((role, j) => (
                    <motion.div 
                      key={j}
                      whileHover={{ x: -8 }}
                      className="flex items-center justify-between p-6 bg-card border border-border rounded-2xl hover:border-accent/20 hover:bg-accent/[0.02] transition-all cursor-pointer group"
                      onClick={() => window.open('https://forms.gle/UgGzz8Vq9rtDkP9u7', '_blank')}
                    >
                      <div>
                        <h4 className="font-bold text-lg mb-1 group-hover:text-accent transition-colors">{role.title}</h4>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">{role.type}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-xl group-hover:bg-accent group-hover:text-white">
                        {t("careers.apply_button")}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* Not found role */}
            <div className="mt-16 p-10 rounded-[2.5rem] bg-gradient-to-br from-accent to-info text-white text-center">
              <h3 className="text-2xl font-bold mb-4">{t("careers.roles_not_found")}</h3>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">{t("careers.roles_apply_anyway")}</p>
              <Button size="lg" variant="secondary" className="rounded-2xl h-14 px-10 text-lg font-bold" onClick={() => window.open('https://forms.gle/UgGzz8Vq9rtDkP9u7', '_blank')}>
                {t("careers.apply_button")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="py-24 bg-muted/30">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("careers.apply_title")}</h2>
              <p className="text-lg text-muted-foreground mb-8">{t("careers.apply_desc")}</p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{t("careers.apply_button")}</h4>
                    <p className="text-sm text-muted-foreground">{t("careers.apply_requirements")}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{t("careers.apply_email")}</h4>
                    <p className="text-sm text-muted-foreground">team@haqak.org</p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <Button size="lg" className="rounded-2xl h-14 px-8 gap-2" onClick={() => window.open('https://forms.gle/UgGzz8Vq9rtDkP9u7', '_blank')}>
                  {t("careers.apply_button")}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {values.map((val, i) => (
                <div key={i} className="p-6 bg-card border border-border rounded-3xl">
                  <val.icon className="w-8 h-8 text-accent mb-4" />
                  <h4 className="font-bold mb-2">{val.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{val.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border py-12 bg-card/30">
        <FooterDecorations isDark={isDark} />
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <Link to="/">
                  <img src="/logo-haqak.webp" alt={t("app_name")} className="w-10 h-10 rounded-2xl shadow-md object-contain" />
                </Link>
                <div>
                  <span className="font-bold text-lg text-foreground block">{t("app_name")}</span>
                  <span className="text-xs text-muted-foreground">{t("tagline")}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap justify-center md:justify-end">
                <Link to="/auth" className="hover:text-foreground transition-colors">{t("footer.login")}</Link>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <Link to="/auth" className="hover:text-foreground transition-colors">{t("footer.register")}</Link>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <Link to="/careers" className="text-accent font-bold hover:text-accent/80 transition-colors">{t("footer.careers")}</Link>
              </div>
            </div>
            <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t("footer.rights")}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                {t("footer.status")}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Careers;
