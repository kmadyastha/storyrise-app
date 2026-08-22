"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PaidBadge from "@/components/paywall/PaidBadge";
import { exportOptions } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { Download, Droplet, X } from "lucide-react";
import clsx from "clsx";

interface Props {
  open: boolean;
  onClose: () => void;
  format: "classic" | "immersive";
}

export default function ExportPanel({ open, onClose, format }: Props) {
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const isLocked = (id: string) => isFree && !["pdf", "pptx"].includes(id);

  const handleExport = (id: string) => {
    if (isLocked(id)) return openUpgradeModal();
    setDownloaded(id);
    setTimeout(() => setDownloaded(null), 1800);
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
            className="bg-white rounded-[24px] w-full max-w-2xl p-6 shadow-2xl"
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

            <div className="grid sm:grid-cols-2 gap-3">
              {exportOptions.map((opt) => {
                const disabledByFormat = opt.immersiveOnly && format !== "immersive";
                const locked = isLocked(opt.id) && !disabledByFormat;
                return (
                  <button
                    key={opt.id}
                    onClick={() => !disabledByFormat && handleExport(opt.id)}
                    disabled={disabledByFormat}
                    className={clsx(
                      "relative text-left rounded-2xl border p-4 transition-colors",
                      disabledByFormat
                        ? "opacity-50 border-line cursor-not-allowed"
                        : "border-line hover:border-teal hover:bg-teal-tint/30"
                    )}
                  >
                    {locked && <PaidBadge />}
                    <h3 className="font-display font-semibold mb-1 text-sm">{opt.label}</h3>
                    <p className="text-xs text-ink-soft mb-3">
                      {disabledByFormat ? "Classic books export as PDF, PPTX, or KDP print files." : opt.desc}
                    </p>
                    {isFree && (opt.id === "pdf" || opt.id === "pptx") && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-tangerine-text bg-tangerine-tint rounded-full px-2 py-0.5 w-fit mb-2">
                        <Droplet size={10} /> Watermarked
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-text">
                      <Download size={13} /> {downloaded === opt.id ? "Downloaded!" : "Export"}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-ink-soft mt-4">
              Download or save your book — it will be automatically deleted 30 days from generation. No backups are kept.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}