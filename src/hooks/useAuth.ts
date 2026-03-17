import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Internal state to keep track of the user globally
let globalUser: User | null = null;
let globalProfile: any | null = null;
let globalSession: Session | null = null;
let globalLoading = true;
const listeners = new Set<() => void>();

// Helper to notify all hooks when state changes
const notify = () => listeners.forEach((l) => l());

// Initialize Supabase Auth Listener once
const initAuth = () => {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    globalSession = session;
    globalUser = session?.user ?? null;
    if (session?.user) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      globalProfile = data;
    } else {
      globalProfile = null;
    }
    globalLoading = false;
    notify();
  });

  // Get initial session
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    globalSession = session;
    globalUser = session?.user ?? null;
    if (session?.user) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      globalProfile = data;
    }
    globalLoading = false;
    notify();
  });
};

// Start the listener immediately
initAuth();

export function useAuth() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const forceUpdate = () => setTick((t) => t + 1);
    listeners.add(forceUpdate);
    return () => {
      listeners.delete(forceUpdate);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (globalUser) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", globalUser.id).maybeSingle();
      globalProfile = data;
      notify();
    }
  };

  return {
    user: globalUser,
    session: globalSession,
    profile: globalProfile,
    loading: globalLoading,
    signOut,
    refreshProfile,
  };
}
