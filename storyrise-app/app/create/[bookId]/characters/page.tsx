"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import Card from "@/components/ui/Card";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import Button from "@/components/ui/Button";
import { dummyCharacters } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { Wand2 } from "lucide-react";

export default function CharactersStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [adjustCounts, setAdjustCounts] = useState<Record<string, number>>({});

  const adjust = (id: string) => {
    if (isFree) return openUpgradeModal();
    setAdjustCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };

  return (
    <StepShell
      activeKey="characters"
      title="Meet your characters"
      subtitle="Human characters are described, never photographed. Review each reference image before continuing."
      onBack={`/create/${bookId}/story`}
      onNext={() => router.push(`/create/${bookId}/style`)}
      wide
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {dummyCharacters.map((c) => {
          const count = adjustCounts[c.id] ?? 0;
          const freeUsed = count >= 1;
          return (
            <Card key={c.id} padded={false} className="overflow-hidden">
              <IllustrationPlaceholder color={c.color as "teal" | "lime" | "green" | "tangerine"} seed={c.name.length} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-display font-semibold">{c.name}</h3>
                  <span className="text-[10px] text-ink-soft bg-paper border border-line rounded-full px-2 py-0.5">
                    {c.type === "human" ? "Described" : "Photo or description"}
                  </span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed mb-3">{c.description}</p>
                <button
                  onClick={() => adjust(c.id)}
                  className="relative inline-flex items-center gap-1.5 text-xs font-medium text-teal-text hover:text-teal"
                >
                  <Wand2 size={12} />
                  {isFree ? "Request adjustment" : freeUsed ? "Adjust again (1 credit)" : "Request adjustment (1 free)"}
                  {isFree && <PaidBadge inline />}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="outline" size="sm" disabled>
          + Add another character
        </Button>
      </div>
    </StepShell>
  );
}
