"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How do credits work?",
    a: "Every generation — a story page, a character reference, a cover, an export — costs credits. Your plan grants a set number each month; unused credits on Growth tier roll over up to 50%.",
  },
  {
    q: "What's the difference between Classic and Immersive?",
    a: "Classic shows one full illustration per page with the story text as a caption underneath — a traditional picture-book look. Immersive keeps the illustration full-bleed too, with the narration overlaid directly on the art in a translucent text box, and is the only format that supports video export.",
  },
  {
    q: "Can I really publish to Amazon KDP?",
    a: "Yes — export a print-ready file with the correct trim size, spine width, and bleed margins for your page count, ready to upload directly to KDP or another print-on-demand service.",
  },
  {
    q: "Do characters actually stay consistent?",
    a: "Yes. Describe how each character looks once, and StoryRise keeps them recognizable — same face, same outfit, same art style — across every page and every scene they appear in.",
  },
  {
    q: "Do I own the rights to my book?",
    a: "Full commercial rights are included on every paid tier — sell it, print it, publish it, no restrictions. Free-trial exports are watermarked; upgrading removes that.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, cancel your subscription whenever you like — no lock-in. You keep access to your existing books and any remaining credits until the end of your billing period.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 px-10 bg-paper">
      <div className="text-center max-w-[600px] mx-auto mb-12">
        <div className="inline-block px-[18px] py-1.5 bg-tangerine-tint text-tangerine-text rounded-full text-[13px] font-semibold uppercase tracking-wide mb-4">
          Questions
        </div>
        <h2 className="font-fredoka font-bold text-5xl text-[#1a1a1a] mb-3 max-sm:text-[32px]">
          Frequently asked questions
        </h2>
        <p className="text-[17px] font-medium text-[#5a5a5a]">Everything you need to know before you start.</p>
      </div>

      <div className="max-w-[760px] mx-auto space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={faq.q}
              className={`bg-warm-white rounded-2xl border transition-colors ${
                isOpen ? "border-teal/30" : "border-black/[0.06]"
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-fredoka font-semibold text-[16px] text-[#1a1a1a]">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-teal-text transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-5 text-[15px] font-medium text-[#5a5a5a] leading-relaxed">{faq.a}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}