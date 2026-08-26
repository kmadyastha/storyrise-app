"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NARRATOR_VOICES, DEFAULT_VOICE } from "@/lib/voices";
import { generateNarration } from "@/lib/supabase/queries";
import { X, AlertCircle, Mic, Check } from "lucide-react";
import clsx from "clsx";

export interface NarrationDrawerPage {
  id: string;
  pageNumber: number;
  hasNarration: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pages: NarrationDrawerPage[];
  /** Called once every page has narration — the caller (ExportPanel) is
   * responsible for actually triggering the video/audiobook export after
   * this fires, since this drawer's only job is getting narration done. */
  onAllNarrated: () => void;
  /** "video" mentions video-specific framing in the copy; "audiobook" is
   * the same flow, worded for audio only. */
  exportKind: "video" | "audiobook";
}

export default function NarrationDrawer({ open, onClose, pages, onAllNarrated, exportKind }: Props) {
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [generating, setGenerating] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<{ id: string; pageNumber: number; error: string }[]>([]);

  const missing = pages.filter((p) => !p.hasNarration && !doneIds.has(p.id));
  const totalMissing = pages.filter((p) => !p.hasNarration).length;
  const completedCount = totalMissing - missing.length;

  const generateAll = async () => {
    setGenerating(true);
    setFailed([]);
    for (const page of missing) {
      try {
        await generateNarration(page.id, voice);
        setDoneIds((prev) => new Set(prev).add(page.id));
      } catch (err) {
        setFailed((f) => [...f, { id: page.id, pageNumber: page.pageNumber, error: err instanceof Error ? err.message : "Failed" }]);
      }
    }
    setGenerating(false);
    // Only auto-hand-off to the actual export if every page genuinely has
    // narration now — a page with a real, visible failure shouldn't
    // silently skip straight to a video that's missing its audio.
    const stillMissing = pages.filter((p) => !p.hasNarration && !doneIds.has(p.id) && !failed.some((f) => f.id === p.id));
    if (stillMissing.length === 0 && failed.length === 0) {
      onAllNarrated();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!generating) onClose();
            }}
          />
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-[85] w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-display text-lg font-semibold">Generate narration first</h2>
              {!generating && (
                <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-ink-soft">
                {exportKind === "video"
                  ? "A narrated video needs every page voiced first. Pick a narrator, then generate the missing pages — this uses your narration credits, same as generating narration one page at a time."
                  : "An audiobook needs every page voiced first. Pick a narrator, then generate the missing pages — this uses your narration credits, same as generating narration one page at a time."}
              </p>

              <div>
                <label className="text-sm font-medium mb-2 block">Narrator voice</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  disabled={generating}
                  className="w-full rounded-xl border border-line px-4 py-2.5 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal disabled:opacity-60"
                >
                  {NARRATOR_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-line divide-y divide-line max-h-64 overflow-y-auto">
                {pages.map((p) => {
                  const isDone = p.hasNarration || doneIds.has(p.id);
                  const isFailed = failed.some((f) => f.id === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span>Page {p.pageNumber}</span>
                      {isFailed ? (
                        <span className="flex items-center gap-1 text-red-500 text-xs">
                          <AlertCircle size={13} /> Failed
                        </span>
                      ) : isDone ? (
                        <span className="flex items-center gap-1 text-green-text text-xs">
                          <Check size={13} /> Narrated
                        </span>
                      ) : (
                        <span className="text-ink-soft text-xs">Waiting</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {failed.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    {failed.length} page{failed.length === 1 ? "" : "s"} couldn&rsquo;t be narrated — try again, or continue and
                    handle those from Preview afterward.
                  </span>
                </div>
              )}

              <button
                onClick={generateAll}
                disabled={generating || missing.length === 0}
                className={clsx(
                  "w-full inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-colors",
                  generating || missing.length === 0
                    ? "bg-teal-tint text-teal-text/60 cursor-not-allowed"
                    : "bg-teal text-white hover:bg-teal-text"
                )}
              >
                <Mic size={15} />
                {generating
                  ? `Narrating… (${completedCount}/${totalMissing})`
                  : `Generate narration for ${totalMissing} page${totalMissing === 1 ? "" : "s"}`}
              </button>

              {failed.length > 0 && !generating && (
                <button
                  onClick={onAllNarrated}
                  className="w-full text-center text-xs font-medium text-ink-soft hover:text-ink"
                >
                  Continue anyway ({pages.length - failed.length} of {pages.length} pages ready)
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}