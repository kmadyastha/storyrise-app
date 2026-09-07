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
          className="fixed inset-0 z-[90] bg-ink/40 backdrop-blur-sm grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-[24px] w-full max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Sparkles size={18} className="text-teal-text" /> Quick check before we start
              </h2>
              <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-ink-soft mb-5">
              A couple of quick questions to make sure we build the right book — pick an option or type your own answer.
            </p>

            <div className="space-y-5">
              {questions.map((q, i) => (
                <div key={i}>
                  <p className="text-sm font-medium mb-2">{q.question}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAnswer(i, opt)}
                        className={clsx(
                          "text-xs font-medium rounded-full px-3 py-1.5 border transition-colors",
                          answers[i] === opt ? "bg-teal text-white border-teal" : "border-line hover:border-teal"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <input
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    placeholder="Or type your own answer…"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:border-teal"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => onSubmit(answers)}
              disabled={!allAnswered}
              className="w-full mt-6 bg-teal text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-text transition-colors"
            >
              Continue
            </button>
            <button onClick={onClose} className="w-full mt-2 text-xs text-ink-soft hover:text-ink text-center">
              Skip and generate anyway
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
