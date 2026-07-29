import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PushNotificationProvider from "@/components/PushNotificationProvider";
import { useTranslation } from "react-i18next";
import { AppRole } from "@/constants/roles";
import { queryClient } from "@/lib/queryClient";

const Landing = lazy(() => import("./pages/PremiumLanding"));
const CitizenDashboard = lazy(() => import("./pages/CitizenDashboard"));
const CitizenProfile = lazy(() => import("./pages/CitizenProfile"));
const MPsDirectory = lazy(() => import("./pages/MPsDirectory"));
const MPDashboard = lazy(() => import("./pages/MPDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const MPProfilePage = lazy(() => import("./pages/MPProfilePage"));
const MPSettingsPage = lazy(() => import("./pages/MPSettingsPage"));
const CenterOnboarding = lazy(() => import("./pages/CenterOnboarding"));
const MPPendingApproval = lazy(() => import("./pages/MPPendingApproval"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const GeniusEnhancements = lazy(() => import("./pages/GeniusEnhancements"));
const Careers = lazy(() => import("./pages/Careers"));
const Support = lazy(() => import("./pages/Support"));
const SuccessStories = lazy(() => import("./pages/SuccessStories"));
const FaqCenter = lazy(() => import("./pages/FaqCenter"));

const PageLoader = () => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
    <div className="premium-grid absolute inset-0 opacity-[0.16]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--accent)/0.12),transparent_24rem)]" />
    <div className="relative flex flex-col items-center text-center" role="status" aria-live="polite">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.8rem] border border-border/70 bg-card/75 shadow-[inset_0_1px_0_hsl(var(--surface-highlight)/0.65),0_28px_70px_-38px_hsl(var(--foreground)/0.5)] backdrop-blur-2xl">
        <span className="absolute -inset-3 animate-pulse rounded-[2.2rem] border border-accent/15" />
        <img src="/haqak-logo.webp" alt="" className="h-12 w-12 object-contain" />
      </div>
      <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/3 animate-[page-loader_1.3s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-accent via-info to-accent" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">HAQAK SECURE EXPERIENCE</p>
      <span className="sr-only">Loading</span>
    </div>
    <style>{`@keyframes page-loader { 0% { transform: translateX(120%); } 100% { transform: translateX(-180%); } }`}</style>
  </div>
);

function ProtectedRoute({
  children,
  requiredRole,
  allowMissingCenter = false,
}: {
  children: React.ReactNode;
  requiredRole?: AppRole;
  allowMissingCenter?: boolean;
}) {
  const { session, role, loading, profileLoading, profile } = useAuth();
  const { t } = useTranslation();

  if (loading || profileLoading) return <PageLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (requiredRole === "admin" && role !== "admin") return <Navigate to="/" replace />;
  if (requiredRole === "moderator" && role !== "moderator" && role !== "admin") return <Navigate to="/" replace />;
  if (requiredRole === "mp" && role !== "mp" && role !== "admin") return <Navigate to="/" replace />;
  if (requiredRole === "citizen" && role !== "citizen" && role !== "admin") return <Navigate to="/" replace />;

  if (requiredRole === "mp" && role === "mp" && !profile?.is_approved) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
        <div className="premium-grid absolute inset-0 opacity-[0.14]" />
        <div className="civic-card relative max-w-md rounded-[1.8rem] text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent">
            <span className="text-xl font-black">✓</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("account_review.title")}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("account_review.subtitle")}</p>
        </div>
      </div>
    );
  }

  if (!allowMissingCenter && (role === "citizen" || role === "mp") && !profile?.center_id) {
    return <Navigate to="/onboarding/center" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <PushNotificationProvider />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/genius" element={<GeniusEnhancements />} />
                  <Route path="/citizen" element={<ProtectedRoute requiredRole="citizen"><CitizenDashboard /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><CitizenProfile /></ProtectedRoute>} />
                  <Route path="/mps" element={<ProtectedRoute><MPsDirectory /></ProtectedRoute>} />
                  <Route path="/mp" element={<ProtectedRoute requiredRole="mp"><MPDashboard /></ProtectedRoute>} />
                  <Route path="/mp-pending" element={<ProtectedRoute requiredRole="mp" allowMissingCenter><MPPendingApproval /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/onboarding/center" element={<ProtectedRoute allowMissingCenter><CenterOnboarding /></ProtectedRoute>} />
                  <Route path="/mp-profile/:id" element={<MPProfilePage />} />
                  <Route path="/mp/settings" element={<ProtectedRoute requiredRole="mp"><MPSettingsPage /></ProtectedRoute>} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/success-stories" element={<SuccessStories />} />
                  <Route path="/faq" element={<FaqCenter />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
