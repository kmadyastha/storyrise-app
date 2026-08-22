"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Palette, Sparkles, Check } from "lucide-react";

const jobs = [
  { icon: Sparkles, label: "Writing story text" },
  { icon: Palette, label: "Generating character references" },
  { icon: BookOpen, label: "Rendering each page's illustration" },
];

export default function GeneratingStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const [done, setDone] = useState<number>(0);

  useEffect(() => {
    if (done >= jobs.length) {
      const t = setTimeout(() => router.push(`/create/${bookId}/preview`), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), 1100);
    return () => clearTimeout(t);
  }, [done, bookId, router]);

  return (
    <section className="mx-auto max-w-md px-5 py-24 text-center">
      <motion.div
        className="w-16 h-16 rounded-full bg-teal-tint grid place-items-center mx-auto mb-6"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
      >
        <BookOpen size={26} className="text-teal-text" />
      </motion.div>
      <h1 className="font-display text-2xl font-semibold mb-2">Generating your storybook</h1>
      <p className="text-sm text-ink-soft mb-8">
        This runs in the background — feel free to keep this tab open, it&rsquo;ll be ready shortly.
      </p>
      <div className="space-y-3 text-left">
        {jobs.map((j, i) => (
          <div
            key={j.label}
            className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
              i < done ? "border-green/30 bg-green-tint" : i === done ? "border-teal bg-teal-tint" : "border-line"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
                i < done ? "bg-green text-white" : i === done ? "bg-teal text-white" : "bg-paper text-ink-soft"
              }`}
            >
              {i < done ? <Check size={14} /> : <j.icon size={14} />}
            </span>
            <span className="text-sm">{j.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
