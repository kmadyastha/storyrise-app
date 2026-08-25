"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PaidBadge from "@/components/paywall/PaidBadge";
import { exportOptions, bookSizes } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { Download, Droplet, X, AlertCircle, Clock } from "lucide-react";
import clsx from "clsx";

interface Props {
  open: boolean;
  onClose: () => void;
  bookId: string;
  format: "classic" | "immersive";
  pageCount: number;
}

// Video/audiobook still need the Fly.io render pipeline (Phase 5) and aren't
// wired yet. Everything else — pdf, pptx, kdp, etsy — now generates a real
// file. Shown as "Coming soon" rather than faking a download, per/paid or not.
const LIVE_EXPORTS = new Set(["pdf", "pptx", "kdp", "etsy"]);

export default function ExportPanel({ open, onClose, bookId, format, pageCount }: Props) {
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookSizeId, setBookSizeId] = useState<string>(bookSizes.find((s) => "default" in s && s.default)?.id ?? bookSizes[0].id);

  const isLocked = (id: string) => isFree && !["pdf", "pptx"].includes(id);
  const belowMinPages = (opt: (typeof exportOptions)[number]) => "minPages" in opt && pageCount < (opt.minPages as number);

  const handleExport = async (id: string) => {
    if (isLocked(id)) return openUpgradeModal();
    if (!LIVE_EXPORTS.has(id)) return; // "Coming soon" cards aren't clickable — see disabled state below

    setError(null);
    setDownloading(id);
    try {
      const res = await fetch(`/api/export/${id}`, {
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
              Download or save your book — it will be automatically deleted 30 days from generation. No backups are kept.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}