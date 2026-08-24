"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { getUserBooks, type BookWithCoverImage } from "@/lib/supabase/queries";
import { Plus, Loader2, Droplet, BookOpen } from "lucide-react";

const statusLabel: Record<string, string> = {
  complete: "Complete",
  generating: "Generating…",
  draft: "Draft",
  story_generated: "Story ready",
  characters_confirmed: "Characters set",
};

const placeholderColors = ["teal", "lime", "green", "tangerine"] as const;

// Deterministic per book id, so the same book always gets the same
// placeholder color across visits rather than shuffling on every render.
function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return placeholderColors[hash % placeholderColors.length];
}

function formatRelativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { tier, credits, openUpgradeModal, user } = useApp();
  const [books, setBooks] = useState<BookWithCoverImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await getUserBooks(supabase, user.id);
      if (!cancelled) {
        setBooks(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Your books</h1>
          <p className="text-sm text-ink-soft mt-1">{credits} credits available on the {tier === "none" ? "Free" : "current"} plan.</p>
        </div>
        <Link href="/create">
          <Button size="lg"><Plus size={17} /> New story</Button>
        </Link>
      </div>

      {tier === "none" && (
        <Card className="mb-8 bg-tangerine-tint border-tangerine/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-white grid place-items-center text-tangerine-text">
              <Droplet size={18} />
            </span>
            <div>
              <p className="font-medium text-sm">You&rsquo;re on the free trial</p>
              <p className="text-xs text-ink-soft">One 6-page Classic book, watermarked export. Upgrade to unlock everything.</p>
            </div>
          </div>
          <Button size="sm" onClick={openUpgradeModal}>Upgrade</Button>
        </Card>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[20px] border border-line/70 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-paper" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-paper rounded w-3/4" />
                <div className="h-3 bg-paper rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-teal-tint text-teal-text grid place-items-center mx-auto mb-4">
            <BookOpen size={22} />
          </div>
          <h3 className="font-display font-semibold text-lg mb-1.5">No books yet</h3>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Turn a one-sentence idea into your first illustrated storybook — it only takes a few minutes.
          </p>
          <Link href="/create">
            <Button className="mx-auto"><Plus size={16} /> Create your first story</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((b) => (
            <Link key={b.id} href={`/create/${b.id}/preview`}>
              <Card padded={false} className="overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="relative aspect-[4/3]">
                  {b.cover_image_url ? (
                    <img src={b.cover_image_url} alt={b.title || "Untitled story"} className="w-full h-full object-cover" />
                  ) : (
                    <IllustrationPlaceholder color={colorForId(b.id)} seed={b.title?.length || b.id.length} className="w-full h-full" />
                  )}
                  {b.status === "generating" && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] grid place-items-center">
                      <span className="flex items-center gap-2 text-xs font-medium bg-white rounded-full px-3 py-1.5 shadow-sm">
                        <Loader2 size={13} className="animate-spin" /> Generating…
                      </span>
                    </div>
                  )}
                  {b.is_free_trial && (
                    <span className="absolute top-2 left-2 text-[10px] font-medium bg-white/90 rounded-full px-2 py-0.5">
                      Trial
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold mb-1 leading-snug">{b.title || "Untitled story"}</h3>
                  <p className="text-xs text-ink-soft">
                    {b.age_group} · {b.style} · {b.page_count}pg · {b.format === "immersive" ? "Immersive" : "Classic"}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-ink-soft">{formatRelativeDate(b.updated_at)}</span>
                    <span
                      className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                        b.status === "complete" ? "bg-green-tint text-green-text" : "bg-teal-tint text-teal-text"
                      }`}
                    >
                      {statusLabel[b.status] ?? b.status}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}