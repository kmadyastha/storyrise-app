"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp, Tier } from "@/lib/app-context";
import { pricingTiers, topupPacks } from "@/lib/dummy-data";
import { X, Check, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

export default function UpgradeModal() {
  const { upgradeModalOpen, closeUpgradeModal, setTier, triggerCelebration, addCredits } = useApp();
  const [processing, setProcessing] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  if (!upgradeModalOpen) return null;

  const choose = (id: string) => {
    setProcessing(id);
    // Simulated Razorpay checkout — real integration happens post-setup.
    setTimeout(() => {
      setProcessing(null);
      closeUpgradeModal();
      setTier(id as Tier);
      triggerCelebration();
    }, 1100);
  };

  const buyTopup = (id: string, credits: number) => {
    setProcessing(id);
    setTimeout(() => {
      setProcessing(null);
      addCredits(credits);
      setJustAdded(id);
      setTimeout(() => setJustAdded(null), 1800);
    }, 800);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] bg-ink/40 backdrop-blur-sm grid place-items-center px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeUpgradeModal}
      >
        <motion.div
          className="bg-white rounded-[24px] w-full max-w-3xl overflow-hidden grid md:grid-cols-[1fr_1.4fr] shadow-2xl max-h-[90vh]"
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-teal text-white p-8 flex flex-col justify-between">
            <div>
              <Sparkles size={22} className="mb-4 opacity-90" />
              <h3 className="font-display text-2xl font-semibold mb-3 leading-snug">
                Unlock the full story
              </h3>
              <ul className="space-y-2.5 text-sm text-white/90">
                <li className="flex gap-2"><Check size={16} className="shrink-0 mt-0.5" /> Immersive format & video export</li>
                <li className="flex gap-2"><Check size={16} className="shrink-0 mt-0.5" /> Unlimited story edits & regenerations</li>
                <li className="flex gap-2"><Check size={16} className="shrink-0 mt-0.5" /> KDP print-ready files</li>
                <li className="flex gap-2"><Check size={16} className="shrink-0 mt-0.5" /> No watermark, full commercial rights</li>
              </ul>
            </div>
            <p className="text-xs text-white/70 mt-6">Cancel anytime. Credits never expire mid-cycle.</p>
          </div>

          <div className="p-6 overflow-y-auto">
            <button
              onClick={closeUpgradeModal}
              className="float-right text-ink-soft hover:text-ink -mt-1"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mt-6 mb-3">
              Monthly plans
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {pricingTiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => choose(t.id)}
                  disabled={!!processing}
                  className={`text-left rounded-2xl border p-4 transition-colors disabled:opacity-60 ${
                    t.highlighted ? "border-teal bg-teal-tint" : "border-line hover:border-teal"
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-display font-semibold">{t.name}</span>
                    {t.highlighted && (
                      <span className="text-[10px] bg-teal text-white rounded-full px-2 py-0.5">Popular</span>
                    )}
                  </div>
                  <div className="text-2xl font-display font-semibold mb-1">
                    {t.price}
                    <span className="text-xs text-ink-soft font-body font-normal">/mo</span>
                  </div>
                  <div className="text-xs text-ink-soft mb-2">{t.credits} credits</div>
                  <div className="text-xs text-ink-soft">
                    {processing === t.id ? "Confirming payment…" : "Tap to choose"}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-3">
              Or top up credits, no subscription
            </p>
            <div className="grid grid-cols-3 gap-3">
              {topupPacks.map((p) => (
                <button
                  key={p.id}
                  onClick={() => buyTopup(p.id, p.credits)}
                  disabled={!!processing}
                  className="text-left rounded-2xl border border-line hover:border-tangerine p-3.5 transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center gap-1.5 text-tangerine-text mb-1.5">
                    <Zap size={13} />
                    <span className="text-lg font-display font-semibold text-ink">{p.price}</span>
                  </div>
                  <div className="text-xs text-ink-soft">{p.credits} credits</div>
                  <div className="text-xs text-ink-soft mt-1">
                    {processing === p.id ? "Adding…" : justAdded === p.id ? "Added!" : "Tap to buy"}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-ink-soft mt-4">
              Payments are simulated in this preview — Razorpay goes live once account setup is complete.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}