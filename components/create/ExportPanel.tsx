"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PaidBadge from "@/components/paywall/PaidBadge";
import NarrationDrawer, { type NarrationDrawerPage } from "@/components/create/NarrationDrawer";
import { exportOptions, bookSizes } from "@/lib/dummy-data";
import { computeVideoCreditCost, AUDIOBOOK_EXPORT_COST } from "@/lib/credits";
import { useApp } from "@/lib/app-context";
import { Download, Droplet, X, AlertCircle, Clock, RefreshCw, FileText, Printer, ShoppingBag, Presentation, BookOpenCheck, Headphones, Film, Video } from "lucide-react";
import clsx from "clsx";

const EXPORT_ICONS: Record<string, { icon: typeof FileText; bg: string; fg: string }> = {
  pdf: { icon: FileText, bg: "bg-red-50", fg: "text-red-500" },
  kdp: { icon: Printer, bg: "bg-orange-50", fg: "text-orange-500" },
  etsy: { icon: ShoppingBag, bg: "bg-amber-50", fg: "text-amber-600" },
  pptx: { icon: Presentation, bg: "bg-blue-50", fg: "text-blue-500" },
  flipbook: { icon: BookOpenCheck, bg: "bg-teal-tint", fg: "text-teal-text" },
  audiobook: { icon: Headphones, bg: "bg-purple-50", fg: "text-purple-500" },
  video_silent: { icon: Film, bg: "bg-slate-100", fg: "text-slate-500" },
  video_narrated: { icon: Video, bg: "bg-pink-50", fg: "text-pink-500" },
};

const SLOW_EXPORTS = new Set(["video_narrated", "video_silent", "audiobook"]);

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
  /** Chosen once at book creation — illustrations were already generated to
   * match this shape, so it's shown here read-only, not re-selectable at
   * export time (that would create a mismatch between the actual image
   * proportions and the exported layout). */
  bookSizeId: string;
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

