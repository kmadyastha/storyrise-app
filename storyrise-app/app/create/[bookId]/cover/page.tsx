"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import Card from "@/components/ui/Card";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { coverStyles, titlePlacements } from "@/lib/dummy-data";
import clsx from "clsx";

export default function CoverStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const [style, setStyle] = useState(coverStyles[0].id);
  const [placement, setPlacement] = useState(titlePlacements[0]);
  const [title, setTitle] = useState("Lumo and the Lantern Forest");
  const [author, setAuthor] = useState("");
  const [blurb, setBlurb] = useState(
    "When Lumo finds a lantern that only lights up for the brave, one quiet forest walk turns into the biggest adventure of her life."
  );

  return (
    <StepShell
      activeKey="cover"
      title="Design your cover"
      subtitle="Optional, but recommended for KDP and Etsy export. Generating the cover is where credits are charged."
      onBack={`/create/${bookId}/preview`}
      onNext={() => router.push(`/create/${bookId}/export`)}
      nextLabel="Generate cover — 1 credit"
      wide
    >
      <div className="grid md:grid-cols-[1fr_1.1fr] gap-8">
        <div>
          <div className="relative rounded-2xl overflow-hidden border border-line aspect-[3/4]">
            <IllustrationPlaceholder color="teal" seed={99} className="w-full h-full" />
            <div
              className={clsx(
                "absolute inset-x-4 text-center",
                placement === "Top-third banner" && "top-6",
                placement === "Centered overlay" && "top-1/2 -translate-y-1/2",
                placement === "Bottom ribbon" && "bottom-6"
              )}
            >
              <div className="bg-white/95 rounded-lg px-4 py-3">
                <p className="font-display font-semibold text-lg leading-snug">{title}</p>
                {author && <p className="text-xs text-ink-soft mt-1">by {author}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Cover style</label>
            <div className="grid grid-cols-1 gap-2">
              {coverStyles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={clsx(
                    "text-left rounded-xl border p-3.5",
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

          <Card className="bg-paper text-xs text-ink-soft">
            Amazon requires you to declare AI-assisted content when you upload — this happens on their site, not
            StoryRise&rsquo;s.
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
