"use client";

import { pricingTiers, topupPacks } from "@/lib/dummy-data";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Check } from "lucide-react";
import { useApp, Tier } from "@/lib/app-context";
import Footer from "@/components/landing/Footer";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const { tier, setTier, triggerCelebration } = useApp();
  const router = useRouter();

  const choose = (id: string) => {
    setTier(id as Tier);
    triggerCelebration();
    setTimeout(() => router.push("/dashboard"), 100);
  };

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 pb-6 text-center">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-3">Simple, credit-based pricing</h1>
        <p className="text-ink-soft max-w-lg mx-auto">
          Every tier gets full commercial rights. Single global pricing — no watermark restrictions on any paid plan.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {pricingTiers.map((t) => (
          <Card
            key={t.id}
            className={`flex flex-col ${t.highlighted ? "border-teal ring-1 ring-teal" : ""} ${tier === t.id ? "bg-teal-tint/40" : ""}`}
          >
            {t.highlighted && (
              <span className="text-[10px] font-medium bg-teal text-white rounded-full px-2.5 py-1 w-fit mb-3">
                Most popular
              </span>
            )}
            <h3 className="font-display font-semibold text-xl mb-1">{t.name}</h3>
            <div className="mb-1">
              <span className="text-3xl font-display font-semibold">{t.price}</span>
              <span className="text-sm text-ink-soft">/mo</span>
            </div>
            <p className="text-xs text-ink-soft mb-4">{t.credits} credits / month</p>
            <p className="text-sm text-ink-soft mb-5">{t.blurb}</p>
            <ul className="space-y-2 mb-6 text-sm flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check size={15} className="text-teal-text shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Button
              variant={tier === t.id ? "secondary" : t.highlighted ? "primary" : "outline"}
              onClick={() => choose(t.id)}
              disabled={tier === t.id}
            >
              {tier === t.id ? "Current plan" : "Choose " + t.name}
            </Button>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
        <h2 className="font-display text-2xl font-semibold mb-2">Need more credits, no subscription?</h2>
        <p className="text-ink-soft mb-6">Top-up packs work with or without an active plan — no expiry on top-up credits.</p>
        <div className="grid sm:grid-cols-3 gap-5">
          {topupPacks.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div>
                <div className="text-xl font-display font-semibold">{p.price}</div>
                <div className="text-sm text-ink-soft">{p.credits} credits</div>
              </div>
              <Button size="sm" variant="outline">Buy</Button>
            </Card>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
