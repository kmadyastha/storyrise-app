"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Tier = "none" | "starter" | "growth" | "pro" | "pro_max";

interface AppState {
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  tier: Tier;
  setTier: (t: Tier) => void;
  freeTrialUsed: boolean;
  setFreeTrialUsed: (v: boolean) => void;
  credits: number;
  setCredits: (n: number) => void;
  addCredits: (n: number) => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false); // fresh visitors start logged out
  const [tier, setTierState] = useState<Tier>("none");
  const [freeTrialUsed, setFreeTrialUsed] = useState(false);
  const [credits, setCredits] = useState(0);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const setTier = useCallback((t: Tier) => {
    setTierState(t);
    const grant: Record<Tier, number> = {
      none: 0,
      starter: 60,
      growth: 130,
      pro: 210,
      pro_max: 360,
    };
    setCredits(grant[t]);
  }, []);

  const addCredits = useCallback((n: number) => {
    setCredits((c) => c + n);
  }, []);

  const triggerCelebration = useCallback(() => setCelebrationOpen(true), []);
  const closeCelebration = useCallback(() => setCelebrationOpen(false), []);
  const openUpgradeModal = useCallback(() => setUpgradeModalOpen(true), []);
  const closeUpgradeModal = useCallback(() => setUpgradeModalOpen(false), []);
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  return (
    <AppContext.Provider
      value={{
        loggedIn,
        setLoggedIn,
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