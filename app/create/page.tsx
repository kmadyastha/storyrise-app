"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import FilterPill from "@/components/create/FilterPill";
import PaidBadge from "@/components/paywall/PaidBadge";
import { storyStyles, ageGroups, pageCountOptions, artStyles, settings } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { Sparkles, ChevronDown, ArrowRight, Image as ImageIcon, Lock } from "lucide-react";
import clsx from "clsx";

const quickStarts = [
  { label: "Bedtime adventure", idea: "A gentle bedtime adventure where my child drifts off into a dream about a floating island of clouds." },
  { label: "First day of school", idea: "My child's nervous, exciting first day at a new school, and the friend they make by lunchtime." },
  { label: "Family memory", idea: "Our family's weekend camping trip, turned into an adventure where the campfire tells stories back." },
  { label: "Surprise me", idea: "A curious kid discovers a hidden door in their backyard that leads somewhere nobody in the family has ever been." },
];

export default function CreateStep1() {
  const router = useRouter();
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";

  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<string>(storyStyles[0]);
  const [age, setAge] = useState<string>(ageGroups[1]);
  const [pageCount, setPageCount] = useState(isFree ? 6 : 20);
  const [format, setFormat] = useState<"classic" | "immersive">("classic");
  const [layout, setLayout] = useState<"image-left" | "image-right">("image-left");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [artStyle, setArtStyle] = useState(artStyles[0]);
  const [setting, setSetting] = useState(settings[0]);
  const [rhyme, setRhyme] = useState(false);

  const pageLabel = pageCountOptions.find((p) => p.count === pageCount)?.label.split(" —")[0] ?? String(pageCount);

  return (
    <StepShell activeKey="create" title="" hideFooter wide>
      <div className="max-w-3xl mx-auto text-center mb-8">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-text mb-3">
          <Sparkles size={14} /> A picture-book press, powered by AI
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
          Turn an Idea into a Story Book
        </h1>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-[28px] border border-line shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-5 sm:p-6">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            placeholder="One sentence is enough — or paste a story you already wrote…"
            className="w-full resize-none border-none outline-none text-base sm:text-lg placeholder:text-ink-soft/70"
          />

          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-line">
            <FilterPill label="Ages" value={age}>
              {(close) => (
                <div className="grid grid-cols-2 gap-1.5">
                  {ageGroups.map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setAge(a);
                        close();
                      }}
                      className={clsx(
                        "text-sm rounded-lg px-3 py-2 transition-colors",
                        age === a ? "bg-teal text-white" : "bg-paper hover:bg-teal-tint"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Style" value={style} panelClassName="w-56">
              {(close) => (
                <div className="grid grid-cols-2 gap-1.5">
                  {storyStyles.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStyle(s);
                        close();
                      }}
                      className={clsx(
                        "text-sm rounded-lg px-3 py-2 transition-colors text-left",
                        style === s ? "bg-teal text-white" : "bg-paper hover:bg-teal-tint"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Pages" value={pageLabel} panelClassName="w-72">
              {(close) => (
                <div className="grid grid-cols-3 gap-1.5">
                  {pageCountOptions.map((p) => {
                    const locked = isFree && !p.freeTrial;
                    return (
                      <button
                        key={p.count}
                        onClick={() => {
                          if (locked) {
                            openUpgradeModal();
                          } else {
                            setPageCount(p.count);
                            close();
                          }
                        }}
                        className={clsx(
                          "relative flex items-center justify-center gap-1 text-xs rounded-lg px-2 py-2 transition-colors",
                          locked
                            ? "bg-paper text-ink-soft/50"
                            : pageCount === p.count
                            ? "bg-teal text-white"
                            : "bg-paper hover:bg-teal-tint"
                        )}
                      >
                        {p.count}
                        {locked && <Lock size={9} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Format" value={format === "classic" ? "Classic" : "Immersive"} panelClassName="w-72">
              {(close) => (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setFormat("classic")}
                      className={clsx(
                        "text-left text-xs rounded-lg px-3 py-2.5",
                        format === "classic" ? "bg-teal text-white" : "bg-paper hover:bg-teal-tint"
                      )}
                    >
                      <span className="font-medium block">Classic</span>
                      <span className={format === "classic" ? "text-white/80" : "text-ink-soft"}>
                        Lower cost
                      </span>
                    </button>
                    <button
                      onClick={() => (isFree ? openUpgradeModal() : setFormat("immersive"))}
                      className={clsx(
                        "relative text-left text-xs rounded-lg px-3 py-2.5",
                        isFree
                          ? "bg-paper text-ink-soft/50"
                          : format === "immersive"
                          ? "bg-teal text-white"
                          : "bg-paper hover:bg-teal-tint"
                      )}
                    >
                      <span className="font-medium block">Immersive</span>
                      <span className={format === "immersive" ? "text-white/80" : "text-ink-soft"}>
                        Image + text
                      </span>
                      {isFree && (
                        <span className="absolute top-1.5 right-1.5">
                          <PaidBadge inline />
                        </span>
                      )}
                    </button>
                  </div>

                  {format === "immersive" && !isFree && (
                    <div>
                      <p className="text-[11px] font-medium text-ink-soft mb-1.5">Layout</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setLayout("image-left")}
                          className={clsx(
                            "rounded-lg p-2 border-2",
                            layout === "image-left" ? "border-teal" : "border-line"
                          )}
                        >
                          <div className="flex gap-1 h-8">
                            <span className="flex-1 rounded bg-teal-tint grid place-items-center">
                              <ImageIcon size={12} className="text-teal-text" />
                            </span>
                            <span className="flex-1 rounded bg-paper flex flex-col justify-center gap-0.5 px-1">
                              <span className="h-0.5 bg-line rounded-full" />
                              <span className="h-0.5 bg-line rounded-full w-2/3" />
                            </span>
                          </div>
                          <span className="text-[10px] text-ink-soft block mt-1">Image left</span>
                        </button>
                        <button
                          onClick={() => setLayout("image-right")}
                          className={clsx(
                            "rounded-lg p-2 border-2",
                            layout === "image-right" ? "border-teal" : "border-line"
                          )}
                        >
                          <div className="flex gap-1 h-8">
                            <span className="flex-1 rounded bg-paper flex flex-col justify-center gap-0.5 px-1">
                              <span className="h-0.5 bg-line rounded-full" />
                              <span className="h-0.5 bg-line rounded-full w-2/3" />
                            </span>
                            <span className="flex-1 rounded bg-teal-tint grid place-items-center">
                              <ImageIcon size={12} className="text-teal-text" />
                            </span>
                          </div>
                          <span className="text-[10px] text-ink-soft block mt-1">Image right</span>
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={close} className="text-xs text-teal-text font-medium">
                    Done
                  </button>
                </div>
              )}
            </FilterPill>

            <div className="flex-1" />

            <button
              onClick={() => router.push("/create/demo/story")}
              disabled={!idea.trim()}
              className="inline-flex items-center gap-2 bg-teal text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-text transition-colors"
            >
              Create My Story Book
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5 justify-center">
          <span className="text-sm text-ink-soft mr-1">Not sure what to write? Try one:</span>
          {quickStarts.map((q) => (
            <button
              key={q.label}
              onClick={() => setIdea(q.idea)}
              className="text-xs font-medium border border-line rounded-full px-3 py-1.5 hover:border-teal hover:bg-teal-tint transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => setAdvancedOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Advanced options <ChevronDown size={15} className={clsx("transition-transform", advancedOpen && "rotate-180")} />
          </button>
          {advancedOpen && (
            <div className="mt-4 max-w-xl mx-auto text-left space-y-5 bg-white rounded-2xl p-5 border border-line">
              <div>
                <label className="text-xs font-medium mb-2 block text-ink-soft">Illustration art style</label>
                <div className="flex flex-wrap gap-2">
                  {artStyles.map((a) => (
                    <button
                      key={a}
                      onClick={() => setArtStyle(a)}
                      className={clsx(
                        "text-xs rounded-full px-3 py-1.5 border",
                        artStyle === a ? "bg-teal text-white border-teal" : "border-line bg-white hover:border-teal"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block text-ink-soft">Setting / backdrop</label>
                <div className="flex flex-wrap gap-2">
                  {settings.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSetting(s)}
                      className={clsx(
                        "text-xs rounded-full px-3 py-1.5 border",
                        setting === s ? "bg-teal text-white border-teal" : "border-line bg-white hover:border-teal"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
                <input type="checkbox" checked={rhyme} onChange={(e) => setRhyme(e.target.checked)} className="accent-teal" />
                Rhyme mode
              </label>
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}