"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Tier = "none" | "starter" | "growth" | "pro" | "pro_max";

interface AppState {
  loggedIn: boolean;
  authLoading: boolean;
  user: User | null;
  tier: Tier;
  setTier: (t: Tier) => Promise<void>;
  freeTrialUsed: boolean;
  setFreeTrialUsed: (v: boolean) => Promise<void>;
  credits: number;
  setCredits: (n: number) => Promise<void>;
  addCredits: (n: number) => Promise<void>;
  celebrationOpen: boolean;
  triggerCelebration: () => void;
  closeCelebration: () => void;
  upgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const AppContext = createContext<AppState | null>(null);

const CREDIT_GRANTS: Record<Tier, number> = {
  none: 0,
  starter: 60,
  growth: 130,
  pro: 210,
  pro_max: 360,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tier, setTierState] = useState<Tier>("none");
  const [freeTrialUsed, setFreeTrialUsedState] = useState(false);
  const [credits, setCreditsState] = useState(0);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("tier, credits, free_trial_used")
        .eq("id", userId)
        .single();
      if (data) {
        setTierState((data.tier as Tier) ?? "none");
        setCreditsState(data.credits ?? 0);
        setFreeTrialUsedState(data.free_trial_used ?? false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setTierState("none");
        setCreditsState(0);
        setFreeTrialUsedState(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTier = useCallback(
    async (t: Tier) => {
      const grantedCredits = CREDIT_GRANTS[t];
      setTierState(t);
      setCreditsState(grantedCredits);
      if (user) {
        await supabase.from("profiles").update({ tier: t, credits: grantedCredits }).eq("id", user.id);
      }
    },
    [user, supabase]
  );

  const setCredits = useCallback(
    async (n: number) => {
      setCreditsState(n);
      if (user) {
        await supabase.from("profiles").update({ credits: n }).eq("id", user.id);
      }
    },
    [user, supabase]
  );

  const addCredits = useCallback(
    async (n: number) => {
      const next = credits + n;
      setCreditsState(next);
      if (user) {
        await supabase.from("profiles").update({ credits: next }).eq("id", user.id);
      }
    },
    [user, supabase, credits]
  );

  const setFreeTrialUsed = useCallback(
    async (v: boolean) => {
      setFreeTrialUsedState(v);
      if (user) {
        await supabase.from("profiles").update({ free_trial_used: v }).eq("id", user.id);
      }
    },
    [user, supabase]
  );

  const triggerCelebration = useCallback(() => setCelebrationOpen(true), []);
  const closeCelebration = useCallback(() => setCelebrationOpen(false), []);
  const openUpgradeModal = useCallback(() => setUpgradeModalOpen(true), []);
  const closeUpgradeModal = useCallback(() => setUpgradeModalOpen(false), []);
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  return (
    <AppContext.Provider
      value={{
        loggedIn: !!user,
        authLoading,
        user,
        tier,
        setTier,
        freeTrialUsed,
        setFreeTrialUsed,
        credits,
        setCredits,
        addCredits,
        celebrationOpen,
        triggerCelebration,
        closeCelebration,
        upgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
        loginModalOpen,
        openLoginModal,
        closeLoginModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}