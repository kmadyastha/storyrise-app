"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NARRATOR_VOICES, DEFAULT_VOICE } from "@/lib/voices";
import { generateNarration } from "@/lib/supabase/queries";
import { X, AlertCircle, Mic, Check, PlayCircle, PauseCircle, PartyPopper } from "lucide-react";
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
  /** Fired the moment each individual page's narration succeeds — lets the
   * caller keep its own page list in sync live, rather than only finding
   * out once (or if) everything finishes. This is what actually prevents
   * the "already narrated, but the button still says Generate" bug: the
   * caller's own state gets the real audio_url the instant it exists. */
  onPageNarrated?: (pageId: string, audioUrl: string) => void;
  /** Called once every page has narration. Optional — when this drawer is
   * opened directly (not as part of an export handoff), there's nothing to
   * hand off to, so the drawer just shows a completion state instead. */
  onAllNarrated?: () => void;
  /** "video" mentions video-specific framing in the copy; "audiobook" is
   * the same flow, worded for audio only; "book" is used when opened
   * directly from Preview with no specific export in mind. */
  exportKind: "video" | "audiobook" | "book";
}

export default function NarrationDrawer({ open, onClose, pages, onPageNarrated, onAllNarrated, exportKind }: Props) {
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [generating, setGenerating] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<{ id: string; pageNumber: number; error: string }[]>([]);
  const [allDone, setAllDone] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [runTotal, setRunTotal] = useState(0);
  const [runCompleted, setRunCompleted] = useState(0);

  const missing = pages.filter((p) => !p.hasNarration && !doneIds.has(p.id));
  const totalMissing = pages.filter((p) => !p.hasNarration).length;

  const previewVoice = async () => {
    if (previewingVoice) return;
    setPreviewingVoice(true);
    try {
      const res = await fetch("/api/preview-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice }),
      });
      if (!res.ok) throw new Error("Couldn't play a preview — please try again.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoice(false);
      audio.play();
    } catch {
      setPreviewingVoice(false);
    }
  };

  const generateAll = async () => {
    setGenerating(true);
    setFailed([]);
    // Fixed for the whole run, captured once — must NOT be read live from
    // `missing`/`totalMissing` later, since those are derived from the
    // `pages` prop, which shrinks in lockstep as onPageNarrated fires for
    // each success. That was exactly why the progress readout showed the
    // total counting down instead of completed counting up.
    const pagesToRun = missing;
    setRunTotal(pagesToRun.length);
    setRunCompleted(0);
    let completed = 0;
    // Tracked locally (not via React state) specifically to avoid a stale-
    // closure bug: state setters don't update local variables within the
    // same function run, so checking doneIds/failed (the state) right after
    // the loop would read pre-loop values, not what actually just happened.
    const newlyFailed: { id: string; pageNumber: number; error: string }[] = [];

    for (const page of pagesToRun) {
      try {
        const { audioUrl } = await generateNarration(page.id, voice);
        setDoneIds((prev) => new Set(prev).add(page.id));
        onPageNarrated?.(page.id, audioUrl);
      } catch (err) {
        const failure = { id: page.id, pageNumber: page.pageNumber, error: err instanceof Error ? err.message : "Failed" };
        newlyFailed.push(failure);
        setFailed((f) => [...f, failure]);
      }
      completed += 1;
      setRunCompleted(completed);
    }

    setGenerating(false);

    if (newlyFailed.length === 0) {
      setAllDone(true);
      if (onAllNarrated) {
        // Give the success state a moment to actually be seen before
        // handing off, rather than vanishing the instant it's done.
        setTimeout(() => onAllNarrated(), 900);
      }
    }
  };

  const handleClose = () => {
    setAllDone(false);
    onClose();
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
              if (!generating) handleClose();
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
              <h2 className="font-display text-lg font-semibold">
                {allDone ? "All set!" : "Generate narration"}
              </h2>
              {!generating && (
                <button onClick={handleClose} className="text-ink-soft hover:text-ink" aria-label="Close">
                  <X size={20} />
                </button>
              )}
            </div>

            {allDone ? (
              <div className="p-6 flex flex-col items-center text-center py-16">
                <div className="w-16 h-16 rounded-full bg-green-tint text-green-text grid place-items-center mb-4">
                  <PartyPopper size={28} />
                </div>
                <p className="font-display text-lg font-semibold mb-1">Every page is narrated</p>
                <p className="text-sm text-ink-soft mb-6">
                  {onAllNarrated ? "Taking you back to finish your export…" : "You're all set — narration is ready whenever you export."}
                </p>
                {!onAllNarrated && (
                  <button
                    onClick={handleClose}
                    className="bg-teal text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-teal-text"
                  >
                    Done
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <p className="text-sm text-ink-soft">
                  {exportKind === "video" &&
                    "A narrated video needs every page voiced first. Pick a narrator, preview it if you like, then generate the missing pages."}
                  {exportKind === "audiobook" &&
                    "An audiobook needs every page voiced first. Pick a narrator, preview it if you like, then generate the missing pages."}
                  {exportKind === "book" &&
                    "Pick a narrator, preview it if you like, then generate narration for every page that doesn't have it yet."}
                </p>

                <div>
                  <label className="text-sm font-medium mb-2 block">Narrator voice</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      disabled={generating}
                      className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal disabled:opacity-60"
                    >
                      {NARRATOR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={previewVoice}
                      disabled={previewingVoice || generating}
                      title="Preview this voice"
                      className="shrink-0 w-10 h-10 rounded-xl border border-line grid place-items-center text-teal-text hover:border-teal disabled:opacity-50"
                    >
                      {previewingVoice ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-soft mt-1.5">Sample previews are free — only the real narration below uses credits.</p>
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
                      {failed.length} page{failed.length === 1 ? "" : "s"} couldn&rsquo;t be narrated — try again, or continue
                      and handle those from Preview afterward.
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
                    ? `Narrating… (${runCompleted}/${runTotal})`
                    : `Generate narration for ${totalMissing} page${totalMissing === 1 ? "" : "s"} — ${totalMissing} credit${
                        totalMissing === 1 ? "" : "s"
                      }`}
                </button>

                {failed.length > 0 && !generating && (
                  <button
                    onClick={onAllNarrated ?? handleClose}
                    className="w-full text-center text-xs font-medium text-ink-soft hover:text-ink"
                  >
                    Continue anyway ({pages.length - failed.length} of {pages.length} pages ready)
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}