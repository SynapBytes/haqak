import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PushNotificationProvider from "@/components/PushNotificationProvider";
import { useTranslation } from "react-i18next";
import { AppRole } from "@/constants/roles";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { queryClient } from "@/lib/queryClient";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
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

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
  const { session, role, loading, profile } = useAuth();
  const { t } = useTranslation();
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (requiredRole === "admin" && role !== "admin") return <Navigate to="/" replace />;
  if (requiredRole === "moderator" && role !== "moderator" && role !== "admin") return <Navigate to="/" replace />;
  if (requiredRole === "mp" && role !== "mp" && role !== "admin") return <Navigate to="/" replace />;
  if (requiredRole === "citizen" && role !== "citizen" && role !== "admin") return <Navigate to="/" replace />;
  if (requiredRole === "mp" && role === "mp" && !profile?.is_approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center civic-card max-w-md mx-4">
          <h2 className="text-xl font-bold text-foreground mb-2">{t("account_review.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("account_review.subtitle")}</p>
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
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
          <SpeedInsights />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
