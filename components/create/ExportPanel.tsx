"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PaidBadge from "@/components/paywall/PaidBadge";
import NarrationDrawer, { type NarrationDrawerPage } from "@/components/create/NarrationDrawer";
import { exportOptions, bookSizes } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { Download, Droplet, X, AlertCircle, Clock } from "lucide-react";
import clsx from "clsx";

interface ExportPanelPage {
  id: string;
  page_number: number;
  audio_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  bookId: string;
  format: "classic" | "immersive";
  pageCount: number;
  /** Needed to know whether narration is complete before a narrated-video
   * or audiobook export — if it isn't, the narration drawer opens instead
   * of just showing an error telling the user to go do it elsewhere. */
  pages: ExportPanelPage[];
  /** Forwarded straight through to NarrationDrawer — lets the Preview page
   * keep its own page list in sync the instant narration succeeds, rather
   * than staying stale until a manual refresh (which was causing pages to
   * silently get re-narrated, and re-charged, even after already being
   * done via this exact drawer). */
  onPageNarrated?: (pageId: string, audioUrl: string) => void;
}

// Every export option now generates a real file — nothing left to gate as
// "Coming soon".
const LIVE_EXPORTS = new Set(["pdf", "pptx", "flipbook", "kdp", "etsy", "video_narrated", "video_silent", "audiobook"]);

// Most option ids match their route folder exactly (pdf -> /api/export/pdf).
// The two video ones use underscores in their id (matching the worker's
// jobType contract, already tested) but hyphens in their route folder —
// this maps between the two rather than renaming either.
const EXPORT_ROUTE: Record<string, string> = {
  video_narrated: "video-narrated",
  video_silent: "video-silent",
};

// These two need every page narrated before they can actually render.
const NEEDS_NARRATION = new Set(["video_narrated", "audiobook"]);

export default function ExportPanel({ open, onClose, bookId, format, pageCount, pages, onPageNarrated }: Props) {
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookSizeId, setBookSizeId] = useState<string>(bookSizes.find((s) => "default" in s && s.default)?.id ?? bookSizes[0].id);
  const [narrationDrawerFor, setNarrationDrawerFor] = useState<string | null>(null);

  const isLocked = (id: string) => isFree && !["pdf", "pptx"].includes(id);
  const belowMinPages = (opt: (typeof exportOptions)[number]) => "minPages" in opt && pageCount < (opt.minPages as number);

  const runExport = async (id: string) => {
    setError(null);
    setDownloading(id);
    try {
      const routePath = EXPORT_ROUTE[id] ?? id;
      const res = await fetch(`/api/export/${routePath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, bookSizeId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed — please try again.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || `storybook.${id}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed — please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const handleExport = async (id: string) => {
    if (isLocked(id)) return openUpgradeModal();
    if (!LIVE_EXPORTS.has(id)) return; // shouldn't happen now, but keep the fallback

    if (NEEDS_NARRATION.has(id) && pages.some((p) => !p.audio_url)) {
      // Missing narration — open the drawer to generate it instead of
      // just erroring and telling the user to go do it manually elsewhere.
      setNarrationDrawerFor(id);
      return;
    }

    await runExport(id);
  };

  const narrationPages: NarrationDrawerPage[] = pages.map((p) => ({
    id: p.id,
    pageNumber: p.page_number,
    hasNarration: !!p.audio_url,
  }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-[24px] w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold">Export your book</h2>
              <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Trim size — applies to PDF/PPTX now, will apply to KDP/Etsy in Phase 4 too */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1.5 block">
                Book size / trim
              </label>
              <div className="flex flex-wrap gap-1.5">
                {bookSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setBookSizeId(s.id)}
                    className={clsx(
                      "text-xs rounded-full px-3 py-1.5 border transition-colors",
                      bookSizeId === s.id ? "bg-teal text-white border-teal" : "border-line hover:border-teal"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {exportOptions.map((opt) => {
                const disabledByFormat = opt.immersiveOnly && format !== "immersive";
                const disabledByPages = belowMinPages(opt);
                const locked = isLocked(opt.id) && !disabledByFormat && !disabledByPages;
                const live = LIVE_EXPORTS.has(opt.id);
                const disabled = disabledByFormat || disabledByPages || (!live && !locked);
                const needsNarration = NEEDS_NARRATION.has(opt.id) && pages.some((p) => !p.audio_url) && pages.length > 0;
                return (
                  <button
                    key={opt.id}
                    onClick={() => !disabled && handleExport(opt.id)}
                    disabled={disabled || downloading === opt.id}
                    className={clsx(
                      "relative text-left rounded-2xl border p-4 transition-colors",
                      disabled
                        ? "opacity-50 border-line cursor-not-allowed"
                        : "border-line hover:border-teal hover:bg-teal-tint/30"
                    )}
                  >
                    {locked && <PaidBadge />}
                    <h3 className="font-display font-semibold mb-1 text-sm">{opt.label}</h3>
                    <p className="text-xs text-ink-soft mb-3">
                      {disabledByFormat
                        ? "Classic books export as PDF, PPTX, or KDP print files."
                        : disabledByPages
                        ? `Needs at least ${(opt as { minPages: number }).minPages} pages — this book has ${pageCount}.`
                        : needsNarration
                        ? "We'll help you generate narration first."
                        : opt.desc}
                    </p>
                    {isFree && (opt.id === "pdf" || opt.id === "pptx") && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-tangerine-text bg-tangerine-tint rounded-full px-2 py-0.5 w-fit mb-2">
                        <Droplet size={10} /> Watermarked
                      </span>
                    )}
                    {disabledByPages ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                        <AlertCircle size={13} /> Needs more pages
                      </span>
                    ) : !live && !locked ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                        <Clock size={13} /> Coming soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-text">
                        <Download size={13} /> {downloading === opt.id ? "Preparing…" : "Export"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-4">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-[11px] text-ink-soft mt-4">
              This book is automatically deleted 30 days after it was created. No backups are kept.
            </p>
          </motion.div>

          <NarrationDrawer
            open={!!narrationDrawerFor}
            onClose={() => setNarrationDrawerFor(null)}
            pages={narrationPages}
            exportKind={narrationDrawerFor === "audiobook" ? "audiobook" : "video"}
            onPageNarrated={onPageNarrated}
            onAllNarrated={() => {
              const id = narrationDrawerFor;
              setNarrationDrawerFor(null);
              if (id) runExport(id);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}