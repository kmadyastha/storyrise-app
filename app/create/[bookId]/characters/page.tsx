"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import Card from "@/components/ui/Card";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { dummyCharacters } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { RefreshCw, Upload, Undo2 } from "lucide-react";

export default function CharactersStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [regenCounts, setRegenCounts] = useState<Record<string, number>>({});
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const regenerateImage = (id: string) => {
    if (isFree) return openUpgradeModal();
    setRegenerating(id);
    setTimeout(() => {
      setRegenerating(null);
      setRegenCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
      // A fresh AI generation replaces any custom upload for that character.
      setCustomImages((c) => {
        const next = { ...c };
        delete next[id];
        return next;
      });
    }, 900);
  };

  const handleUpload = (id: string, file: File | undefined) => {
    if (!file) return;
    if (isFree) return openUpgradeModal();
    const url = URL.createObjectURL(file);
    setCustomImages((c) => ({ ...c, [id]: url }));
  };

  const revertToAI = (id: string) => {
    setCustomImages((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  };

  return (
    <StepShell
      activeKey="characters"
      title="Meet your characters"
      subtitle="Every character from your story shows up here automatically. Human characters are described, never photographed — review each reference before continuing."
      onBack={`/create/${bookId}/story`}
      onNext={() => router.push(`/create/${bookId}/quote`)}
      wide
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {dummyCharacters.map((c) => {
          const count = regenCounts[c.id] ?? 0;
          const freeUsed = count >= 1;
          const isRegenerating = regenerating === c.id;
          const customImage = customImages[c.id];

          return (
            <Card key={c.id} padded={false} className="overflow-hidden">
              <div className="relative">
                {customImage ? (
                  <img src={customImage} alt={c.name} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <IllustrationPlaceholder
                    color={c.color as "teal" | "lime" | "green" | "tangerine"}
                    seed={c.name.length}
                    className={isRegenerating ? "opacity-40" : ""}
                  />
                )}
                {isRegenerating && (
                  <div className="absolute inset-0 grid place-items-center">
                    <RefreshCw size={20} className="animate-spin text-ink-soft" />
                  </div>
                )}
                {customImage && (
                  <span className="absolute top-2 left-2 text-[10px] font-medium bg-white/90 rounded-full px-2 py-0.5">
                    Custom image
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-display font-semibold">{c.name}</h3>
                  <span className="text-[10px] text-ink-soft bg-paper border border-line rounded-full px-2 py-0.5">
                    {c.type === "human" ? "Described" : "Photo or description"}
                  </span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed mb-3">{c.description}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <button
                    onClick={() => regenerateImage(c.id)}
                    disabled={isRegenerating}
                    className="relative inline-flex items-center gap-1.5 text-xs font-medium text-teal-text hover:text-teal disabled:opacity-50"
                  >
                    <RefreshCw size={12} />
                    {isFree ? "Regenerate image" : freeUsed ? "Regenerate again (1 credit)" : "Regenerate image (1 free)"}
                    {isFree && <PaidBadge inline />}
                  </button>

                  {customImage ? (
                    <button
                      onClick={() => revertToAI(c.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                    >
                      <Undo2 size={12} /> Use AI image
                    </button>
                  ) : (
                    <button
                      onClick={() => (isFree ? openUpgradeModal() : fileInputs.current[c.id]?.click())}
                      className="relative inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                    >
                      <Upload size={12} /> Upload your own
                      {isFree && <PaidBadge inline />}
                    </button>
                  )}
                  <input
                    ref={(el) => {
                      fileInputs.current[c.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(c.id, e.target.files?.[0])}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </StepShell>
  );
}