"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import FilterPill from "@/components/create/FilterPill";
import PaidBadge from "@/components/paywall/PaidBadge";
import { storyStyles, ageGroups, artStyles, settings } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { createBook } from "@/lib/supabase/queries";
import { Sparkles, ArrowRight, Image as ImageIcon, Lock, Minus, Plus, SlidersHorizontal, AlertCircle } from "lucide-react";
import clsx from "clsx";

const quickStarts = [
  { label: "Bedtime adventure", idea: "A gentle bedtime adventure where my child drifts off into a dream about a floating island of clouds." },
  { label: "First day of school", idea: "My child's nervous, exciting first day at a new school, and the friend they make by lunchtime." },
  { label: "Family memory", idea: "Our family's weekend camping trip, turned into an adventure where the campfire tells stories back." },
  { label: "Surprise me", idea: "A curious kid discovers a hidden door in their backyard that leads somewhere nobody in the family has ever been." },
];

const pagePresets = [
  { count: 6, caption: "Free trial", free: true },
  { count: 10, caption: null, free: false },
  { count: 15, caption: null, free: false },
  { count: 20, caption: null, free: false },
  { count: 24, caption: "KDP minimum", free: false },
];

// shared look for popover options — a real bordered button, not a flat blend into white
function OptionButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-sm rounded-lg px-3 py-2 border whitespace-nowrap transition-colors",
        active ? "bg-teal text-white border-teal" : "bg-white border-line hover:border-teal hover:bg-teal-tint/40",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function CreateStep1() {
  const router = useRouter();
  const { tier, openUpgradeModal, user, openLoginModal } = useApp();
  const isFree = tier === "none";
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<string>(storyStyles[0]);
  const [age, setAge] = useState<string>(ageGroups[1]);
  const [pageCount, setPageCount] = useState(isFree ? 6 : 20);
  const [format, setFormat] = useState<"classic" | "immersive">("classic");
  const [layout, setLayout] = useState<"image-left" | "image-right">("image-left");
  const [artStyle, setArtStyle] = useState(artStyles[0]);
  const [setting, setSetting] = useState(settings[0]);
  const [rhyme, setRhyme] = useState(false);

  const pageLabel = pagePresets.find((p) => p.count === pageCount)?.count ?? pageCount;

  const handleCreate = async () => {
    if (!idea.trim()) return;
    if (!user) {
      openLoginModal();
      return;
    }

    setCreating(true);
    setCreateError(null);

    const supabase = createClient();
    const { data: book, error } = await createBook(supabase, user.id, {
      idea: idea.trim(),
      style,
      ageGroup: age,
      pageCount,
      format,
      layout,
      artStyle,
      setting,
      rhymeMode: rhyme,
      isFreeTrial: isFree,
    });

    setCreating(false);

    if (error || !book) {
      setCreateError(error?.message ?? "Couldn't create your book — please try again.");
      return;
    }

    router.push(`/create/${book.id}/story`);
  };

  const bumpPages = (dir: 1 | -1) => {
    if (isFree) return openUpgradeModal();
    setPageCount((c) => Math.min(50, Math.max(25, c + dir)));
  };

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
                    <OptionButton
                      key={a}
                      active={age === a}
                      onClick={() => {
                        setAge(a);
                        close();
                      }}
                    >
                      {a}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Style" value={style} panelClassName="w-72">
              {(close) => (
                <div className="grid grid-cols-2 gap-1.5">
                  {storyStyles.map((s) => (
                    <OptionButton
                      key={s}
                      active={style === s}
                      onClick={() => {
                        setStyle(s);
                        close();
                      }}
                      className="text-left"
                    >
                      {s}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Pages" value={String(pageLabel)} panelClassName="w-80" align="right">
              {(close) => (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    {pagePresets.map((p) => {
                      const locked = isFree && !p.free;
                      return (
                        <button
                          key={p.count}
                          onClick={() => {
                            if (locked) return openUpgradeModal();
                            setPageCount(p.count);
                            close();
                          }}
                          className={clsx(
                            "relative flex flex-col items-center justify-center gap-0.5 text-sm rounded-lg px-2 py-2 border transition-colors",
                            locked
                              ? "bg-white border-line text-ink-soft/50"
                              : pageCount === p.count
                              ? "bg-teal text-white border-teal"
                              : p.caption
                              ? "bg-tangerine-tint border-tangerine/30 hover:border-tangerine"
                              : "bg-white border-line hover:border-teal hover:bg-teal-tint/40"
                          )}
                        >
                          <span className="flex items-center gap-1 font-medium">
                            {p.count}
                            {locked && <Lock size={9} />}
                          </span>
                          {p.caption && (
                            <span className={clsx("text-[9px] leading-none", pageCount === p.count ? "text-white/80" : "text-tangerine-text")}>
                              {p.caption}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-line">
                    <p className="text-[11px] font-medium text-ink-soft mb-1.5">
                      Or pick any exact count, 25–50
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => bumpPages(-1)}
                        className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="relative flex-1 text-center text-sm font-semibold">
                        {pageCount >= 25 ? pageCount : 25}
                        {isFree && <PaidBadge inline />}
                      </span>
                      <button
                        onClick={() => bumpPages(1)}
                        className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Format" value={format === "classic" ? "Classic" : "Immersive"} panelClassName="w-80" align="right">
              {() => (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <OptionButton active={format === "classic"} onClick={() => setFormat("classic")} className="text-left !py-2.5">
                      <span className="font-medium block">Classic</span>
                      <span className={clsx("text-xs", format === "classic" ? "text-white/80" : "text-ink-soft")}>
                        Lower cost
                      </span>
                    </OptionButton>

                    <button
                      type="button"
                      onClick={() => (isFree ? openUpgradeModal() : setFormat("immersive"))}
                      className={clsx(
                        "relative text-left text-sm rounded-lg px-3 py-2.5 border whitespace-nowrap transition-colors",
                        isFree
                          ? "bg-white border-line text-ink-soft/50"
                          : format === "immersive"
                          ? "bg-teal text-white border-teal"
                          : "bg-white border-line hover:border-teal hover:bg-teal-tint/40"
                      )}
                    >
                      <span className="font-medium block">Immersive</span>
                      <span className={clsx("text-xs", format === "immersive" ? "text-white/80" : "text-ink-soft")}>
                        Image + text
                      </span>
                      {isFree && <PaidBadge />}
                    </button>
                  </div>

                  {format === "immersive" && !isFree && (
                    <div className="pt-1">
                      <p className="text-[11px] font-medium text-ink-soft mb-1.5">Layout</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLayout("image-left")}
                          className={clsx(
                            "rounded-lg p-2 border-2 transition-colors",
                            layout === "image-left" ? "border-teal bg-teal-tint/30" : "border-line hover:border-teal/50"
                          )}
                        >
                          <div className="flex gap-1 h-8 pointer-events-none">
                            <span className="flex-1 rounded bg-teal-tint grid place-items-center">
                              <ImageIcon size={12} className="text-teal-text" />
                            </span>
                            <span className="flex-1 rounded bg-paper flex flex-col justify-center gap-0.5 px-1">
                              <span className="h-0.5 bg-line rounded-full" />
                              <span className="h-0.5 bg-line rounded-full w-2/3" />
                            </span>
                          </div>
                          <span className="text-[10px] text-ink-soft block mt-1 pointer-events-none">Image left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLayout("image-right")}
                          className={clsx(
                            "rounded-lg p-2 border-2 transition-colors",
                            layout === "image-right" ? "border-teal bg-teal-tint/30" : "border-line hover:border-teal/50"
                          )}
                        >
                          <div className="flex gap-1 h-8 pointer-events-none">
                            <span className="flex-1 rounded bg-paper flex flex-col justify-center gap-0.5 px-1">
                              <span className="h-0.5 bg-line rounded-full" />
                              <span className="h-0.5 bg-line rounded-full w-2/3" />
                            </span>
                            <span className="flex-1 rounded bg-teal-tint grid place-items-center">
                              <ImageIcon size={12} className="text-teal-text" />
                            </span>
                          </div>
                          <span className="text-[10px] text-ink-soft block mt-1 pointer-events-none">Image right</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FilterPill>
          </div>

          {/* Advanced options (left) + CTA (right) — always on their own row, CTA always flush right */}
          <div className="flex items-center justify-between gap-3 mt-3">
            <FilterPill label="" value="Advanced options" icon={<SlidersHorizontal size={14} className="text-ink-soft" />} panelClassName="w-80">
              {() => (
                <div className="space-y-4 text-left">
                  <div>
                    <label className="text-xs font-medium mb-2 block text-ink-soft">Illustration art style</label>
                    <div className="flex flex-wrap gap-1.5">
                      {artStyles.map((a) => (
                        <OptionButton key={a} active={artStyle === a} onClick={() => setArtStyle(a)} className="!px-2.5 !py-1.5 text-xs">
                          {a}
                        </OptionButton>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block text-ink-soft">Setting / backdrop</label>
                    <div className="flex flex-wrap gap-1.5">
                      {settings.map((s) => (
                        <OptionButton key={s} active={setting === s} onClick={() => setSetting(s)} className="!px-2.5 !py-1.5 text-xs">
                          {s}
                        </OptionButton>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
                    <input type="checkbox" checked={rhyme} onChange={(e) => setRhyme(e.target.checked)} className="accent-teal" />
                    Rhyme mode
                  </label>
                </div>
              )}
            </FilterPill>

            <button
              onClick={handleCreate}
              disabled={!idea.trim() || creating}
              className="inline-flex items-center gap-2 bg-teal text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-text transition-colors shrink-0"
            >
              {creating ? "Creating…" : "Create My Story Book"}
              {!creating && <ArrowRight size={16} />}
            </button>
          </div>

          {createError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-base text-ink font-medium mb-3">Not sure what to write? Try one:</p>
          <div className="flex flex-nowrap items-center justify-center gap-3 overflow-x-auto thin-scroll pb-1">
            {quickStarts.map((q) => (
              <button
                key={q.label}
                onClick={() => setIdea(q.idea)}
                className="shrink-0 text-sm font-medium border border-line rounded-full px-4 py-2 bg-white hover:border-teal hover:bg-teal-tint transition-colors shadow-sm"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* hand-drawn flourish — sits in normal flow under the chip row so it
              always stays correctly anchored, rather than absolutely positioned
              against a row whose width shifts with viewport size */}
          <div className="hidden lg:flex justify-end max-w-[560px] mx-auto mt-1 pr-6 text-teal-text/70">
            <div className="flex items-start gap-1.5">
              <svg width="46" height="34" viewBox="0 0 46 34" fill="none" className="shrink-0 mt-0.5">
                <path
                  d="M6 4 C 24 2, 40 8, 40 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M40 24 L32 20 M40 24 L36 32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span className="font-display text-sm italic">Try an idea above</span>
            </div>
          </div>
        </div>
      </div>
    </StepShell>
  );
}