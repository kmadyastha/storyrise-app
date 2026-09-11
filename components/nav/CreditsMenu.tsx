"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Zap, ArrowRight } from "lucide-react";
import { topupPacks } from "@/lib/dummy-data";
import clsx from "clsx";

// Below this, the pill switches to a warning color and the dropdown leads
// with a "running low" nudge instead of just plain info.
const LOW_CREDITS_THRESHOLD = 10;

interface Props {
  tier: string;
  credits: number;
}

export default function CreditsMenu({ tier, credits }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const low = credits < LOW_CREDITS_THRESHOLD;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors",
          low ? "bg-tangerine-tint text-tangerine-text" : "bg-teal-tint text-teal-text hover:bg-teal-tint/70"
        )}
      >
        {tier === "none" ? "Free" : tier} · {credits} credits
        <ChevronDown size={12} className={clsx("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white rounded-2xl border border-line shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden z-50"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {low && (
              <div className="flex items-center gap-2 bg-tangerine-tint text-tangerine-text text-xs font-medium px-4 py-2.5">
                <Zap size={13} /> Running low — top up to keep creating
              </div>
            )}
            <div className="px-4 py-3 border-b border-line">
              <p className="text-xs text-ink-soft">Current balance</p>
              <p className="font-display text-lg font-semibold">{credits} credits</p>
            </div>

            <div className="p-2">
              {topupPacks.map((p) => (
                <Link
                  key={p.id}
                  href="/pricing#topup"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-teal-tint/40 transition-colors"
                >
                  <span className="text-sm font-medium">{p.credits} credits</span>
                  <span className="text-sm text-ink-soft">{p.price}</span>
                </Link>
              ))}
            </div>

            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-text hover:text-teal border-t border-line px-4 py-3"
            >
              View all plans <ArrowRight size={12} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
