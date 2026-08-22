"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import Card from "@/components/ui/Card";
import { useApp } from "@/lib/app-context";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

export default function QuoteStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier } = useApp();
  const isFree = tier === "none";
  const [multiMode, setMultiMode] = useState(false);

  const baseCredits = 21; // 20 pages immersive, dummy
  const multiSlides = 4;
  const surcharge = multiSlides; // +1 per multi slide (2x on those slides = +1 extra)
  const total = multiMode ? baseCredits + surcharge : baseCredits;

  if (isFree) {
    return (
      <StepShell
        activeKey="quote"
        title="Ready to generate"
        subtitle="Free trial books render single-character framing automatically — no credit quote needed."
        onBack={`/create/${bookId}/characters`}
        onNext={() => router.push(`/create/${bookId}/generating`)}
        nextLabel="Generate your free storybook"
      >
        <Card className="bg-teal-tint border-teal/20 text-sm text-ink-soft">
          Your 6-page trial book (3 illustrated images) is included at no cost. Upgrade any time to unlock longer books,
          Immersive format, and multi-character scenes.
        </Card>
      </StepShell>
    );
  }

  return (
    <StepShell
      activeKey="quote"
      title="Your credit quote"
      subtitle="4 slides suggest multiple characters together. Choose how to render them before generating."
      onBack={`/create/${bookId}/characters`}
      onNext={() => router.push(`/create/${bookId}/generating`)}
      nextLabel={`Generate storybook — ${total} credits`}
    >
      <div className="space-y-4">
        <button
          onClick={() => setMultiMode(false)}
          className={clsx(
            "w-full text-left rounded-2xl border p-4",
            !multiMode ? "border-teal bg-teal-tint" : "border-line hover:border-teal"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Generate anyway (single-character framing)</span>
            <span className="text-sm font-display font-semibold">{baseCredits} credits</span>
          </div>
          <p className="text-xs text-ink-soft mt-1">
            Cheaper — same-frame technique (over-the-shoulder, cropped second character) keeps scenes readable.
          </p>
        </button>

        <button
          onClick={() => setMultiMode(true)}
          className={clsx(
            "w-full text-left rounded-2xl border p-4",
            multiMode ? "border-teal bg-teal-tint" : "border-line hover:border-teal"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Enable full multi-character for these 4 slides</span>
            <span className="text-sm font-display font-semibold">{baseCredits + surcharge} credits</span>
          </div>
          <p className="text-xs text-ink-soft mt-1">2x rate applies only to the 4 affected slides.</p>
        </button>

        <Card className="flex items-center justify-between bg-ink text-white">
          <span className="text-sm flex items-center gap-2"><Sparkles size={15} /> Total credit cost</span>
          <span className="font-display text-xl font-semibold">{total} credits</span>
        </Card>
      </div>
    </StepShell>
  );
}