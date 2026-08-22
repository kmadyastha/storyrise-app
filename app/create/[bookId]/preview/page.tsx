"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { dummyStoryTable } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { RefreshCw, AlertTriangle } from "lucide-react";
import clsx from "clsx";

const colors = ["teal", "lime", "green", "tangerine"] as const;

export default function PreviewStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [active, setActive] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const failedIndex = 2; // dummy: page 3 flagged as system-detected failure, auto-retried

  const page = dummyStoryTable[active];
  const color = colors[active % colors.length];

  const regenerate = () => {
    if (isFree) return openUpgradeModal();
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 1000);
  };

  return (
    <StepShell
      activeKey="preview"
      title="Preview your book"
      subtitle="Scroll through every page. Regenerate a single image if you don't like the composition."
      onBack={`/create/${bookId}/quote`}
      onNext={() => router.push(`/create/${bookId}/cover`)}
      wide
    >
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="relative rounded-2xl overflow-hidden border border-line">
          <IllustrationPlaceholder color={color} seed={active + 1} className={clsx(regenerating && "opacity-40")} />
          <div className="absolute inset-x-4 bottom-4 bg-white/95 backdrop-blur rounded-xl px-4 py-3 text-sm">
            {page.narration}
          </div>
          {regenerating && (
            <div className="absolute inset-0 grid place-items-center">
              <RefreshCw size={22} className="animate-spin text-ink-soft" />
            </div>
          )}
        </div>

        <div className="flex md:flex-col gap-2">
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="relative inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-full border border-line px-4 py-2.5 hover:border-teal disabled:opacity-50"
          >
            <RefreshCw size={14} /> Regenerate
            {isFree && <PaidBadge inline />}
          </button>
          <span className="text-[11px] text-ink-soft px-1">Page {active + 1} of {dummyStoryTable.length}</span>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto thin-scroll mt-5 pb-2">
        {dummyStoryTable.map((row, i) => (
          <button
            key={row.page}
            onClick={() => setActive(i)}
            className={clsx(
              "relative shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2",
              active === i ? "border-teal" : "border-transparent"
            )}
          >
            <IllustrationPlaceholder color={colors[i % colors.length]} seed={i + 1} className="w-full h-full" />
            {i === failedIndex && (
              <span className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-tangerine-text">
                <AlertTriangle size={11} />
              </span>
            )}
          </button>
        ))}
      </div>

      {isFree && (
        <p className="text-xs text-ink-soft mt-4">
          Per-slide regenerate is a paid feature on the free trial.
        </p>
      )}
    </StepShell>
  );
}
