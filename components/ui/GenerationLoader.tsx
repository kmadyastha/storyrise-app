"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  messages: string[];
  intervalMs?: number;
}

/** A generation wait can genuinely run anywhere from ~10s to ~90s+ depending
 * on page count, so a real progress bar would either lie (jump to 100% too
 * early) or stall. This is deliberately indeterminate — cycling messages +
 * a looping bar — so it reads as "actively working," not "frozen." */
export default function GenerationLoader({ messages, intervalMs = 2800 }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(id);
  }, [messages, intervalMs]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-full bg-teal-tint text-teal-text grid place-items-center mb-5"
      >
        <Sparkles size={28} />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-ink-soft max-w-xs min-h-[20px]"
        >
          {messages[index]}
        </motion.p>
      </AnimatePresence>

      <div className="w-48 h-1.5 bg-teal-tint rounded-full overflow-hidden mt-5">
        <motion.div
          className="h-full w-1/3 bg-teal rounded-full"
          animate={{ x: ["-100%", "250%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}