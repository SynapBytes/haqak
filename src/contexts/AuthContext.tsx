import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { AppRole, resolvePrimaryRole } from "@/constants/roles";
import { analytics } from "@/lib/analytics";

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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      setProfile((profileRes.data as Profile) ?? null);
      const roles = (roleRes.data ?? []).map((r) => r.role as AppRole);
      const primary = resolvePrimaryRole(roles);
      setRole(primary);
      // Identify the user in analytics with their hashed ID and role only.
      analytics.identify(userId, primary ?? "citizen");
    } catch {
      setProfile(null);
      setRole("citizen");
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchProfileAndRole(s.user.id);
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
        await fetchProfileAndRole(s.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        await supabase.auth.signOut();
        analytics.reset();
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
      }
    }, 300_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    analytics.reset();
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
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
