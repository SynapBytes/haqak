import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { AppRole, resolvePrimaryRole } from "@/constants/roles";
import { analytics } from "@/lib/analytics";
import { AuthProfileSchema } from "@/lib/schemas/boundary";
import { handleClientError } from "@/lib/errors";
import { clearCsrfToken } from "@/lib/csrfToken";
import { queryClient } from "@/lib/queryClient";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  governorate?: string | null;
  district?: string | null;
  electoral_district?: string | null;
  constituency?: string | null;
  center?: string | null;
  center_id?: string | null;
  avatar_url?: string | null;
  is_approved: boolean;
  verification_status?: string | null;
  contact_phone?: string | null;
  membership_number?: string | null;
  banned_until?: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  profileLoading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (profileRes.data) {
        const parsed = AuthProfileSchema.safeParse(profileRes.data);
        if (parsed.success) {
          setProfile(parsed.data as Profile);
        } else {
          setProfile(null);
          handleClientError(
            {
              code: "auth.profile.invalid_shape",
              message: "تعذر تحميل بيانات الحساب حالياً",
              retryable: true,
            },
            parsed.error,
            { showToast: false, extras: { boundary: "profiles.select", user_id: userId } },
          );
        }
      } else {
        setProfile(null);
      }
      const roles = (roleRes.data ?? []).map((r) => r.role as AppRole);
      const primary = resolvePrimaryRole(roles);
      setRole(primary);
      // Identify the user in analytics with their hashed ID and role only.
      analytics.identify(userId, primary ?? "citizen");
    } catch (error) {
      setProfile(null);
      setRole("citizen");
      handleClientError(
        {
          code: "auth.profile.fetch_failed",
          message: "تعذر تحميل بيانات الحساب حالياً",
          retryable: true,
        },
        error,
        { showToast: false, extras: { boundary: "auth.fetchProfileAndRole", user_id: userId } },
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        if (lastFetchedUserIdRef.current !== s.user.id) {
          lastFetchedUserIdRef.current = s.user.id;
          await fetchProfileAndRole(s.user.id);
        }
      } else {
        lastFetchedUserIdRef.current = null;
        setProfileLoading(false);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // INITIAL_SESSION is already handled by init() above; skip it to avoid
      // a redundant profile fetch and unnecessary re-renders.
      if (event === "INITIAL_SESSION") return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const shouldRefetchProfileAndRole =
          lastFetchedUserIdRef.current !== s.user.id ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED";

        if (shouldRefetchProfileAndRole) {
          lastFetchedUserIdRef.current = s.user.id;
          await fetchProfileAndRole(s.user.id);
        }
      } else {
        lastFetchedUserIdRef.current = null;
        setProfile(null);
        setRole(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    analytics.reset();
    clearCsrfToken();
    queryClient.clear();
    // Purge all service-worker caches on sign-out so auth-sensitive content
    // is not served from cache to the next user of the same browser profile.
    if (typeof caches !== "undefined") {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // Best-effort — do not block sign-out if cache API is unavailable.
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setProfileLoading(false);
    lastFetchedUserIdRef.current = null;
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfileAndRole(user.id);
  }, [fetchProfileAndRole, user?.id]);

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, profileLoading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
