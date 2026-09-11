"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import clsx from "clsx";

export interface ClarifyQuestion {
  question: string;
  options: string[];
}

interface Props {
  open: boolean;
  questions: ClarifyQuestion[];
  onClose: () => void;
  /** Called with one answer string per question, in order. */
  onSubmit: (answers: string[]) => void;
}

export default function ClarifyModal({ open, questions, onClose, onSubmit }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));

  const setAnswer = (i: number, value: string) => {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  };

  const allAnswered = answers.length === questions.length && answers.every((a) => a.trim());

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] bg-ink/45 grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* No backdrop-blur and no transform-based entrance animation on
              this card (only a plain opacity fade) — both were found to be
              real, documented contributors to broken touch/scroll behavior
              on some mobile browsers when combined with nested overflow.
              The card owns its own max-height + scroll instead of the
              backdrop being the scroll container, which is the more
              standard, more widely-tested modal pattern. */}
          <motion.div
            className="bg-white rounded-[22px] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-teal-tint/40 shrink-0">
              <h2 className="font-display text-base font-semibold flex items-center gap-2">
                <Sparkles size={16} className="text-teal-text" /> Quick check before we start
              </h2>
              <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto">
              <p className="text-xs text-ink-soft mb-4">
                A couple of quick questions to make sure we build the right book — pick an option or type your own.
              </p>

              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium mb-2">{q.question}</p>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(i, opt)}
                          className={clsx(
                            "text-xs font-medium rounded-full px-2.5 py-1 border transition-colors",
                            answers[i] === opt ? "bg-teal text-white border-teal" : "border-line hover:border-teal"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswer(i, e.target.value)}
                      placeholder="Or type your own answer…"
                      className="w-full rounded-lg border border-line px-3 py-1.5 text-xs focus:outline-none focus:border-teal"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onSubmit(answers)}
                disabled={!allAnswered}
                className="w-full mt-5 bg-teal text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-text transition-colors"
              >
                Continue
              </button>
              <button type="button" onClick={onClose} className="w-full mt-2 text-xs text-ink-soft hover:text-ink text-center py-1">
                Skip and generate anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
