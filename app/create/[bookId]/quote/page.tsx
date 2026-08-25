"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import Card from "@/components/ui/Card";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { getBook, getCharacters, getStoryPages, updateBookStatus, type Book, type StoryPage } from "@/lib/supabase/queries";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

export default function QuoteStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier } = useApp();
  const isFree = tier === "none";
  const [multiMode, setMultiMode] = useState(false);

  const [book, setBook] = useState<Book | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: bookData }, { data: characters }, { data: pageData }] = await Promise.all([
        getBook(supabase, bookId),
        getCharacters(supabase, bookId),
        getStoryPages(supabase, bookId),
      ]);
      if (bookData) setBook(bookData);
      setCharacterCount(characters?.length ?? 0);
      setPages(pageData ?? []);
      setLoading(false);
    })();
  }, [bookId]);

  const goToGenerating = () => {
    // Fire-and-forget: this is a resume-progress marker, not something the
    // user should ever be blocked on if it fails.
    updateBookStatus(bookId, "generating").catch(() => {});
    router.push(`/create/${bookId}/generating`);
  };

  // Already fully generated (e.g. revisiting via the step rail or "My
  // books") — nothing left to quote or charge for. Showing the normal quote
  // screen here would look like credits are about to be deducted again,
  // which they aren't.
  if (book?.status === "complete") {
    return (
      <StepShell
        activeKey="quote"
        title="Already generated"
        subtitle="This book's illustrations are done — nothing further to charge for."
        onBack={`/create/${bookId}/characters`}
        onNext={() => router.push(`/create/${bookId}/preview`)}
        nextLabel="Continue to Preview"
        bookId={bookId}
      >
        <Card className="bg-teal-tint border-teal/20 text-sm text-ink-soft">
          This book was already fully generated — no new credits will be used by continuing.
        </Card>
      </StepShell>
    );
  }

  if (isFree) {
    return (
      <StepShell
        activeKey="quote"
        title="Ready to generate"
        subtitle="Free trial books render single-character framing automatically — no credit quote needed."
        onBack={`/create/${bookId}/characters`}
        onNext={goToGenerating}
        nextLabel="Generate your free storybook"
        bookId={bookId}
      >
        <Card className="bg-teal-tint border-teal/20 text-sm text-ink-soft">
          Your 6-page trial book (3 illustrated images) is included at no cost. Upgrade any time to unlock longer books,
          Immersive format, and multi-character scenes.
        </Card>
      </StepShell>
    );
  }

  if (loading) {
    return (
      <StepShell activeKey="quote" title="Loading…" onBack={`/create/${bookId}/characters`} hideFooter bookId={bookId}>
        <div className="text-sm text-ink-soft">Working out your quote…</div>
      </StepShell>
    );
  }

  // Real, per-book calculation — matches the actual credit model used at
  // generation time (lib/credits.ts): 1 credit for the story, 1 per
  // character reference image, 1 per page illustration. Multi-character
  // pages (flagged by Claude during story generation) can either render
  // cheaply in the default single-character framing, or cost an extra
  // credit each for genuine full multi-character scenes.
  const multiCharacterPages = pages.filter((p) => p.multi_character);
  const baseCredits = 1 + characterCount + pages.length;
  const surcharge = multiCharacterPages.length;
  const total = multiMode ? baseCredits + surcharge : baseCredits;

  // No multi-character pages at all — the whole framing choice doesn't
  // apply, so don't show a confusing decision with nothing to decide.
  if (multiCharacterPages.length === 0) {
    return (
      <StepShell
        activeKey="quote"
        title="Your credit quote"
        onBack={`/create/${bookId}/characters`}
        onNext={goToGenerating}
        nextLabel={`Generate storybook — ${baseCredits} credits`}
        bookId={bookId}
      >
        <Card className="flex items-center justify-between bg-ink text-white">
          <span className="text-sm flex items-center gap-2">
            <Sparkles size={15} /> Total credit cost
          </span>
          <span className="font-display text-xl font-semibold">{baseCredits} credits</span>
        </Card>
        <p className="text-xs text-ink-soft mt-3">
          {pages.length} page{pages.length === 1 ? "" : "s"} + {characterCount} character reference
          {characterCount === 1 ? "" : "s"} + 1 for the story itself.
        </p>
      </StepShell>
    );
  }

  return (
    <StepShell
      activeKey="quote"
      title="Your credit quote"
      subtitle={`${multiCharacterPages.length} page${
        multiCharacterPages.length === 1 ? "" : "s"
      } suggest multiple characters together. Choose how to render them before generating.`}
      onBack={`/create/${bookId}/characters`}
      onNext={goToGenerating}
      nextLabel={`Generate storybook — ${total} credits`}
      bookId={bookId}
    >
      <div className="space-y-4">
        <button
          onClick={() => setMultiMode(false)}
          className={clsx(
            "w-full text-left rounded-2xl border p-4",
            !multiMode ? "border-teal bg-teal-tint" : "border-line hover:border-teal"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Generate anyway (single-character framing)</span>
            <span className="text-sm font-display font-semibold">{baseCredits} credits</span>
          </div>
          <p className="text-xs text-ink-soft mt-1">
            Cheaper — same-frame technique (over-the-shoulder, cropped second character) keeps scenes readable.
          </p>
        </button>

        <button
          onClick={() => setMultiMode(true)}
          className={clsx(
            "w-full text-left rounded-2xl border p-4",
            multiMode ? "border-teal bg-teal-tint" : "border-line hover:border-teal"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">
              Enable full multi-character for these {multiCharacterPages.length} slides
            </span>
            <span className="text-sm font-display font-semibold">{baseCredits + surcharge} credits</span>
          </div>
          <p className="text-xs text-ink-soft mt-1">
            2x rate applies only to the {multiCharacterPages.length} affected slide{multiCharacterPages.length === 1 ? "" : "s"}.
          </p>
        </button>

        <Card className="flex items-center justify-between bg-ink text-white">
          <span className="text-sm flex items-center gap-2">
            <Sparkles size={15} /> Total credit cost
          </span>
          <span className="font-display text-xl font-semibold">{total} credits</span>
        </Card>
      </div>
    </StepShell>
  );
}