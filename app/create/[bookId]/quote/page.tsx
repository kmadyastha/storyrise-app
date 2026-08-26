"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/create/StepShell";
import Card from "@/components/ui/Card";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { getBook, getCharacters, getStoryPages, updateBookStatus, type Book, type StoryPage } from "@/lib/supabase/queries";
import { Sparkles, Users } from "lucide-react";

export default function QuoteStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { tier } = useApp();
  const isFree = tier === "none";

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
  // pages currently render at the same flat per-page rate as any other page
  // (the generation routes don't apply a cost override for them) — an
  // earlier version of this quote screen offered a "full multi-character"
  // option at a 2x surcharge, but that choice was never actually persisted
  // or enforced at charge time, so it silently never affected billing.
  // Removed rather than left promising something the system doesn't do.
  const multiCharacterPages = pages.filter((p) => p.multi_character);
  const total = 1 + characterCount + pages.length;

  return (
    <StepShell
      activeKey="quote"
      title="Your credit quote"
      onBack={`/create/${bookId}/characters`}
      onNext={goToGenerating}
      nextLabel={`Generate storybook — ${total} credits`}
      bookId={bookId}
    >
      <div className="space-y-4">
        {multiCharacterPages.length > 0 && (
          <Card className="bg-teal-tint border-teal/20 flex items-start gap-2.5 text-sm text-ink-soft">
            <Users size={16} className="text-teal-text shrink-0 mt-0.5" />
            <span>
              {multiCharacterPages.length} page{multiCharacterPages.length === 1 ? "" : "s"} feature multiple characters
              together — rendered using a same-frame technique (over-the-shoulder, cropped second character) at the same
              rate as any other page.
            </span>
          </Card>
        )}

        <Card className="flex items-center justify-between bg-ink text-white">
          <span className="text-sm flex items-center gap-2">
            <Sparkles size={15} /> Total credit cost
          </span>
          <span className="font-display text-xl font-semibold">{total} credits</span>
        </Card>

        <p className="text-xs text-ink-soft">
          {pages.length} page{pages.length === 1 ? "" : "s"} + {characterCount} character reference
          {characterCount === 1 ? "" : "s"} + 1 for the story itself.
        </p>
      </div>
    </StepShell>
  );
}