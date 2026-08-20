"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useApp, Tier } from "@/lib/app-context";
import { pricingTiers } from "@/lib/dummy-data";
import { Trash2, Sparkles } from "lucide-react";

export default function AccountPage() {
  const { tier, setTier, credits, triggerCelebration, openUpgradeModal } = useApp();
  const canDelete = tier !== "none";

  return (
    <section className="mx-auto max-w-2xl px-5 sm:px-8 py-10">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold mb-8">Account</h1>

      <Card className="mb-5">
        <h2 className="font-medium mb-1">Plan</h2>
        <p className="text-sm text-ink-soft mb-4">
          {tier === "none" ? "Free trial" : pricingTiers.find((t) => t.id === tier)?.name} · {credits} credits
          available
        </p>
        <Button size="sm" onClick={openUpgradeModal}>
          <Sparkles size={14} /> {tier === "none" ? "Upgrade" : "Change plan"}
        </Button>
      </Card>

      <Card className="mb-5">
        <h2 className="font-medium mb-1">Delete account</h2>
        <p className="text-sm text-ink-soft mb-4">
          {canDelete
            ? "Deleting cancels your active subscription immediately and removes all your data."
            : "Free-trial accounts can't self-delete — this prevents repeated trial abuse. Upgrade to enable this."}
        </p>
        <Button size="sm" variant="secondary" disabled={!canDelete}>
          <Trash2 size={14} /> Delete my account
        </Button>
      </Card>

      <Card className="border-dashed">
        <h2 className="font-medium mb-1 text-sm text-ink-soft">Preview controls (demo only)</h2>
        <p className="text-xs text-ink-soft mb-4">
          Simulates what a real Razorpay-confirmed webhook does — jump straight to the celebration moment or swap
          tiers to see gating change across the app.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={triggerCelebration}>
            Replay Pro celebration
          </Button>
          {(["none", "starter", "pro"] as Tier[]).map((t) => (
            <Button key={t} size="sm" variant="ghost" onClick={() => setTier(t)}>
              Set tier: {t}
            </Button>
          ))}
        </div>
      </Card>
    </section>
  );
}
