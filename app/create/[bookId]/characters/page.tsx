"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import Card from "@/components/ui/Card";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { getBook, getCharacters, generateCharacterImage, updateBookStatus, type Character } from "@/lib/supabase/queries";
import { RefreshCw, Upload, Undo2, AlertCircle, Sparkles, Lock } from "lucide-react";

export default function CharactersStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";

  const [characters, setCharacters] = useState<Character[]>([]);
  const [bookComplete, setBookComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenCounts, setRegenCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const proceedToQuote = async () => {
    // Fire-and-forget: this is a resume-progress marker, not something the
    // user should ever be blocked on if it fails.
    updateBookStatus(bookId, "characters_confirmed").catch(() => {});
    router.push(`/create/${bookId}/quote`);
  };

  const generateFor = async (id: string) => {
    setBusy(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const { imageUrl } = await generateCharacterImage(id);
      setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, reference_image_url: imageUrl, custom_image_url: null } : c)));
    } catch (err) {
      setErrors((e) => ({ ...e, [id]: err instanceof Error ? err.message : "Generation failed" }));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await getCharacters(supabase, bookId);
        const list = data ?? [];
        setCharacters(list);
        setLoading(false);

        const { data: bookData } = await getBook(supabase, bookId);
        if (bookData) setBookComplete(bookData.status === "complete");

        // Auto-generate reference images for anyone who doesn't have one yet.
        for (const c of list) {
          if (!c.reference_image_url && !c.custom_image_url) {
            await generateFor(c.id);
          }
        }
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const regenerateImage = (id: string) => {
    if (isFree) return openUpgradeModal();
    if (bookComplete) return;
    setRegenCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    generateFor(id);
  };

  const handleUpload = async (id: string, file: File | undefined) => {
    if (!file) return;
    if (isFree) return openUpgradeModal();
    if (bookComplete) return;

    setBusy(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `characters/custom-${id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("book-assets").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("book-assets").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("characters")
        .update({ custom_image_url: data.publicUrl })
        .eq("id", id);
      if (updateError) throw updateError;

      setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, custom_image_url: data.publicUrl } : c)));
    } catch (err) {
      setErrors((e) => ({ ...e, [id]: err instanceof Error ? err.message : "Upload failed" }));
    } finally {
      setBusy(null);
    }
  };

  const revertToAI = async (id: string) => {
    if (bookComplete) return;
    const supabase = createClient();
    await supabase.from("characters").update({ custom_image_url: null }).eq("id", id);
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, custom_image_url: null } : c)));
  };

  if (loading) {
    return (
      <StepShell activeKey="characters" title="Loading…" onBack={`/create/${bookId}/story`} hideFooter bookId={bookId}>
        <div className="flex items-center gap-3 text-ink-soft text-sm">
          <Sparkles size={16} className="animate-pulse text-teal-text" />
          Loading your characters…
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      activeKey="characters"
      title="Meet your characters"
      subtitle="Every character from your story shows up here automatically. Human characters are described, never photographed — review each reference before continuing."
      onBack={`/create/${bookId}/story`}
      onNext={proceedToQuote}
      wide
      bookId={bookId}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {characters.map((c) => {
          const count = regenCounts[c.id] ?? 0;
          const freeUsed = count >= 1;
          const isBusy = busy === c.id;
          const activeImage = c.custom_image_url || c.reference_image_url;

          return (
            <Card key={c.id} padded={false} className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-paper">
                {activeImage ? (
                  <img src={activeImage} alt={c.name} className={`w-full h-full object-cover ${isBusy ? "opacity-40" : ""}`} />
                ) : (
                  <div className="w-full h-full grid place-items-center text-ink-soft text-xs">
                    {isBusy ? "Generating…" : "No image yet"}
                  </div>
                )}
                {isBusy && (
                  <div className="absolute inset-0 grid place-items-center">
                    <RefreshCw size={20} className="animate-spin text-ink-soft" />
                  </div>
                )}
                {c.custom_image_url && (
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

                {errors[c.id] && (
                  <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    <span>{errors[c.id]}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <button
                    onClick={() => regenerateImage(c.id)}
                    disabled={isBusy || bookComplete}
                    title={bookComplete ? "Images are fully generated — create a new book to change characters." : undefined}
                    className="relative inline-flex items-center gap-1.5 text-xs font-medium text-teal-text hover:text-teal disabled:opacity-50 disabled:hover:text-teal-text"
                  >
                    <RefreshCw size={12} />
                    {isFree ? "Regenerate image" : freeUsed ? "Regenerate again (1 credit)" : "Regenerate image (1 free)"}
                    {isFree && !bookComplete && <PaidBadge inline />}
                    {bookComplete && <Lock size={10} className="text-ink-soft" />}
                  </button>

                  {c.custom_image_url ? (
                    <button
                      onClick={() => revertToAI(c.id)}
                      disabled={bookComplete}
                      title={bookComplete ? "Images are fully generated — create a new book to change characters." : undefined}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink disabled:opacity-50"
                    >
                      <Undo2 size={12} /> Use AI image
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (bookComplete) return;
                        if (isFree) return openUpgradeModal();
                        fileInputs.current[c.id]?.click();
                      }}
                      disabled={bookComplete}
                      title={bookComplete ? "Images are fully generated — create a new book to change characters." : undefined}
                      className="relative inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink disabled:opacity-50 disabled:hover:text-ink-soft"
                    >
                      <Upload size={12} /> Upload your own
                      {isFree && !bookComplete && <PaidBadge inline />}
                      {bookComplete && <Lock size={10} className="text-ink-soft" />}
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