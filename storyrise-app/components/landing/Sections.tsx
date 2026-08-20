import Card from "@/components/ui/Card";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Check, X, BookOpen, Video, Printer, Users } from "lucide-react";
import { Fragment } from "react";

const features = [
  {
    icon: Users,
    title: "A whole cast, not one hero",
    body: "Name every character in your story — child, sibling, pet, grandparent — and StoryRise keeps them all recognizable across every page.",
  },
  {
    icon: BookOpen,
    title: "Two formats, one story",
    body: "Classic alternates image and text pages at a lower cost. Immersive blends both on every spread — StoryRise's signature layout.",
  },
  {
    icon: Printer,
    title: "Actually printable",
    body: "Pick the KDP-minimum page count upfront and export a real print-ready file — trim size, spine width, and barcode space handled for you.",
  },
  {
    icon: Video,
    title: "Or watch it come alive",
    body: "Every Immersive page becomes a narrated video scene, ready for YouTube, Instagram, or a keepsake you can actually play back.",
  },
];

// shared "island" wrapper: big rounded white panel, generous padding, tight
// outer spacing so the tinted collage background stays visible in the gaps
function Island({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-5 sm:pt-6">
      <div
        className={`bg-white rounded-[32px] sm:rounded-[44px] p-8 sm:p-14 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] ${className}`}
      >
        {children}
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <Island className="!p-0 overflow-hidden">
      <div id="features" className="p-8 sm:p-14">
        <div className="max-w-xl mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3">
            One story, generated once, exported everywhere
          </h2>
          <p className="text-ink-soft">
            Nothing else on the market combines consistent multi-character illustration with dual book-and-video export.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4 bg-paper rounded-2xl p-5">
              <span className="shrink-0 w-11 h-11 rounded-full bg-teal-tint text-teal-text grid place-items-center">
                <f.icon size={19} />
              </span>
              <div>
                <h3 className="font-display font-semibold text-lg mb-1.5">{f.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Island>
  );
}

const compareRows = [
  ["Character scope", "Single hero character", "Multiple named characters, together"],
  ["Page design", "Alternating image / text only", "Classic or Immersive (image + text blended)"],
  ["Reference photos", "Allows real child photos", "Description-based only — never a real photo"],
  ["Export", "PDF, print order", "PDF, PPTX, video, KDP file, Etsy PDF"],
  ["Commercial rights", "Gated to $99 Business tier", "Included on every paid tier"],
];

export function ComparisonTable() {
  return (
    <Island className="!p-0 overflow-hidden">
      <div className="p-8 sm:p-14 pb-0 sm:pb-0">
        <div className="max-w-xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3">How StoryRise is different</h2>
          <p className="text-ink-soft">Compared to the closest tool on the market today.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 text-sm">
        <div className="p-4 sm:p-5 font-medium text-ink-soft border-b border-line" />
        <div className="p-4 sm:p-5 font-display font-semibold border-b border-line border-l border-line">
          Closest competitor
        </div>
        <div className="p-4 sm:p-5 font-display font-semibold border-b border-line border-l border-line bg-teal-tint text-teal-text">
          StoryRise
        </div>
        {compareRows.map(([label, other, us]) => (
          <Fragment key={label}>
            <div className="p-4 sm:p-5 text-ink-soft border-b border-line last:border-b-0">{label}</div>
            <div className="p-4 sm:p-5 border-b border-line border-l border-line last:border-b-0 flex gap-2 items-start text-ink-soft">
              <X size={15} className="shrink-0 mt-0.5 text-ink-soft/60" /> {other}
            </div>
            <div className="p-4 sm:p-5 border-b border-line border-l border-line last:border-b-0 flex gap-2 items-start bg-teal-tint/40 last:rounded-br-[32px]">
              <Check size={15} className="shrink-0 mt-0.5 text-teal-text" /> {us}
            </div>
          </Fragment>
        ))}
      </div>
    </Island>
  );
}

export function FormatShowcase() {
  return (
    <Island>
      <div className="max-w-xl mb-10">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3">Two formats, one story</h2>
        <p className="text-ink-soft">Pick per book — Classic keeps costs down, Immersive is StoryRise&rsquo;s signature look.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-teal-tint/40 border-teal/20">
          <span className="text-xs font-medium text-teal-text bg-white rounded-full px-3 py-1 w-fit block mb-4">Classic</span>
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="rounded-xl overflow-hidden"><IllustrationPlaceholder color="teal" seed={2} /></div>
            <div className="rounded-xl bg-white grid place-items-center p-4 text-xs text-ink-soft leading-relaxed">
              &ldquo;Maya climbed higher than she&rsquo;d ever climbed before, past clouds shaped like teacups.&rdquo;
            </div>
          </div>
          <p className="text-sm text-ink-soft">Alternating image and text pages. Lower cost, still exports to KDP.</p>
        </Card>
        <Card className="bg-tangerine-tint/40 border-tangerine/20">
          <span className="text-xs font-medium text-tangerine-text bg-white rounded-full px-3 py-1 w-fit block mb-4">Immersive</span>
          <div className="relative rounded-xl overflow-hidden mb-5">
            <IllustrationPlaceholder color="tangerine" seed={3} />
            <div className="absolute inset-x-3 bottom-3 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-ink">
              &ldquo;Maya climbed higher than she&rsquo;d ever climbed before, past clouds shaped like teacups.&rdquo;
            </div>
          </div>
          <p className="text-sm text-ink-soft">Every page blends image and text — StoryRise&rsquo;s signature design. Supports video export.</p>
        </Card>
      </div>
    </Island>
  );
}

export function CTABand() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-5 sm:pt-6 pb-10 sm:pb-14">
      <div className="bg-ink text-white text-center rounded-[32px] sm:rounded-[44px] py-14 sm:py-20 px-8">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3">Your first story is free</h2>
        <p className="text-white/70 mb-7 max-w-md mx-auto">
          A 6-page trial book, no card required. See consistent characters and real output before you pay for anything.
        </p>
        <Link href="/create">
          <Button size="lg">Start your story free</Button>
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-soft">
        <span>© {new Date().getFullYear()} StoryRise. Personalized storybooks, illustrated and alive.</span>
        <div className="flex gap-5">
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/login" className="hover:text-ink">Log in</Link>
        </div>
      </div>
    </footer>
  );
}
