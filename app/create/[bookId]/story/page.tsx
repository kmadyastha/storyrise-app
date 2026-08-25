"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import Card from "@/components/ui/Card";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { getBook, getStoryPages, updateStoryPage, generateStory, type Book, type StoryPage } from "@/lib/supabase/queries";
import { RefreshCw, Users, MapPin, Pencil, Check, X, BookOpen, ImageIcon, Save, AlertCircle, Sparkles } from "lucide-react";
import GenerationLoader from "@/components/ui/GenerationLoader";
import clsx from "clsx";

const NARRATION_MAX_WORDS = 40;
const IMAGE_DESC_MAX_WORDS = 30;

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function EditableField({
  value,
  onSave,
  maxWords,
  label,
  icon,
  toneClass,
  textClass,
  disabled,
  onLockedClick,
}: {
  value: string;
  onSave: (v: string) => void;
  maxWords: number;
  label: string;
  icon: React.ReactNode;
  toneClass: string;
  textClass: string;
  disabled?: boolean;
  onLockedClick?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const count = wordCount(draft);
  const overLimit = count > maxWords;

  const startEdit = () => {
    if (disabled) return onLockedClick?.();
    setDraft(value);
    setEditing(true);
  };

  const save = () => {
    if (overLimit) return;
    onSave(draft.trim());
    setEditing(false);
  };

  return (
    <div className={clsx("rounded-xl p-3", toneClass)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          {icon} {label}
        </span>
        {!editing && (
          <button onClick={startEdit} className="relative text-ink-soft hover:text-teal-text" aria-label={`Edit ${label}`}>
            <Pencil size={12} />
            {disabled && <PaidBadge inline />}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            className="w-full rounded-lg border border-line p-2 text-sm resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className={clsx("text-[11px]", overLimit ? "text-red-600 font-medium" : "text-ink-soft")}>
              {count} / {maxWords} words
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
              >
                <X size={12} /> Cancel
              </button>
              <button
                onClick={save}
                disabled={overLimit}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-text hover:text-teal disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check size={12} /> Save line
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className={textClass}>{value}</p>
      )}
    </div>
  );
}

export default function StoryStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";

  const [book, setBook] = useState<Book | null>(null);
  const [rows, setRows] = useState<StoryPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenCount, setRegenCount] = useState(0);
  const [savedToast, setSavedToast] = useState(false);

  const runGeneration = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateStory(bookId);
      setRows(
        result.pages.map((p, i) => ({
          id: `pending-${i}`, // replaced once we refetch real IDs below
          book_id: bookId,
          page_number: p.page,
          narration: p.narration,
          image_description: p.imageDescription,
          characters: p.characters,
          setting: p.setting,
          multi_character: p.multiCharacter,
          image_url: null,
          audio_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      );
      setBook((b) => (b ? { ...b, title: result.title } : b));
      // Refetch to get the real row IDs (needed so per-line edits can save).
      const supabase = createClient();
      const { data: freshPages } = await getStoryPages(supabase, bookId);
      if (freshPages) setRows(freshPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate your story — please try again.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data: bookData, error: bookErr } = await getBook(supabase, bookId);

        if (cancelled) return;

        if (bookErr || !bookData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setBook(bookData);

        const { data: pages } = await getStoryPages(supabase, bookId);
        if (cancelled) return;

        if (pages && pages.length > 0) {
          setRows(pages);
          setLoading(false);
        } else {
          setLoading(false);
          await runGeneration();
        }
      } catch {
        // Network-level failures (DNS, offline, etc.) reject rather than
        // returning a clean {error} — without this catch, loading would
        // hang forever instead of surfacing a usable state.
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const regenMessage =
    regenCount === 0
      ? "2 regenerations are free"
      : regenCount === 1
      ? "1 free regeneration remaining"
      : "This is your final free regeneration — further fixes cost credits";

  const regenerate = async () => {
    if (isFree) return openUpgradeModal();
    await runGeneration();
    setRegenCount((c) => c + 1);
  };

  const saveStory = () => {
    if (isFree) return openUpgradeModal();
    // Each line already persists itself the moment "Save line" is clicked —
    // this button is a reassuring confirmation, not a second write.
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  };

  const updateRow = async (rowId: string, field: "narration" | "image_description", value: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
    const supabase = createClient();
    await updateStoryPage(supabase, rowId, { [field]: value });
  };

  if (notFound) {
    return (
      <StepShell activeKey="story" title="Story not found" onBack="/create" hideFooter>
        <Card className="text-sm text-ink-soft">
          We couldn&rsquo;t find that book — it may have been deleted, or the link is out of date.
        </Card>
      </StepShell>
    );
  }

  if (loading || generating) {
    return (
      <StepShell activeKey="story" title={generating ? "Writing your story…" : "Loading…"} onBack="/create" hideFooter wide>
        {generating ? (
          <GenerationLoader
            messages={[
              "Reading your idea…",
              "Dreaming up characters…",
              "Sketching out the plot…",
              "Writing each page…",
              "This can take up to a minute or two for longer books…",
              "Almost there — polishing the story…",
            ]}
          />
        ) : (
          <div className="flex items-center gap-3 text-ink-soft text-sm">
            <Sparkles size={16} className="animate-pulse text-teal-text" />
            Loading your book…
          </div>
        )}
      </StepShell>
    );
  }

  return (
    <StepShell
      activeKey="story"
      title={book?.title ?? "Your story"}
      subtitle="Review the story below. Each page shows the narration and what the illustration will depict — edit either, or regenerate the whole thing."
      onBack="/create"
      onNext={() => router.push(`/create/${bookId}/characters`)}
      wide
    >
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <span className="text-xs text-ink-soft bg-paper border border-line rounded-full px-3 py-1.5">
          {regenMessage}
        </span>
        <div className="flex items-center gap-4">
          {savedToast && (
            <span className="text-xs font-medium text-green-text bg-green-tint rounded-full px-3 py-1.5">
              Story saved as written
            </span>
          )}
          <button
            onClick={saveStory}
            className="relative inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-teal-text"
          >
            <Save size={14} /> Save story
            {isFree && <PaidBadge inline />}
          </button>
          <button
            onClick={regenerate}
            className="relative inline-flex items-center gap-1.5 text-sm font-medium text-teal-text hover:text-teal disabled:opacity-50"
          >
            <RefreshCw size={14} /> Regenerate story
            {isFree && <PaidBadge inline />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.id} padded={false} className="p-4 sm:p-5">
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-teal-tint text-teal-text grid place-items-center text-xs font-medium">
                {row.page_number}
              </span>
              <div className="flex-1 min-w-0 space-y-2.5">
                <EditableField
                  value={row.narration}
                  onSave={(v) => updateRow(row.id, "narration", v)}
                  maxWords={NARRATION_MAX_WORDS}
                  label="Story"
                  icon={<BookOpen size={11} />}
                  toneClass="bg-teal-tint/40"
                  textClass="text-sm leading-relaxed text-ink"
                  disabled={isFree}
                  onLockedClick={openUpgradeModal}
                />
                <EditableField
                  value={row.image_description}
                  onSave={(v) => updateRow(row.id, "image_description", v)}
                  maxWords={IMAGE_DESC_MAX_WORDS}
                  label="Image description"
                  icon={<ImageIcon size={11} />}
                  toneClass="bg-paper"
                  textClass="text-xs italic text-ink-soft leading-relaxed"
                  disabled={isFree}
                  onLockedClick={openUpgradeModal}
                />
                <div className="flex flex-wrap gap-3 text-[11px] text-ink-soft pt-0.5">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {row.characters.join(", ")}
                    {row.multi_character && <span className="ml-1 text-tangerine-text bg-tangerine-tint rounded-full px-1.5">multi</span>}
                  </span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {row.setting}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isFree && (
        <p className="text-xs text-ink-soft mt-4">
          Editing individual lines, saving, and regenerating are paid features — tap any lock badge to upgrade.
        </p>
      )}
    </StepShell>
  );
}