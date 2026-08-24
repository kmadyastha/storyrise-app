"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/app-context";
import Button from "@/components/ui/Button";

type Phase = "caterpillar" | "cocoon" | "hatch" | "flying" | "welcome";

const PHASE_DURATIONS: Record<Phase, number> = {
  caterpillar: 1700,
  cocoon: 1600,
  hatch: 900,
  flying: 2200,
  welcome: 0,
};

const wingColors = ["#00BCC8", "#D0FF00", "#1DC27A", "#FF6A1F"];

function Caterpillar() {
  const segments = [0, 1, 2, 3, 4, 5];
  return (
    <motion.svg
      width="220"
      height="90"
      viewBox="0 0 220 90"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.4 }}
    >
      {segments.map((i) => (
        <motion.g
          key={i}
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.08, ease: "easeInOut" }}
        >
          <circle cx={30 + i * 30} cy={50} r={16} fill={i % 2 === 0 ? "#1DC27A" : "#5BD69B"} />
        </motion.g>
      ))}
      {/* face */}
      <circle cx="200" cy="50" r="18" fill="#0F8A57" />
      <circle cx="206" cy="45" r="2.5" fill="#fff" />
      <motion.path
        d="M40 20 Q30 5 20 15"
        stroke="#0F8A57"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        animate={{ x: [0, 100] }}
        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
      />
    </motion.svg>
  );
}

function Cocoon() {
  return (
    <motion.svg width="140" height="160" viewBox="0 0 140 160">
      <motion.ellipse
        cx="70"
        cy="90"
        rx="34"
        ry="58"
        fill="#E8590C"
        style={{ transformOrigin: "70px 90px" }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={70 - 26 + i * 3}
            y1={40 + i * 4}
            x2={70 + 26 - i * 3}
            y2={40 + i * 4}
            stroke="#C24A0D"
            strokeWidth="2.5"
            opacity="0.6"
          />
        ))}
      </motion.g>
      <motion.ellipse
        cx="70"
        cy="90"
        rx="34"
        ry="58"
        fill="none"
        stroke="#FFB98C"
        strokeWidth="3"
        style={{ transformOrigin: "70px 90px" }}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 1.1, delay: 1, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

function CracksOpen() {
  return (
    <motion.svg width="140" height="160" viewBox="0 0 140 160">
      <motion.path
        d="M36 60 C 30 75, 30 105, 36 120"
        fill="none"
        stroke="#C24A0D"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ x: 0, opacity: 1 }}
        animate={{ x: -22, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeIn" }}
      />
      <motion.path
        d="M104 60 C 110 75, 110 105, 104 120"
        fill="none"
        stroke="#C24A0D"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ x: 0, opacity: 1 }}
        animate={{ x: 22, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeIn" }}
      />
      {/* left cocoon half swings open */}
      <motion.path
        d="M70 32 C 40 32, 30 65, 36 90 C 30 115, 40 148, 70 148 Z"
        fill="#FFF0E6"
        style={{ transformOrigin: "70px 90px" }}
        initial={{ rotate: 0, opacity: 1 }}
        animate={{ rotate: -35, opacity: 0 }}
        transition={{ duration: 0.85, ease: "easeIn" }}
      />
      {/* right cocoon half swings open */}
      <motion.path
        d="M70 32 C 100 32, 110 65, 104 90 C 110 115, 100 148, 70 148 Z"
        fill="#FFE3CF"
        style={{ transformOrigin: "70px 90px" }}
        initial={{ rotate: 0, opacity: 1 }}
        animate={{ rotate: 35, opacity: 0 }}
        transition={{ duration: 0.85, ease: "easeIn" }}
      />
      {/* butterfly revealed underneath, growing in */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
        style={{ transformOrigin: "70px 90px" }}
      >
        <path d="M70,90 C 48,72 24,84 30,108 C 36,132 56,124 70,110 Z" fill="#00BCC8" />
        <path d="M70,90 C 92,72 116,84 110,108 C 104,132 84,124 70,110 Z" fill="#1DC27A" />
        <ellipse cx="70" cy="98" rx="3" ry="20" fill="#17211F" />
      </motion.g>
    </motion.svg>
  );
}

function Wing({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <motion.path
      d={
        flip
          ? "M0,0 C -22,-18 -46,-6 -40,18 C -34,42 -14,34 0,20 Z"
          : "M0,0 C 22,-18 46,-6 40,18 C 34,42 14,34 0,20 Z"
      }
      fill={color}
      animate={{ scaleX: [1, 0.55, 1] }}
      transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
      style={{ transformOrigin: "0px 4px" }}
    />
  );
}

function Butterfly({ delay = 0, path, colors }: { delay?: number; path: { x: number; y: number }[]; colors: [string, string] }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: "50%", top: "58%" }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
      animate={{
        x: path.map((p) => p.x),
        y: path.map((p) => p.y),
        opacity: [0, 1, 1, 1, 0],
        scale: [0.4, 1, 1, 1, 0.7],
      }}
      transition={{ duration: 2.1, delay, ease: "easeInOut" }}
    >
      <svg width="80" height="60" viewBox="-40 -20 80 60">
        <Wing color={colors[0]} flip />
        <Wing color={colors[1]} />
        <ellipse cx="0" cy="8" rx="2.5" ry="14" fill="#17211F" />
      </svg>
    </motion.div>
  );
}

