"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import Card from "@/components/ui/Card";
import { dummyStoryTable } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { RefreshCw, Users, MapPin } from "lucide-react";

export default function StoryStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [regenCount, setRegenCount] = useState(0);
  const [regenerating, setRegenerating] = useState(false);

  const regenMessage =
    regenCount === 0
      ? "2 regenerations are free"
      : regenCount === 1
      ? "1 free regeneration remaining"
      : "This is your final free regeneration — further fixes cost credits";

  const regenerate = () => {
    if (isFree) return openUpgradeModal();
    setRegenerating(true);
    setTimeout(() => {
      setRegenerating(false);
      setRegenCount((c) => c + 1);
    }, 900);
  };

  return (
    <StepShell
      activeKey="story"
      title="Lumo and the Lantern Forest"
      subtitle="Review the story table below. Regenerate the whole story, or continue to your characters."
      onBack="/create"
      onNext={() => router.push(`/create/${bookId}/characters`)}
      wide
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <span className="text-xs text-ink-soft bg-paper border border-line rounded-full px-3 py-1.5">
          {regenerating ? "Regenerating story…" : regenMessage}
        </span>
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="relative inline-flex items-center gap-1.5 text-sm font-medium text-teal-text hover:text-teal disabled:opacity-50"
        >
          <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} /> Regenerate story
          {isFree && <PaidBadge inline />}
        </button>
      </div>

      <div className="space-y-3">
        {dummyStoryTable.map((row) => (
          <Card key={row.page} padded={false} className="p-4 sm:p-5 flex gap-4">
            <span className="shrink-0 w-8 h-8 rounded-full bg-teal-tint text-teal-text grid place-items-center text-xs font-medium">
              {row.page}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed mb-2.5">{row.narration}</p>
              <p className="text-xs text-ink-soft italic mb-2.5">&ldquo;{row.imageDescription}&rdquo;</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-ink-soft">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {row.characters.join(", ")}
                  {row.multiCharacter && <span className="ml-1 text-tangerine-text bg-tangerine-tint rounded-full px-1.5">multi</span>}
                </span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {row.setting}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isFree && (
        <p className="text-xs text-ink-soft mt-4">
          Editing individual rows and regenerating is a paid feature — tap the badge above to upgrade.
        </p>
      )}
    </StepShell>
  );
}
