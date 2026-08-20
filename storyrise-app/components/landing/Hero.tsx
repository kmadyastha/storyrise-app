"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { heroStates } from "@/lib/dummy-data";
import Button from "@/components/ui/Button";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { Pause, Play, ChevronLeft, ChevronRight, Users, BookOpen, Printer, Video, Sparkles } from "lucide-react";
import Link from "next/link";

const INTERVAL = 3800;
const colorKeyToPlaceholder: Record<string, "teal" | "lime" | "green" | "tangerine"> = {
  teal: "teal",
  lime: "lime",
  green: "green",
  tangerine: "tangerine",
};

const features = [
  { icon: Sparkles, label: "Any idea" },
  { icon: Users, label: "Consistent cast" },
  { icon: Printer, label: "KDP-ready" },
  { icon: Video, label: "Video export" },
];

// wavy right edge on the white panel, applied via clip-path in JSX (see hero-wave clipPath below)

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || reduceMotion) return;
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % heroStates.length);
    }, INTERVAL);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, reduceMotion]);

  const state = heroStates[index];
  const activeColor = reduceMotion ? heroStates[0].color : state.color;

  const go = (dir: 1 | -1) => {
    setPaused(true);
    setIndex((i) => (i + dir + heroStates.length) % heroStates.length);
  };

  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-6 sm:pt-10">
      <div
        className="relative overflow-hidden rounded-[32px] sm:rounded-[44px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* full-bleed saturated background, confined within the rounded island */}
        <motion.div
          className="absolute inset-0"
          animate={{ backgroundColor: activeColor }}
          transition={{ duration: reduceMotion ? 0 : 0.9 }}
        />

        <div className="relative px-5 sm:px-8 pt-8 pb-10 sm:pt-10 sm:pb-12">
          {/* floating badge */}
          <div className="flex justify-end mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink bg-white/95 backdrop-blur rounded-full px-3.5 py-1.5 shadow-sm">
              <Sparkles size={13} style={{ color: activeColor }} /> Free 6-page trial — no card needed
            </span>
          </div>

          <div className="relative grid md:grid-cols-[1.15fr_0.85fr] min-h-[480px] items-stretch gap-0 rounded-[22px] sm:rounded-[28px] overflow-hidden">
            {/* white organic panel */}
            <div
              className="relative bg-white p-8 sm:p-11 flex flex-col justify-center rounded-t-[28px] md:rounded-none md:[clip-path:url(#hero-wave)]"
            >
              <svg width="0" height="0" className="absolute">
                <defs>
                  <clipPath id="hero-wave" clipPathUnits="objectBoundingBox">
                    <path d="M0,0 H0.84 C1.06,0.22 0.66,0.38 0.9,0.5 C1.14,0.62 0.62,0.8 0.86,1 L0,1 Z" />
                  </clipPath>
                </defs>
              </svg>

              <AnimatePresence mode="wait">
              <motion.div
                key={state.key}
                initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <h1
                  className="font-display text-4xl sm:text-5xl font-semibold leading-[1.05] mb-4 max-w-md"
                  style={{ color: state.text }}
                >
                  {state.headline}
                </h1>
                <p className="text-ink-soft text-base sm:text-lg mb-7 max-w-sm">{state.sub}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link href="/create">
                <Button size="lg">Start your story free</Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="secondary">See pricing</Button>
              </Link>
            </div>

            {/* feature icon row */}
            <div className="grid grid-cols-4 gap-2 mb-7 max-w-sm">
              {features.map((f) => (
                <div key={f.label} className="flex flex-col items-center text-center gap-1.5">
                  <span
                    className="w-9 h-9 rounded-full grid place-items-center"
                    style={{ background: `${activeColor}1f`, color: state.text }}
                  >
                    <f.icon size={16} />
                  </span>
                  <span className="text-[10px] text-ink-soft leading-tight">{f.label}</span>
                </div>
              ))}
            </div>

            {/* thumbnail strip + carousel controls */}
            <div className="flex items-center justify-between max-w-sm">
              <div className="flex -space-x-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-11 h-11 rounded-full border-2 border-white overflow-hidden shadow-sm"
                    style={{ zIndex: 3 - i }}
                  >
                    <IllustrationPlaceholder
                      color={colorKeyToPlaceholder[heroStates[(index + i) % heroStates.length].key]}
                      seed={i + 5}
                      className="w-full h-full"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => go(-1)}
                  className="w-7 h-7 rounded-full border border-line grid place-items-center hover:border-teal"
                  aria-label="Previous"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex gap-1.5">
                  {heroStates.map((s, i) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setPaused(true);
                        setIndex(i);
                      }}
                      aria-label={`Show ${s.key} state`}
                      className="w-5 h-1.5 rounded-full transition-colors"
                      style={{ background: i === index ? activeColor : "var(--color-line)" }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => go(1)}
                  className="w-7 h-7 rounded-full border border-line grid place-items-center hover:border-teal"
                  aria-label="Next"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="w-7 h-7 rounded-full border border-line grid place-items-center hover:border-teal"
                  aria-label={paused ? "Play" : "Pause"}
                >
                  {paused ? <Play size={12} /> : <Pause size={12} />}
                </button>
              </div>
            </div>
          </div>

          {/* right: illustration bleeding to the frame edge */}
          <div className="relative hidden md:block min-h-[480px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={state.key}
                initial={reduceMotion ? {} : { opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 -ml-16"
              >
                <IllustrationPlaceholder
                  color={colorKeyToPlaceholder[state.key]}
                  seed={index + 1}
                  vivid
                  className="w-full h-full"
                />
              </motion.div>
            </AnimatePresence>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