export default function ProCelebration() {
  const { celebrationOpen, closeCelebration, tier } = useApp();
  const [phase, setPhase] = useState<Phase>("caterpillar");

  useEffect(() => {
    if (!celebrationOpen) return;
    queueMicrotask(() => setPhase("caterpillar"));
    const order: Phase[] = ["caterpillar", "cocoon", "hatch", "flying", "welcome"];
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const current = order[idx];
      const dur = PHASE_DURATIONS[current];
      if (idx < order.length - 1) {
        timer = setTimeout(() => {
          idx += 1;
          setPhase(order[idx]);
          step();
        }, dur);
      }
    };
    step();
    return () => clearTimeout(timer);
  }, [celebrationOpen]);

  if (!celebrationOpen) return null;

  const tierLabel: Record<string, string> = {
    none: "Pro",
    starter: "Starter",
    growth: "Growth",
    pro: "Pro",
    pro_max: "Pro Max",
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-lg aspect-[4/3] bg-white rounded-[28px] overflow-hidden shadow-2xl grid place-items-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <div className="absolute inset-0 bg-collage -z-10" />

          <AnimatePresence mode="wait">
            {phase === "caterpillar" && (
              <motion.div key="c1" className="relative z-10" exit={{ opacity: 0 }}>
                <Caterpillar />
              </motion.div>
            )}
            {phase === "cocoon" && (
              <motion.div key="c2" className="relative z-10" exit={{ opacity: 0 }}>
                <Cocoon />
              </motion.div>
            )}
            {phase === "hatch" && (
              <motion.div key="c3" className="relative z-10" exit={{ opacity: 0 }}>
                <CracksOpen />
              </motion.div>
            )}
            {phase === "flying" && (
              <motion.div key="c4" className="relative z-10 w-full h-full" exit={{ opacity: 0 }}>
                <Butterfly
                  delay={0}
                  colors={[wingColors[0], wingColors[1]]}
                  path={[
                    { x: 0, y: 0 },
                    { x: -60, y: -70 },
                    { x: -140, y: -40 },
                    { x: -220, y: -120 },
                    { x: -300, y: -160 },
                  ]}
                />
                <Butterfly
                  delay={0.25}
                  colors={[wingColors[2], wingColors[3]]}
                  path={[
                    { x: 0, y: 0 },
                    { x: 50, y: -50 },
                    { x: 130, y: -30 },
                    { x: 200, y: -110 },
                    { x: 290, y: -150 },
                  ]}
                />
              </motion.div>
            )}
            {phase === "welcome" && (
              <motion.div
                key="c5"
                className="relative z-10 text-center px-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex justify-center gap-1.5 mb-4">
                  {wingColors.map((c) => (
                    <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink mb-2">
                  Welcome to {tierLabel[tier]}
                </h2>
                <p className="text-ink-soft mb-6">
                  Your account is upgraded — every feature you saw locked is open now.
                </p>
                <Button onClick={closeCelebration}>Start creating</Button>
              </motion.div>
            )}
          </AnimatePresence>

          {phase !== "welcome" && (
            <button
              onClick={closeCelebration}
              className="absolute top-4 right-4 text-xs text-ink-soft hover:text-ink"
            >
              Skip
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}