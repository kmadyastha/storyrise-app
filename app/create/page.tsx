"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import { storyStyles, ageGroups, pageCountOptions, artStyles, settings } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export default function CreateStep1() {
  const router = useRouter();
  const { tier } = useApp();
  const isFree = tier === "none";

  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<string>(storyStyles[0]);
  const [age, setAge] = useState<string>(ageGroups[1]);
  const [pageCount, setPageCount] = useState(isFree ? 6 : 20);
  const [format, setFormat] = useState<"classic" | "immersive">("classic");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [artStyle, setArtStyle] = useState(artStyles[0]);
  const [setting, setSetting] = useState(settings[0]);
  const [rhyme, setRhyme] = useState(false);

  return (
    <StepShell
      activeKey="create"
      title="What's the story?"
      subtitle="Give StoryRise an idea — as vague or specific as you like."
      onNext={() => router.push("/create/demo/story")}
      nextDisabled={!idea.trim()}
      nextLabel="Generate story table"
    >
      <div className="space-y-7">
        <div>
          <label className="text-sm font-medium mb-2 block">Idea or prompt</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            placeholder="e.g. My daughter Maya finds a magic seed that grows a vine into the clouds…"
            className="w-full rounded-xl border border-line p-4 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Style</label>
          <div className="flex flex-wrap gap-2">
            {storyStyles.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={clsx(
                  "text-sm rounded-full px-4 py-2 border transition-colors",
                  style === s ? "bg-teal text-white border-teal" : "border-line hover:border-teal"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Age group</label>
          <div className="flex flex-wrap gap-2">
            {ageGroups.map((a) => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={clsx(
                  "text-sm rounded-full px-4 py-2 border transition-colors",
                  age === a ? "bg-teal text-white border-teal" : "border-line hover:border-teal"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Page count</label>
          <div className="flex flex-wrap gap-2">
            {pageCountOptions.map((p) => {
              const locked = isFree && !p.freeTrial;
              return (
                <div
                  key={p.count}
                  role="button"
                  tabIndex={0}
                  onClick={() => !locked && setPageCount(p.count)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !locked) setPageCount(p.count);
                  }}
                  className={clsx(
                    "inline-flex items-center gap-1.5 text-sm rounded-full px-4 py-2 border transition-colors cursor-pointer select-none",
                    locked
                      ? "border-line text-ink-soft/60"
                      : pageCount === p.count
                      ? "bg-teal text-white border-teal"
                      : "border-line hover:border-teal"
                  )}
                >
                  {p.label}
                  {locked && <PaidBadge inline />}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Format</label>
          <div className="grid sm:grid-cols-2 gap-3">
            {(["classic", "immersive"] as const).map((f) => {
              const locked = isFree && f === "immersive";
              return (
                <div
                  key={f}
                  role="button"
                  tabIndex={0}
                  onClick={() => !locked && setFormat(f)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !locked) setFormat(f);
                  }}
                  className={clsx(
                    "relative text-left rounded-2xl border p-4 cursor-pointer select-none",
                    locked
                      ? "border-line opacity-60"
                      : format === f
                      ? "border-teal bg-teal-tint"
                      : "border-line hover:border-teal"
                  )}
                >
                  <span className="font-medium text-sm capitalize">{f}</span>
                  <p className="text-xs text-ink-soft mt-1">
                    {f === "classic"
                      ? "Alternating image/text pages. Lower cost."
                      : "Every page blends image + text. Supports video."}
                  </p>
                  {locked && <PaidBadge />}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <button
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Advanced filters <ChevronDown size={15} className={clsx("transition-transform", advancedOpen && "rotate-180")} />
          </button>
          {advancedOpen && (
            <div className="mt-4 space-y-5 bg-paper rounded-2xl p-5 border border-line">
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
