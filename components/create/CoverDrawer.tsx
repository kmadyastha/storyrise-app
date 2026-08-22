"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { coverStyles, titlePlacements } from "@/lib/dummy-data";
import { X } from "lucide-react";
import clsx from "clsx";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
  bookTitle: string;
}

export default function CoverDrawer({ open, onClose, onGenerated, bookTitle }: Props) {
  const [mode, setMode] = useState<"digital" | "kdp">("digital");
  const [style, setStyle] = useState(coverStyles[0].id);
  const [placement, setPlacement] = useState(titlePlacements[0]);
  const [title, setTitle] = useState(bookTitle);
  const [author, setAuthor] = useState("");
  const [blurb, setBlurb] = useState(
    "When Lumo finds a lantern that only lights up for the brave, one quiet forest walk turns into the biggest adventure of her life."
  );
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      onGenerated();
      onClose();
    }, 1200);
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
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-[85] w-full max-w-lg bg-white shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
          >
            <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-display text-lg font-semibold">Design your cover</h2>
              <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Digital / KDP toggle — shared fields below, only the output canvas changes */}
              <div className="flex bg-paper rounded-full p-1 border border-line">
                <button
                  onClick={() => setMode("digital")}
                  className={clsx(
                    "flex-1 text-sm font-medium rounded-full py-2 transition-colors",
                    mode === "digital" ? "bg-teal text-white" : "text-ink-soft"
                  )}
                >
                  Digital cover
                </button>
                <button
                  onClick={() => setMode("kdp")}
                  className={clsx(
                    "flex-1 text-sm font-medium rounded-full py-2 transition-colors",
                    mode === "kdp" ? "bg-teal text-white" : "text-ink-soft"
                  )}
                >
                  KDP print cover
                </button>
              </div>

              {/* Preview canvas — single panel for digital, front+spine+back for KDP */}
              {mode === "digital" ? (
                <div className="relative rounded-2xl overflow-hidden border border-line aspect-[3/4] max-w-[220px] mx-auto">
                  <IllustrationPlaceholder color="teal" seed={99} className="w-full h-full" />
                  <div
                    className={clsx(
                      "absolute inset-x-3 text-center",
                      placement === "Top-third banner" && "top-4",
                      placement === "Centered overlay" && "top-1/2 -translate-y-1/2",
                      placement === "Bottom ribbon" && "bottom-4"
                    )}
                  >
                    <div className="bg-white/95 rounded-lg px-3 py-2">
                      <p className="font-display font-semibold text-sm leading-snug">{title}</p>
                      {author && <p className="text-[10px] text-ink-soft mt-0.5">by {author}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-stretch gap-1 max-w-[340px] mx-auto">
                  <div className="relative rounded-l-xl overflow-hidden border border-line flex-1 aspect-[3/4]">
                    <IllustrationPlaceholder color="green" seed={101} className="w-full h-full" />
                    <div className="absolute inset-x-2 bottom-2 bg-white/90 rounded px-2 py-1.5">
                      <p className="text-[9px] text-ink-soft leading-snug line-clamp-4">{blurb}</p>
                    </div>
                  </div>
                  <div className="w-4 bg-ink/80 flex items-center justify-center shrink-0">
                    <span className="text-[7px] text-white -rotate-90 whitespace-nowrap tracking-wide">{title}</span>
                  </div>
                  <div className="relative rounded-r-xl overflow-hidden border border-line flex-1 aspect-[3/4]">
                    <IllustrationPlaceholder color="teal" seed={99} className="w-full h-full" />
                    <div
                      className={clsx(
                        "absolute inset-x-3 text-center",
                        placement === "Top-third banner" && "top-4",
                        placement === "Centered overlay" && "top-1/2 -translate-y-1/2",
                        placement === "Bottom ribbon" && "bottom-4"
                      )}
                    >
                      <div className="bg-white/95 rounded-lg px-3 py-2">
                        <p className="font-display font-semibold text-sm leading-snug">{title}</p>
                        {author && <p className="text-[10px] text-ink-soft mt-0.5">by {author}</p>}
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 w-6 h-3 bg-white/90 rounded-[2px] grid place-items-center">
                      <span className="text-[5px] text-ink-soft">barcode</span>
                    </span>
                  </div>
                </div>
              )}
              {mode === "kdp" && (
                <p className="text-[11px] text-ink-soft text-center -mt-3">
                  Spine width and barcode placement are calculated automatically from your page count.
                </p>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Cover style</label>
                <div className="grid grid-cols-1 gap-2">
                  {coverStyles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={clsx(
                        "text-left rounded-xl border p-3",
                        style === s.id ? "border-teal bg-teal-tint" : "border-line hover:border-teal"
                      )}
                    >
                      <span className="text-sm font-medium">{s.label}</span>
                      <p className="text-xs text-ink-soft mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Title placement</label>
                <div className="flex flex-wrap gap-2">
                  {titlePlacements.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlacement(p)}
                      className={clsx(
                        "text-xs rounded-full px-3 py-1.5 border",
                        placement === p ? "bg-teal text-white border-teal" : "border-line hover:border-teal"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-line px-4 py-2.5 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Author / creator name (optional)</label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Left blank if you prefer"
                  className="w-full rounded-xl border border-line px-4 py-2.5 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Back-cover blurb</label>
                <textarea
                  value={blurb}
                  onChange={(e) => setBlurb(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-line px-4 py-2.5 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal resize-none"
                />
              </div>

              {mode === "kdp" && (
                <Card className="bg-paper text-xs text-ink-soft">
                  Amazon requires you to declare AI-assisted content when you upload — this happens on their site, not
                  StoryRise&rsquo;s.
                </Card>
              )}

              <Button className="w-full" size="lg" onClick={generate} disabled={generating}>
                {generating ? "Generating cover…" : `Generate ${mode === "kdp" ? "KDP" : "digital"} cover — 1 credit`}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}