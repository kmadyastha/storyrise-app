"use client";

import { use, useState } from "react";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import ExportPanel from "@/components/create/ExportPanel";
import CoverDrawer from "@/components/create/CoverDrawer";
import IllustrationPlaceholder from "@/components/ui/IllustrationPlaceholder";
import { dummyStoryTable } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { RefreshCw, AlertTriangle, Download, Palette, Eye, Clock } from "lucide-react";
import clsx from "clsx";

const colors = ["teal", "lime", "green", "tangerine"] as const;

export default function PreviewStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [active, setActive] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverGenerated, setCoverGenerated] = useState(false);
  const failedIndex = 2; // dummy: page 3 flagged as system-detected failure, auto-retried

  const page = dummyStoryTable[active];
  const color = colors[active % colors.length];

  const regenerate = () => {
    if (isFree) return openUpgradeModal();
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 1000);
  };

  return (
    <StepShell
      activeKey="preview"
      title="Preview your book"
      subtitle="All your pages, at a glance. Regenerate a single image, then export or design a cover whenever you're ready."
      onBack={`/create/${bookId}/quote`}
      hideFooter
      wide
    >
      {/* Primary actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setExportOpen(true)}
          className="inline-flex items-center gap-2 bg-ink text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-black transition-colors"
        >
          <Download size={15} /> Export
        </button>
        <button
          onClick={() => setCoverOpen(true)}
          className="inline-flex items-center gap-2 border border-line rounded-full px-5 py-2.5 text-sm font-medium hover:border-teal transition-colors"
        >
          {coverGenerated ? <Eye size={15} /> : <Palette size={15} />}
          {coverGenerated ? "View Cover" : "Create Cover"}
        </button>
      </div>

      <div className="grid md:grid-cols-[448px_280px] gap-8 items-start">
        {/* shrunk main image */}
        <div>
          <div className="relative rounded-2xl overflow-hidden border border-line max-w-md">
            <IllustrationPlaceholder color={color} seed={active + 1} className={clsx(regenerating && "opacity-40")} />
            <div className="absolute inset-x-3 bottom-3 bg-white/95 backdrop-blur rounded-lg px-3 py-2.5 text-xs">
              {page.narration}
            </div>
            {regenerating && (
              <div className="absolute inset-0 grid place-items-center">
                <RefreshCw size={20} className="animate-spin text-ink-soft" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="relative inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-full border border-line px-3.5 py-2 hover:border-teal disabled:opacity-50"
            >
              <RefreshCw size={13} /> Regenerate
              {isFree && <PaidBadge inline />}
            </button>
            <span className="text-[11px] text-ink-soft">Page {active + 1} of {dummyStoryTable.length}</span>
          </div>
        </div>

        {/* all thumbnails visible at once — no scrolling needed to see how many pages exist */}
        <div>
          <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2">
            {dummyStoryTable.length} pages
          </p>
          <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
            {dummyStoryTable.map((row, i) => (
              <button
                key={row.page}
                onClick={() => setActive(i)}
                className={clsx(
                  "relative aspect-[4/3] rounded-lg overflow-hidden border-2",
                  active === i ? "border-teal" : "border-transparent"
                )}
              >
                <IllustrationPlaceholder color={colors[i % colors.length]} seed={i + 1} className="w-full h-full" />
                <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-white/90 rounded px-1">
                  {row.page}
                </span>
                {i === failedIndex && (
                  <span className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-tangerine-text">
                    <AlertTriangle size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFree && (
        <p className="text-xs text-ink-soft mt-4">
          Per-slide regenerate is a paid feature on the free trial.
        </p>
      )}

      <div className="flex items-start gap-3 bg-tangerine-tint border border-tangerine/20 rounded-2xl p-4 mt-6 max-w-xl">
        <Clock size={16} className="text-tangerine-text shrink-0 mt-0.5" />
        <p className="text-xs text-ink-soft">
          Your book — and its cover, whether created today or a few days from now — is automatically deleted 30 days
          after this book was generated. No backups are kept.
        </p>
      </div>

      <ExportPanel open={exportOpen} onClose={() => setExportOpen(false)} format="immersive" />
      <CoverDrawer
        open={coverOpen}
        onClose={() => setCoverOpen(false)}
        onGenerated={() => setCoverGenerated(true)}
        bookTitle="Lumo and the Lantern Forest"
      />
    </StepShell>
  );
}