"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkle } from "lucide-react";

interface Props {
  messages: string[];
  intervalMs?: number;
}

// Sparkles orbiting the book, each on its own angle/delay/size so the
// twinkle reads as scattered rather than mechanically identical.
const ORBIT_SPARKLES = [
  { top: "6%", left: "78%", size: 16, delay: 0 },
  { top: "72%", left: "84%", size: 12, delay: 0.6 },
  { top: "80%", left: "12%", size: 14, delay: 1.1 },
  { top: "10%", left: "10%", size: 11, delay: 1.7 },
];

/** A generation wait can genuinely run anywhere from ~15s to ~90s+ depending
 * on page count, so a real progress bar would either lie (jump to 100% too
 * early) or stall. This is deliberately indeterminate — cycling messages +
 * a bouncing-dot indicator — so it reads as "actively working," not "frozen." */
export default function GenerationLoader({ messages, intervalMs = 2800 }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(id);
  }, [messages, intervalMs]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 mx-auto max-w-md rounded-[32px] bg-white/80 border border-line shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
      <div className="relative w-28 h-28 mb-7">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-teal-tint"
        />
        <motion.div
          animate={{ y: [0, -6, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 grid place-items-center text-teal-text"
        >
          <BookOpen size={40} strokeWidth={1.8} />
        </motion.div>

        {ORBIT_SPARKLES.map((s, i) => (
          <motion.span
            key={i}
            className="absolute text-teal"
            style={{ top: s.top, left: s.left }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          >
            <Sparkle size={s.size} fill="currentColor" />
          </motion.span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="font-display text-lg font-medium text-ink min-h-[28px]"
        >
          {messages[index]}
        </motion.p>
      </AnimatePresence>

      <div className="flex items-center gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-teal"
            animate={{ y: [0, -7, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}