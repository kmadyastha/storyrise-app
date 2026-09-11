"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import FilterPill from "@/components/create/FilterPill";
import PaidBadge from "@/components/paywall/PaidBadge";
import ClarifyModal, { type ClarifyQuestion } from "@/components/create/ClarifyModal";
import {
  storyStyles,
  ageGroups,
  artStyles,
  settings,
  mythologySubTypes,
  storyTypes,
  chapterCountOptions,
  illustrationDensityOptions,
  subjects,
  educationalTypes,
  explanationStyles,
  gradeLevels,
  bookSizes,
} from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { createBook } from "@/lib/supabase/queries";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Minus,
  Plus,
  SlidersHorizontal,
  AlertCircle,
  ChevronDown,
  Palette,
  MapPin,
  Landmark,
  Wand2,
  BookOpen,
  GraduationCap,
  Image as ImageIcon,
  X,
} from "lucide-react";
import clsx from "clsx";

const pictureQuickStarts = [
  { label: "Bedtime adventure", idea: "A gentle bedtime adventure where my child drifts off into a dream about a floating island of clouds." },
  { label: "First day of school", idea: "My child's nervous, exciting first day at a new school, and the friend they make by lunchtime." },
  { label: "Family memory", idea: "Our family's weekend camping trip, turned into an adventure where the campfire tells stories back." },
  { label: "Surprise me", idea: "A curious kid discovers a hidden door in their backyard that leads somewhere nobody in the family has ever been." },
];

const longformQuickStarts = [
  { label: "Fantasy quest", idea: "A young apprentice must retrieve a stolen artifact before it falls into the wrong hands, journeying through three very different kingdoms." },
  { label: "Mystery", idea: "Strange things keep happening at the old lighthouse, and the new kid in town is determined to find out why." },
  { label: "Survival story", idea: "Two siblings get separated from their family during a storm and have to find their way back using nothing but their wits." },
  { label: "Surprise me", idea: "A shy kid discovers they can talk to animals, right as the town's oldest tree goes missing." },
];