export default function ExportPanel({ open, onClose, bookId, format, pageCount, bookSizeId, pages, onPageNarrated }: Props) {
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [downloading, setDownloading] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!downloading) {
      queueMicrotask(() => setElapsedSeconds(0));
      return;
    }
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [downloading]);
  const [error, setError] = useState<string | null>(null);
  const [narrationDrawerFor, setNarrationDrawerFor] = useState<string | null>(null);

  const isLocked = (id: string) => isFree && !["pdf", "pptx"].includes(id);
  const belowMinPages = (opt: (typeof exportOptions)[number]) => "minPages" in opt && pageCount < (opt.minPages as number);

  const runSlowExport = async (id: string) => {
    setError(null);
    setDownloading(id);
    try {
      const startRes = await fetch(`/api/export/${id.replace(/_/g, "-")}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok || !startData.jobId) {
        throw new Error(startData.error || "Couldn't start the export — please try again.");
      }
      const jobId = startData.jobId;

      // Polling now happens entirely in the browser — no single server
      // function has to stay open for the whole render, so there's no
      // artificial ceiling tied to Vercel's own execution limits anymore.
      // ~10 minutes (200 x 3s) is a generous real cap for even a long
      // book, not a number chosen to fit inside someone else's timeout.
      let status = "queued";
      for (let attempt = 0; attempt < 200; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(`/api/export/render-status?jobId=${jobId}`);
        const statusData = await statusRes.json().catch(() => ({}));
        if (!statusRes.ok) throw new Error(statusData.error || "Lost track of the render job.");
        status = statusData.status;
        if (status === "error") throw new Error(statusData.error || "Rendering failed.");
        if (status === "done") break;
      }
      if (status !== "done") {
        throw new Error("Rendering took too long and was cut off — please try again, or try a shorter book.");
      }

      const resultRes = await fetch(`/api/export/render-result?jobId=${jobId}&jobType=${id}&bookId=${bookId}`);
      if (!resultRes.ok) {
        const data = await resultRes.json().catch(() => ({}));
        throw new Error(data.error || "Rendering finished but the file couldn't be fetched.");
      }

      const blob = await resultRes.blob();
      const disposition = resultRes.headers.get("content-disposition") || "";
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

  const runExport = async (id: string) => {
    if (SLOW_EXPORTS.has(id)) return runSlowExport(id);

    setError(null);
    setDownloading(id);
    try {
      const routePath = EXPORT_ROUTE[id] ?? id;
      const res = await fetch(`/api/export/${routePath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
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
          className="fixed inset-0 z-[80] bg-ink/40 grid place-items-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* No backdrop-blur, no transform-based entrance (opacity only),
              and the card owns its own bounded height + scroll with a
              fixed header — all found to matter for reliable touch/scroll
              behavior on mobile. The close button living outside the
              scrollable area means it's always reachable even if the
              content itself somehow fails to scroll. */}
          <motion.div
            className="bg-white rounded-[24px] w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
              <h2 className="font-display text-xl font-semibold">Export your book</h2>
              <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
            <p className="text-xs text-ink-soft mb-5">
              Book size:{" "}
              <span className="font-medium text-ink">{bookSizes.find((s) => s.id === bookSizeId)?.label ?? bookSizeId}</span>
              <span className="text-ink-soft"> — set when this book was created, since illustrations were generated to match it.</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {exportOptions.map((opt) => {
                const disabledByFormat = opt.immersiveOnly && format !== "immersive";
                const disabledByPages = belowMinPages(opt);
                const locked = isLocked(opt.id) && !disabledByFormat && !disabledByPages;
                const live = LIVE_EXPORTS.has(opt.id);
                const disabled = disabledByFormat || disabledByPages || (!live && !locked);
                const needsNarration = NEEDS_NARRATION.has(opt.id) && pages.some((p) => !p.audio_url) && pages.length > 0;
                const iconInfo = EXPORT_ICONS[opt.id];
                const Icon = iconInfo?.icon ?? FileText;
                return (
                  <button
                    key={opt.id}
                    onClick={() => !disabled && handleExport(opt.id)}
                    disabled={disabled || downloading === opt.id}
                    className={clsx(
                      "relative flex flex-col items-center text-center rounded-2xl border p-3 transition-colors",
                      disabled
                        ? "opacity-50 border-line cursor-not-allowed"
                        : "border-line hover:border-teal hover:bg-teal-tint/30"
                    )}
                  >
                    {locked && <PaidBadge />}
                    <div className={clsx("w-10 h-10 rounded-xl grid place-items-center mb-2", iconInfo?.bg ?? "bg-teal-tint")}>
                      <Icon size={18} className={iconInfo?.fg ?? "text-teal-text"} />
                    </div>
                    <h3 className="font-display font-semibold text-xs mb-1">{opt.label}</h3>
                    <p className="text-[10px] text-ink-soft mb-2 leading-snug">
                      {disabledByFormat
                        ? "Classic-only books can't use this format."
                        : disabledByPages
                        ? `Needs ${(opt as { minPages: number }).minPages}+ pages`
                        : needsNarration
                        ? "We'll help narrate first"
                        : opt.desc}
                    </p>
                    {isFree && (opt.id === "pdf" || opt.id === "pptx") && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-tangerine-text bg-tangerine-tint rounded-full px-1.5 py-0.5 w-fit mb-1.5">
                        <Droplet size={9} /> Watermarked
                      </span>
                    )}
                    {!isFree && !needsNarration && !disabled && (opt.id === "video_narrated" || opt.id === "video_silent") && (
                      <span className="inline-block text-[10px] text-teal-text bg-teal-tint rounded-full px-1.5 py-0.5 mb-1.5">
                        {computeVideoCreditCost(pageCount)} credits
                      </span>
                    )}
                    {!isFree && !needsNarration && !disabled && opt.id === "audiobook" && (
                      <span className="inline-block text-[10px] text-teal-text bg-teal-tint rounded-full px-1.5 py-0.5 mb-1.5">
                        {AUDIOBOOK_EXPORT_COST} credits
                      </span>
                    )}
                    {disabledByPages ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft">
                        <AlertCircle size={12} /> More pages
                      </span>
                    ) : !live && !locked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft">
                        <Clock size={12} /> Soon
                      </span>
                    ) : downloading === opt.id ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-text">
                        <RefreshCw size={12} className="animate-spin" />
                        {SLOW_EXPORTS.has(opt.id) ? `${elapsedSeconds}s` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-text">
                        <Download size={12} /> Export
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {downloading && SLOW_EXPORTS.has(downloading) && elapsedSeconds > 20 && (
              <p className="text-[11px] text-ink-soft text-center mt-2">Rendering can take a couple of minutes for longer books.</p>
            )}

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-4">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-[11px] text-ink-soft mt-4">
              This book is automatically deleted 30 days after it was created. No backups are kept.
            </p>
            </div>
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