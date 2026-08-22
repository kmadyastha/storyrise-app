"use client";

import { useRouter } from "next/navigation";
import { useApp, Tier } from "@/lib/app-context";
import { pricingTiers, topupPacks } from "@/lib/dummy-data";

export default function PricingSection() {
  const { tier, setTier, triggerCelebration } = useApp();
  const router = useRouter();

  const choose = (id: string) => {
    setTier(id as Tier);
    triggerCelebration();
    setTimeout(() => router.push("/dashboard"), 100);
  };

  return (
    <section id="pricing" className="py-[100px] px-10 bg-gradient-to-b from-paper via-warm-white to-paper">
      <div className="text-center max-w-[700px] mx-auto mb-[60px]">
        <h2 className="font-fredoka font-bold text-5xl text-[#1a1a1a] mb-3 max-sm:text-[32px]">
          Simple, credit-based pricing
        </h2>
        <p className="text-[17px] font-medium text-[#5a5a5a] leading-relaxed">
          Every tier gets full commercial rights. Single global pricing — no watermark restrictions on any paid plan.
        </p>
      </div>

      {/* Subscription Plans */}
      <div className="max-w-[1200px] mx-auto mb-[60px] grid grid-cols-4 gap-6 items-start max-lg:grid-cols-2 max-sm:grid-cols-1">
        {pricingTiers.map((plan) => {
          const isCurrent = tier === plan.id;
          return (
            <div
              key={plan.id}
              className={`bg-warm-white rounded-3xl p-9 px-7 border-[1.5px] transition-all hover:-translate-y-1.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] relative ${
                plan.highlighted
                  ? "border-teal shadow-[0_8px_32px_rgba(0,188,200,0.12)] scale-[1.03] max-lg:scale-100"
                  : "border-black/[0.06]"
              } ${isCurrent ? "ring-2 ring-teal ring-offset-2" : ""}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal text-white font-fredoka font-semibold text-xs px-4 py-1.5 rounded-full tracking-wide">
                  Most popular
                </div>
              )}
              <div className="font-fredoka font-semibold text-xl text-[#1a1a1a] mb-1">{plan.name}</div>
              <div className="font-fredoka font-bold text-4xl text-[#1a1a1a] mb-1">
                {plan.price}
                <span className="text-base font-medium text-[#999]">/mo</span>
              </div>
              <div className="text-sm text-[#888] mb-4">{plan.credits} credits / month</div>
              <div className="text-sm font-medium text-[#5a5a5a] leading-relaxed mb-5 min-h-[42px]">{plan.blurb}</div>
              <ul className="list-none mb-7">
                {plan.features.map((feat) => (
                  <li key={feat} className="text-sm text-[#555] py-1.5 flex items-start gap-2.5 leading-snug">
                    <span className="text-teal font-bold flex-shrink-0 mt-px">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choose(plan.id)}
                disabled={isCurrent}
                className={`w-full py-3.5 rounded-full font-fredoka font-semibold text-[15px] cursor-pointer transition-all border-2 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
                  plan.highlighted
                    ? "bg-teal text-white border-teal hover:bg-teal-text hover:border-teal-text"
                    : "bg-transparent text-teal-text border-teal hover:bg-teal hover:text-white"
                }`}
              >
                {isCurrent ? "Current plan" : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Top-up Section */}
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-8">
          <div className="font-fredoka font-semibold text-[22px] text-[#1a1a1a] mb-1.5">
            Need more credits, no subscription?
          </div>
          <div className="text-[15px] font-medium text-[#5a5a5a]">
            Top-up packs work with or without an active plan — no expiry on top-up credits.
          </div>
        </div>
        <div className="grid grid-cols-3 gap-5 max-w-[900px] mx-auto max-sm:grid-cols-1 max-sm:max-w-[400px]">
          {topupPacks.map((t) => (
            <div
              key={t.id}
              className="bg-warm-white rounded-[20px] px-6 py-7 border-[1.5px] border-black/[0.06] flex items-center justify-between transition-all hover:border-teal/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[3px]"
            >
              <div className="flex flex-col gap-1">
                <div className="font-fredoka font-bold text-2xl text-[#1a1a1a]">{t.price}</div>
                <div className="text-sm text-[#888]">{t.credits} credits</div>
              </div>
              <button className="px-6 py-2.5 rounded-full font-fredoka font-semibold text-sm cursor-pointer transition-all border-2 border-teal bg-transparent text-teal-text hover:bg-teal hover:text-white">
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}