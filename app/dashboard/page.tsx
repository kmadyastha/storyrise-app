"use client";

import Link from "next/link";
import { dummyBooks } from "@/lib/dummy-data";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { useApp } from "@/lib/app-context";
import { Plus, Loader2, Droplet } from "lucide-react";

const statusLabel: Record<string, string> = {
  complete: "Complete",
  generating: "Generating…",
  draft: "Draft",
  story_generated: "Story ready",
  characters_confirmed: "Characters set",
};

export default function DashboardPage() {
  const { tier, credits, openUpgradeModal } = useApp();

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {dummyBooks.map((b) => (
          <Link key={b.id} href={`/create/${b.id}/preview`}>
            <Card padded={false} className="overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="relative">
                <IllustrationPlaceholder
                  color={b.coverColor as "teal" | "lime" | "green" | "tangerine"}
                  seed={b.title.length}
                />
                {b.status === "generating" && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] grid place-items-center">
                    <span className="flex items-center gap-2 text-xs font-medium bg-white rounded-full px-3 py-1.5 shadow-sm">
                      <Loader2 size={13} className="animate-spin" /> Generating…
                    </span>
                  </div>
                )}
                {b.isFreeTrial && (
                  <span className="absolute top-2 left-2 text-[10px] font-medium bg-white/90 rounded-full px-2 py-0.5">
                    Trial
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-display font-semibold mb-1 leading-snug">{b.title}</h3>
                <p className="text-xs text-ink-soft">
                  {b.ageGroup} · {b.style} · {b.pageCount}pg · {b.format === "immersive" ? "Immersive" : "Classic"}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-ink-soft">{b.updatedAt}</span>
                  <span
                    className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                      b.status === "complete" ? "bg-green-tint text-green-text" : "bg-teal-tint text-teal-text"
                    }`}
                  >
                    {statusLabel[b.status]}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}