"use client";

import { use, useEffect, useRef, useState } from "react";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import ExportPanel from "@/components/create/ExportPanel";
import CoverDrawer from "@/components/create/CoverDrawer";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { getBook, getStoryPages, generatePageImage, generateNarration, type Book, type StoryPage } from "@/lib/supabase/queries";
import { NARRATOR_VOICES, DEFAULT_VOICE } from "@/lib/voices";
import {
  RefreshCw,
  AlertTriangle,
  Download,
  Palette,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Mic,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

export default function PreviewStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";

  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverGenerated, setCoverGenerated] = useState(false);

  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [narrating, setNarrating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: bookData, error: bookErr } = await getBook(supabase, bookId);
        if (bookErr || !bookData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setBook(bookData);

        const { data: pageData } = await getStoryPages(supabase, bookId);
        setPages(pageData ?? []);
        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    })();
  }, [bookId]);

  const page = pages[active];

  const regenerate = async () => {
    if (isFree) return openUpgradeModal();
    if (!page) return;
    setRegenerating(true);
    try {
      const { imageUrl } = await generatePageImage(page.id);
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, image_url: imageUrl } : p)));
    } catch {
      // Leave the existing image in place — the button just stops spinning.
    } finally {
      setRegenerating(false);
    }
  };

  const toggleNarration = async () => {
    if (!page) return;

    if (page.audio_url) {
      if (playing) {
        audioRef.current?.pause();
        setPlaying(false);
      } else {
        audioRef.current?.play();
        setPlaying(true);
      }
      return;
    }

    setNarrating(true);
    try {
      const { audioUrl } = await generateNarration(page.id, voice);
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, audio_url: audioUrl } : p)));
      setTimeout(() => {
        audioRef.current?.play();
        setPlaying(true);
      }, 100);
    } catch {
      // leave narrating state to clear below; user can retry the button
    } finally {
      setNarrating(false);
    }
  };

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, i));
    setActive(clamped);
    setPlaying(false);
    const thumb = filmstripRef.current?.children[clamped] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  if (notFound) {
    return (
      <StepShell activeKey="preview" title="Book not found" onBack="/create" hideFooter>
        <p className="text-sm text-ink-soft">We couldn&rsquo;t find that book — it may have been deleted.</p>
      </StepShell>
    );
  }

  if (loading || !page) {
    return (
      <StepShell activeKey="preview" title="Loading…" onBack={`/create/${bookId}/quote`} hideFooter>
        <div className="flex items-center gap-3 text-ink-soft text-sm">
          <Sparkles size={16} className="animate-pulse text-teal-text" />
          Loading your book…
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      activeKey="preview"
      title="Preview your book"
      subtitle="All your pages, in order below. Regenerate a single image, add narration, then export or design a cover whenever you're ready."
      onBack={`/create/${bookId}/quote`}
      hideFooter
      wide
    >
      {/* Primary actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setExportOpen(true)}
          className="inline-flex items-center gap-2 bg-ink text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-black transition-colors"
        >
          <Download size={15} /> Export
        </button>
        <button
          onClick={() => setCoverOpen(true)}
          className="inline-flex items-center gap-2 border border-line rounded-full px-5 py-2.5 text-sm font-medium hover:border-teal transition-colors"
        >
          {coverGenerated ? <Eye size={15} /> : <Palette size={15} />}
          {coverGenerated ? "View Cover" : "Create Cover"}
        </button>
      </div>

      {/* big centered main image */}
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-line bg-paper aspect-[4/3]">
          {page.image_url ? (
            <img
              src={page.image_url}
              alt={`Page ${page.page_number}`}
              className={clsx("w-full h-full object-cover", regenerating && "opacity-40")}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-ink-soft text-sm">
              <div className="text-center">
                <AlertTriangle size={20} className="mx-auto mb-2 text-tangerine-text" />
                This page couldn&rsquo;t be illustrated — try regenerating below.
              </div>
            </div>
          )}
          <div className="absolute inset-x-4 bottom-4 bg-white/95 backdrop-blur rounded-xl px-4 py-3 text-sm">
            {page.narration}
          </div>
          {regenerating && (
            <div className="absolute inset-0 grid place-items-center">
              <RefreshCw size={22} className="animate-spin text-ink-soft" />
            </div>
          )}

          <button
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-sm grid place-items-center disabled:opacity-0 transition-opacity"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => goTo(active + 1)}
            disabled={active === pages.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-sm grid place-items-center disabled:opacity-0 transition-opacity"
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="relative inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-full border border-line px-3.5 py-2 hover:border-teal disabled:opacity-50"
            >
              <RefreshCw size={13} /> Regenerate
              {isFree && <PaidBadge inline />}
            </button>

            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="text-xs font-medium rounded-full border border-line px-3 py-2 bg-white focus:outline-none focus:border-teal"
            >
              {NARRATOR_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>

            <button
              onClick={toggleNarration}
              disabled={narrating}
              className="relative inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-full border border-line px-3.5 py-2 hover:border-teal disabled:opacity-50"
            >
              {narrating ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : page.audio_url ? (
                playing ? <Pause size={13} /> : <Play size={13} />
              ) : (
                <Mic size={13} />
              )}
              {narrating ? "Generating…" : page.audio_url ? (playing ? "Pause" : "Play narration") : "Generate narration"}
              {isFree && <PaidBadge inline />}
            </button>
          </div>
          <span className="text-[11px] text-ink-soft">
            Page {active + 1} of {pages.length}
          </span>
        </div>

        {page.audio_url && (
          <audio
            ref={audioRef}
            src={page.audio_url}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}
      </div>

      {/* horizontal scrollable filmstrip — scales fine at 20+ pages, unlike a stacked side column */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2">{pages.length} pages</p>
        <div ref={filmstripRef} className="flex gap-2.5 overflow-x-auto thin-scroll pb-2">
          {pages.map((row, i) => (
            <button
              key={row.id}
              onClick={() => goTo(i)}
              className={clsx(
                "relative shrink-0 w-24 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors bg-paper",
                active === i ? "border-teal" : "border-transparent hover:border-line"
              )}
            >
              {row.image_url ? (
                <img src={row.image_url} alt={`Page ${row.page_number}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center">
                  <AlertTriangle size={14} className="text-tangerine-text" />
                </div>
              )}
              <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-white/90 rounded px-1">
                {row.page_number}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isFree && <p className="text-xs text-ink-soft mt-4">Per-slide regenerate and narration are paid features on the free trial.</p>}

      <div className="flex items-start gap-3 bg-tangerine-tint border border-tangerine/20 rounded-2xl p-4 mt-6 max-w-xl">
        <Clock size={16} className="text-tangerine-text shrink-0 mt-0.5" />
        <p className="text-xs text-ink-soft">
          Your book — and its cover, whether created today or a few days from now — is automatically deleted 30 days
          after this book was generated. No backups are kept.
        </p>
      </div>

      <ExportPanel open={exportOpen} onClose={() => setExportOpen(false)} format="immersive" />
      <CoverDrawer
        open={coverOpen}
        onClose={() => setCoverOpen(false)}
        onGenerated={() => setCoverGenerated(true)}
        bookTitle={book?.title ?? "Your story"}
      />
    </StepShell>
  );
}