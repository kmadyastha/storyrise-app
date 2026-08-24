"use client";

import { pricingTiers, topupPacks } from "@/lib/dummy-data";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Check, Minus } from "lucide-react";
import { useApp, Tier } from "@/lib/app-context";
import Footer from "@/components/landing/Footer";
import { useRouter } from "next/navigation";

// Feature-by-tier comparison — a superset of what's on the pricing cards,
// laid out as rows so tiers can actually be compared side by side.
const comparisonRows: { label: string; values: (boolean | string)[] }[] = [
  { label: "Classic & Immersive formats", values: [true, true, true, true] },
  { label: "Full commercial rights, no watermark", values: [true, true, true, true] },
  { label: "PDF, PPTX, KDP & Etsy export", values: [true, true, true, true] },
  { label: "Narrated video & audiobook export", values: [true, true, true, true] },
  { label: "Priority generation queue", values: [false, true, true, true] },
  { label: "Credit rollover", values: ["—", "50%", "50%", "50%"] },
  { label: "Multi-character scenes at scale", values: [false, false, true, true] },
  { label: "Monthly credits", values: ["60", "130", "210", "360"] },
];

// What a credit actually buys — the thing StoryBee-style pricing pages make
// explicit and StoryRise's landing page only summarizes in one line.
const creditCosts = [
  { op: "Story generation (whole book)", cost: "1 credit" },
  { op: "Character reference image", cost: "1 credit (1 free redo per character)" },
  { op: "Page illustration", cost: "1 credit per page" },
  { op: "Narration (per page)", cost: "1 credit — not available on the free trial" },
  { op: "Multi-character scene (per affected page)", cost: "2x the single-character rate" },
  { op: "Story regeneration (whole table)", cost: "1 credit (2 free regens per book)" },
  { op: "KDP print file", cost: "9–20 credits, based on page count" },
];

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

      {/* Full feature comparison table */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
        <h2 className="font-display text-2xl font-semibold mb-6">Compare every plan</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-paper border-b border-line">
                <th className="text-left font-medium text-ink-soft px-4 py-3">Feature</th>
                {pricingTiers.map((t) => (
                  <th key={t.id} className="text-center font-display font-semibold text-ink px-4 py-3">
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 1 ? "bg-paper/50" : ""}>
                  <td className="px-4 py-3 text-ink-soft">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className="px-4 py-3 text-center">
                      {typeof v === "boolean" ? (
                        v ? (
                          <Check size={16} className="text-teal-text mx-auto" />
                        ) : (
                          <Minus size={16} className="text-ink-soft/40 mx-auto" />
                        )
                      ) : (
                        <span className="font-medium">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What a credit buys */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
        <h2 className="font-display text-2xl font-semibold mb-2">What does a credit cover?</h2>
        <p className="text-ink-soft mb-6 max-w-2xl">
          Every generation costs a whole number of credits — no fractional pricing anywhere.
        </p>
        <div className="rounded-2xl border border-line divide-y divide-line">
          {creditCosts.map((c) => (
            <div key={c.op} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-sm text-ink">{c.op}</span>
              <span className="text-sm font-medium text-teal-text whitespace-nowrap">{c.cost}</span>
            </div>
          ))}
        </div>
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