const educationalQuickStarts = [
  { label: "The water cycle", idea: "How the water cycle works — evaporation, condensation, and precipitation." },
  { label: "How volcanoes form", idea: "What causes volcanoes to form and why they erupt." },
  { label: "The human heart", idea: "How the human heart pumps blood around the body." },
  { label: "Fractions", idea: "What fractions are and how to compare and add simple ones." },
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

// Shared across all 3 content types' filter rows — defined once so it can
// sit inline with the other filters (Ages, Subject, etc.) as asked, rather
// than living in its own separate, disconnected row above them.
function BookSizeFilterPill({ bookSizeId, setBookSizeId }: { bookSizeId: string; setBookSizeId: (id: string) => void }) {
  return (
    <FilterPill label="Book size" value={bookSizes.find((s) => s.id === bookSizeId)?.label.split(" — ")[0] ?? ""} panelClassName="w-72">
      {(close) => (
        <div className="space-y-1.5">
          {bookSizes.map((s) => (
            <OptionButton
              key={s.id}
              active={bookSizeId === s.id}
              onClick={() => {
                setBookSizeId(s.id);
                close();
              }}
              className="text-left w-full"
            >
              {s.label}
            </OptionButton>
          ))}
          <p className="text-[11px] text-ink-soft pt-1 px-1">Illustrations are generated to match this shape.</p>
        </div>
      )}
    </FilterPill>
  );
}

// Accordion section for the redesigned Advanced Options panel — structured,
// StoryBee-style groups instead of one flat stack of controls.
function AccordionSection({
  icon,
  title,
  defaultOpen,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-paper/60 hover:bg-paper transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-ink">
          {icon}
          {title}
        </span>
        <ChevronDown size={14} className={clsx("text-ink-soft transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="p-3 border-t border-line">{children}</div>}
    </div>
  );
}

export default function CreateStep1() {
  const router = useRouter();
  const { tier, openUpgradeModal, user, openLoginModal, authLoading } = useApp();
  const isFree = tier === "none";
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [idea, setIdea] = useState("");
  const [contentType, setContentType] = useState<"picture" | "longform" | "educational">("picture");
  const [style, setStyle] = useState<string>(storyStyles[0]);
  const [mythologySubType, setMythologySubType] = useState<string>(mythologySubTypes[0]);
  const [age, setAge] = useState<string>(ageGroups[1]);
  const [pageCount, setPageCount] = useState(isFree ? 6 : 20);
  const [format, setFormat] = useState<"classic" | "immersive">("classic");
  // Layout picker was removed (quick-hack per explicit product decision — the
  // image-left/image-right selection buttons had a real, unresolved click
  // interaction bug) — image-left is now the only Immersive layout.
  const layout: "image-left" | "image-right" = "image-left";
  const [artStyle, setArtStyle] = useState(artStyles[0]);
  const [setting, setSetting] = useState(settings[0]);
  const [rhyme, setRhyme] = useState(false);

  // Long-Form Story Book fields
  const [chapterCount, setChapterCount] = useState<number>(chapterCountOptions[1]);
  const [longformPages, setLongformPages] = useState(60);
  const [storyType, setStoryType] = useState<string>(storyTypes[0]);
  const [illustrationDensity, setIllustrationDensity] = useState<(typeof illustrationDensityOptions)[number]["id"]>("per_chapter");
  const [totalIllustrations, setTotalIllustrations] = useState<number>(chapterCountOptions[1]);

  // Educational Book fields
  const [subject, setSubject] = useState<string>(subjects[0]);
  const [educationalType, setEducationalType] = useState<string>(educationalTypes[0]);
  const [explanationStyle, setExplanationStyle] = useState<(typeof explanationStyles)[number]["id"]>("eli5");
  const [gradeLevel, setGradeLevel] = useState<string>(gradeLevels[0]);
  const [concepts, setConcepts] = useState<string[]>([""]);
  const [educationalPages, setEducationalPages] = useState(16);
  const [bookSizeId, setBookSizeId] = useState<string>(bookSizes.find((s) => "default" in s && s.default)?.id ?? bookSizes[0].id);

  const pageLabel = pagePresets.find((p) => p.count === pageCount)?.count ?? pageCount;
  const isMythology = style === "Mythology";

  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyQuestion[]>([]);
  const [checkingClarity, setCheckingClarity] = useState(false);

  const handleCreateClick = async () => {
    const hasValidInput = contentType === "educational" ? concepts.some((c) => c.trim()) : idea.trim();
    if (!hasValidInput) return;
    if (!user) {
      openLoginModal();
      return;
    }
    if (authLoading) {
      // tier defaults to "none" until the real profile finishes loading —
      // submitting before then would bake an incorrect isFreeTrial=true
      // into this book permanently (every future credit check for it would
      // wrongly treat a paid book as free, silently never charging).
      setCreateError("Still loading your account — please try again in a moment.");
      return;
    }
    // Long-Form and Educational are browsable on the free trial (per
    // explicit product decision) but can't actually be generated on it —
    // only Picture Story Book has a free-trial generation path at all.
    if (contentType !== "picture" && isFree) {
      openUpgradeModal();
      return;
    }

    // Quick check first: is the idea clear enough, or would a couple of
    // clarifying questions genuinely improve the book? This call is
    // deliberately fail-open (see the route) — if it errors or times out,
    // we just proceed straight to creation rather than block on it.
    setCheckingClarity(true);
    try {
      const res = await fetch("/api/clarify-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          contentType,
          pageCount: contentType === "longform" ? longformPages : contentType === "educational" ? educationalPages : pageCount,
          concepts: contentType === "educational" ? concepts.filter((c) => c.trim()) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({ needsClarification: false, questions: [] }));
      if (data.needsClarification && Array.isArray(data.questions) && data.questions.length > 0) {
        setClarifyQuestions(data.questions);
        setClarifyOpen(true);
        setCheckingClarity(false);
        return;
      }
    } catch {
      // Fail open — proceed straight to creation.
    }
    await doCreateBook();
  };

  const doCreateBook = async (clarificationSummary?: string) => {
    if (!user) {
      openLoginModal();
      return;
    }
    setCreating(true);
    setCheckingClarity(false);
    setCreateError(null);

    // Mythology sub-type is packed into the stored style value itself
    // ("Mythology - Bible" etc.) so generate-story can branch its prompt on
    // it without needing a schema change.
    const finalStyle = isMythology ? `Mythology - ${mythologySubType}` : style;

    const filledConcepts = concepts.map((c) => c.trim()).filter(Boolean);
    // For Educational, the structured concept boxes ARE the real topic —
    // the free-text box becomes optional supplementary context rather than
    // the only place to describe what the book covers, which is what was
    // confusing about typing "Heart, Brain & Digestive System" into one
    // field and having no visibility into how it'd get split up.
    const educationalIdea =
      filledConcepts.join(", ") + (idea.trim() ? ` — ${idea.trim()}` : "") + (clarificationSummary ? ` — ${clarificationSummary}` : "");
    const finalIdea = (contentType === "educational" ? educationalIdea : idea.trim()) + (clarificationSummary && contentType !== "educational" ? ` — ${clarificationSummary}` : "");

    const supabase = createClient();
    const { data: book, error } = await createBook(supabase, user.id, {
      idea: finalIdea,
      style: contentType === "picture" ? finalStyle : style,
      ageGroup: age,
      pageCount: contentType === "longform" ? longformPages : contentType === "educational" ? educationalPages : pageCount,
      format,
      layout,
      artStyle,
      setting,
      rhymeMode: rhyme,
      isFreeTrial: isFree,
      contentType,
      bookSizeId,
      ...(contentType === "longform" && {
        chapterCount,
        illustrationDensity,
        totalIllustrations,
        storyType,
      }),
      ...(contentType === "educational" && {
        subject,
        conceptCount: filledConcepts.length,
        concepts: filledConcepts,
        explanationStyle,
        gradeLevel,
        storyType: educationalType, // reuses the same column — "story-wrapped" vs "direct concept" is educational's version of "story type"
      }),
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

  const headerCopy: Record<typeof contentType, { eyebrow: string; headline: string }> = {
    picture: { eyebrow: "A picture-book press, powered by AI", headline: "Turn an Idea into a Story Book" },
    longform: { eyebrow: "Full chapter books, powered by AI", headline: "Turn an Idea into a Chapter Book" },
    educational: { eyebrow: "Concepts, explained beautifully", headline: "Turn a Concept into a Learning Book" },
  };

  return (
    <StepShell activeKey="create" title="" hideFooter wide>
      <div className="max-w-3xl mx-auto text-center mb-8">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-text mb-3">
          <Sparkles size={14} /> {headerCopy[contentType].eyebrow}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{headerCopy[contentType].headline}</h1>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-5 overflow-x-auto">
          <div className="inline-flex items-center gap-1 bg-paper rounded-full p-1 border border-line shrink-0">
            <button
              onClick={() => setContentType("picture")}
              className={clsx(
                "inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-full px-3 sm:px-4 py-2 transition-colors whitespace-nowrap shrink-0",
                contentType === "picture" ? "bg-teal text-white" : "text-ink-soft hover:text-ink"
              )}
            >
              <ImageIcon size={14} className="shrink-0" /> <span className="sm:hidden">Picture</span><span className="hidden sm:inline">Picture Story Book</span>
            </button>
            <button
              onClick={() => setContentType("longform")}
              className={clsx(
                "relative inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-full px-3 sm:px-4 py-2 transition-colors whitespace-nowrap shrink-0",
                contentType === "longform" ? "bg-teal text-white" : "text-ink-soft hover:text-ink"
              )}
            >
              <BookOpen size={14} className="shrink-0" /> <span className="sm:hidden">Chapter Book</span><span className="hidden sm:inline">Long-Form Story Book</span>
              {isFree && contentType !== "longform" && <PaidBadge inline />}
            </button>
            <button
              onClick={() => setContentType("educational")}
              className={clsx(
                "relative inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-full px-3 sm:px-4 py-2 transition-colors whitespace-nowrap shrink-0",
                contentType === "educational" ? "bg-teal text-white" : "text-ink-soft hover:text-ink"
              )}
            >
              <GraduationCap size={14} className="shrink-0" /> Educational
              {isFree && contentType !== "educational" && <PaidBadge inline />}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[28px] border border-line shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-5 sm:p-6">
          {contentType === "educational" && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2 block">
                What should this book cover?
              </label>
              <div className="space-y-2">
                {concepts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={c}
                      onChange={(e) => setConcepts((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                      placeholder={i === 0 ? 'e.g. "Heart"' : `Concept ${i + 1} (optional)`}
                      className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    />
                    {concepts.length > 1 && (
                      <button
                        onClick={() => setConcepts((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-ink-soft hover:text-red-500 shrink-0"
                        aria-label="Remove concept"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {concepts.length < 6 && (
                <button
                  onClick={() => setConcepts((prev) => [...prev, ""])}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-text hover:text-teal"
                >
                  <Plus size={12} /> Add another concept
                </button>
              )}
              <p className="text-[11px] text-ink-soft mt-2">
                Each concept gets its own dedicated section of the book — this is what actually drives what gets written,
                not the box below.
              </p>
            </div>
          )}

          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={contentType === "educational" ? 2 : 3}
            placeholder={
              contentType === "picture"
                ? "One sentence is enough — or paste a story you already wrote…"
                : contentType === "longform"
                ? "Describe the story — a premise, a world, a character's journey…"
                : "Anything extra to guide the tone or angle? (optional)"
            }
            className="w-full resize-none border-none outline-none text-base sm:text-lg placeholder:text-ink-soft/70"
          />

          {contentType === "picture" && (
          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-line">
            <BookSizeFilterPill bookSizeId={bookSizeId} setBookSizeId={setBookSizeId} />
            <span className="text-line hidden sm:inline">|</span>
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

            <FilterPill label="Style" value={isMythology ? `Mythology · ${mythologySubType}` : style} panelClassName="w-80">
              {(close) => (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {storyStyles.map((s) => (
                      <OptionButton
                        key={s}
                        active={style === s}
                        onClick={() => {
                          setStyle(s);
                          if (s !== "Mythology") close();
                        }}
                        className="text-left"
                      >
                        {s}
                      </OptionButton>
                    ))}
                  </div>

                  {isMythology && (
                    <div className="pt-2 border-t border-line">
                      <p className="text-[11px] font-medium text-ink-soft mb-1.5">Mythology style</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {mythologySubTypes.map((m) => (
                          <OptionButton
                            key={m}
                            active={mythologySubType === m}
                            onClick={() => {
                              setMythologySubType(m);
                              close();
                            }}
                            className="text-left"
                          >
                            {m}
                          </OptionButton>
                        ))}
                      </div>
                    </div>
                  )}
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
                              : p.caption && (isFree || p.count !== 6)
                              ? "bg-tangerine-tint border-tangerine/30 hover:border-tangerine"
                              : "bg-white border-line hover:border-teal hover:bg-teal-tint/40"
                          )}
                        >
                          <span className="flex items-center gap-1 font-medium">
                            {p.count}
                            {locked && <Lock size={9} />}
                          </span>
                          {p.caption && (isFree || p.count !== 6) && (
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

            <FilterPill label="Text position" value={format === "classic" ? "At the bottom" : "Overlaid on image"} panelClassName="w-80" align="right">
              {() => (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <OptionButton active={format === "classic"} onClick={() => setFormat("classic")} className="text-left !py-2.5">
                      <span className="font-medium block">Text at the bottom</span>
                      <span className={clsx("text-xs", format === "classic" ? "text-white/80" : "text-ink-soft")}>
                        Full image, caption underneath
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
                      <span className="font-medium block">Text overlaid</span>
                      <span className={clsx("text-xs", format === "immersive" ? "text-white/80" : "text-ink-soft")}>
                        Full image, text on top
                      </span>
                      {isFree && <PaidBadge />}
                    </button>
                  </div>

                  {format === "immersive" && !isFree && (
                    <p className="text-[11px] text-ink-soft pt-1">Full illustration, with the story overlaid on top.</p>
                  )}
                </div>
              )}
            </FilterPill>
          </div>
          )}

          {contentType === "longform" && (
          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-line">
            <BookSizeFilterPill bookSizeId={bookSizeId} setBookSizeId={setBookSizeId} />
            <span className="text-line hidden sm:inline">|</span>
            <FilterPill label="Ages" value={age}>
              {(close) => (
                <div className="grid grid-cols-2 gap-1.5">
                  {ageGroups.map((a) => (
                    <OptionButton key={a} active={age === a} onClick={() => { setAge(a); close(); }}>
                      {a}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Story type" value={storyType} panelClassName="w-80">
              {(close) => (
                <div className="grid grid-cols-2 gap-1.5">
                  {storyTypes.map((s) => (
                    <OptionButton key={s} active={storyType === s} onClick={() => { setStoryType(s); close(); }} className="text-left">
                      {s}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Chapters" value={String(chapterCount)} panelClassName="w-64" align="right">
              {(close) => (
                <div className="grid grid-cols-4 gap-1.5">
                  {chapterCountOptions.map((c) => (
                    <OptionButton key={c} active={chapterCount === c} onClick={() => { setChapterCount(c); close(); }}>
                      {c}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Pages" value={String(longformPages)} panelClassName="w-72" align="right">
              {() => (
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setLongformPages((p) => Math.max(20, p - 10))}
                    className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold">{longformPages}</span>
                  <button
                    onClick={() => setLongformPages((p) => Math.min(300, p + 10))}
                    className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill
              label="Illustrations"
              value={illustrationDensityOptions.find((o) => o.id === illustrationDensity)?.label ?? ""}
              panelClassName="w-96"
              align="right"
            >
              {() => (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-1.5">
                    {illustrationDensityOptions.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          setIllustrationDensity(o.id);
                          // Suggest a sensible starting total based on the
                          // chosen density — the user can still override it
                          // with the stepper below.
                          if (o.id === "none") setTotalIllustrations(0);
                          else if (o.id === "per_chapter") setTotalIllustrations(chapterCount);
                          else if (o.id === "two_per_chapter") setTotalIllustrations(chapterCount * 2);
                          else setTotalIllustrations(Math.max(1, Math.round(longformPages / 4.5)));
                        }}
                        className={clsx(
                          "text-left rounded-lg px-3 py-2 border transition-colors",
                          illustrationDensity === o.id ? "bg-teal text-white border-teal" : "bg-white border-line hover:border-teal hover:bg-teal-tint/40"
                        )}
                      >
                        <span className="font-medium block text-sm">{o.label}</span>
                        <span className={clsx("text-xs", illustrationDensity === o.id ? "text-white/80" : "text-ink-soft")}>{o.desc}</span>
                      </button>
                    ))}
                  </div>

                  {illustrationDensity !== "none" && (
                    <div className="pt-2 border-t border-line">
                      <p className="text-[11px] font-medium text-ink-soft mb-1.5">Total illustrations (adjustable)</p>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setTotalIllustrations((t) => Math.max(1, t - 1))}
                          className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-sm font-semibold">{totalIllustrations}</span>
                        <button
                          onClick={() => setTotalIllustrations((t) => t + 1)}
                          className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FilterPill>
          </div>
          )}

          {contentType === "educational" && (
          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-line">
            <BookSizeFilterPill bookSizeId={bookSizeId} setBookSizeId={setBookSizeId} />
            <span className="text-line hidden sm:inline">|</span>
            <FilterPill label="Subject" value={subject} panelClassName="w-80">
              {(close) => (
                <div className="grid grid-cols-2 gap-1.5">
                  {subjects.map((s) => (
                    <OptionButton key={s} active={subject === s} onClick={() => { setSubject(s); close(); }} className="text-left">
                      {s}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Type" value={educationalType} panelClassName="w-72">
              {(close) => (
                <div className="grid grid-cols-1 gap-1.5">
                  {educationalTypes.map((t) => (
                    <OptionButton key={t} active={educationalType === t} onClick={() => { setEducationalType(t); close(); }} className="text-left">
                      {t}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill
              label="Style"
              value={explanationStyles.find((s) => s.id === explanationStyle)?.label ?? ""}
              panelClassName="w-80"
            >
              {(close) => (
                <div className="grid grid-cols-1 gap-1.5">
                  {explanationStyles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setExplanationStyle(s.id); close(); }}
                      className={clsx(
                        "text-left rounded-lg px-3 py-2 border transition-colors",
                        explanationStyle === s.id ? "bg-teal text-white border-teal" : "bg-white border-line hover:border-teal hover:bg-teal-tint/40"
                      )}
                    >
                      <span className="font-medium block text-sm">{s.label}</span>
                      <span className={clsx("text-xs", explanationStyle === s.id ? "text-white/80" : "text-ink-soft")}>{s.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Grade" value={gradeLevel} panelClassName="w-64" align="right">
              {(close) => (
                <div className="grid grid-cols-1 gap-1.5">
                  {gradeLevels.map((g) => (
                    <OptionButton key={g} active={gradeLevel === g} onClick={() => { setGradeLevel(g); close(); }} className="text-left">
                      {g}
                    </OptionButton>
                  ))}
                </div>
              )}
            </FilterPill>

            <span className="text-line hidden sm:inline">|</span>

            <FilterPill label="Pages" value={String(educationalPages)} panelClassName="w-72" align="right">
              {() => (
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setEducationalPages((p) => Math.max(8, p - 4))}
                    className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold">{educationalPages}</span>
                  <button
                    onClick={() => setEducationalPages((p) => Math.min(80, p + 4))}
                    className="w-8 h-8 rounded-lg border border-line grid place-items-center hover:border-teal"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </FilterPill>
          </div>
          )}

          {/* Advanced options (left) + CTA (right) — always on their own row, CTA always flush right */}
          <div className="flex items-center justify-between gap-3 mt-3">
            {contentType === "picture" ? (
            <FilterPill label="" value="Advanced options" icon={<SlidersHorizontal size={14} className="text-ink-soft" />} panelClassName="w-96">
              {() => (
                <div className="space-y-2 text-left">
                  <AccordionSection icon={<Palette size={13} className="text-teal-text" />} title="Illustration art style" defaultOpen>
                    <div className="flex flex-wrap gap-1.5">
                      {artStyles.map((a) => (
                        <OptionButton key={a} active={artStyle === a} onClick={() => setArtStyle(a)} className="!px-2.5 !py-1.5 text-xs">
                          {a}
                        </OptionButton>
                      ))}
                    </div>
                  </AccordionSection>

                  <AccordionSection icon={<MapPin size={13} className="text-teal-text" />} title="Setting / backdrop">
                    <div className="flex flex-wrap gap-1.5">
                      {settings.map((s) => (
                        <OptionButton key={s} active={setting === s} onClick={() => setSetting(s)} className="!px-2.5 !py-1.5 text-xs">
                          {s}
                        </OptionButton>
                      ))}
                    </div>
                  </AccordionSection>

                  {isMythology && (
                    <AccordionSection icon={<Landmark size={13} className="text-teal-text" />} title="Mythology style" defaultOpen>
                      <div className="flex flex-wrap gap-1.5">
                        {mythologySubTypes.map((m) => (
                          <OptionButton
                            key={m}
                            active={mythologySubType === m}
                            onClick={() => setMythologySubType(m)}
                            className="!px-2.5 !py-1.5 text-xs"
                          >
                            {m}
                          </OptionButton>
                        ))}
                      </div>
                    </AccordionSection>
                  )}

                  <AccordionSection icon={<Wand2 size={13} className="text-teal-text" />} title="Story extras">
                    <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
                      <input type="checkbox" checked={rhyme} onChange={(e) => setRhyme(e.target.checked)} className="accent-teal" />
                      Rhyme mode
                    </label>
                  </AccordionSection>
                </div>
              )}
            </FilterPill>
            ) : <span />}

            <button
              onClick={handleCreateClick}
              disabled={(contentType === "educational" ? !concepts.some((c) => c.trim()) : !idea.trim()) || creating || checkingClarity}
              className="relative inline-flex items-center gap-2 bg-teal text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-text transition-colors shrink-0"
            >
              {creating
                ? "Creating…"
                : checkingClarity
                ? "Thinking…"
                : contentType === "picture"
                ? "Create My Story Book"
                : contentType === "longform"
                ? "Create My Chapter Book"
                : "Create My Learning Book"}
              {!creating && !checkingClarity && <ArrowRight size={16} />}
              {isFree && contentType !== "picture" && <PaidBadge />}
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
            {(contentType === "picture" ? pictureQuickStarts : contentType === "longform" ? longformQuickStarts : educationalQuickStarts).map((q) => (
              <button
                key={q.label}
                onClick={() => setIdea(q.idea)}
                className="shrink-0 text-sm font-medium border border-line rounded-full px-4 py-2 bg-white hover:border-teal hover:bg-teal-tint transition-colors shadow-sm"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* hand-drawn flourish — curves up toward the chip row above it,
              arrowhead pointing up so it actually reads as "look up there"
              instead of trailing off into empty space */}
          <div className="hidden lg:flex justify-end max-w-[560px] mx-auto mt-1 pr-10 text-teal-text/70">
            <div className="flex items-end gap-1.5">
              <svg width="42" height="32" viewBox="0 0 42 32" fill="none" className="shrink-0 mb-1">
                <path
                  d="M4 29 C 9 12, 22 5, 36 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M36 4 L28 3.5 M36 4 L33 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              </svg>
              <span className="font-display text-sm italic">Try an idea above</span>
            </div>
          </div>
        </div>
      </div>

      <ClarifyModal
        open={clarifyOpen}
        questions={clarifyQuestions}
        onClose={() => {
          setClarifyOpen(false);
          doCreateBook();
        }}
        onSubmit={(answers) => {
          setClarifyOpen(false);
          const summary = clarifyQuestions.map((q, i) => `${q.question} ${answers[i]}`).join("; ");
          doCreateBook(summary);
        }}
      />
    </StepShell>
  );
}