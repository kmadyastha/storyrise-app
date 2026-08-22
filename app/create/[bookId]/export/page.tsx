"use client";

import { use, useState } from "react";
import StepShell from "@/components/create/StepShell";
import PaidBadge from "@/components/paywall/PaidBadge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { exportOptions } from "@/lib/dummy-data";
import { useApp } from "@/lib/app-context";
import { Download, Droplet, Clock } from "lucide-react";
import clsx from "clsx";

export default function ExportStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const { tier, openUpgradeModal } = useApp();
  const isFree = tier === "none";
  const [format] = useState<"classic" | "immersive">("immersive");
  const [kdpCover, setKdpCover] = useState<"with" | "without">("with");
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const isLocked = (id: string) => isFree && !["pdf", "pptx"].includes(id);

  const handleExport = (id: string) => {
    if (isLocked(id)) return openUpgradeModal();
    setDownloaded(id);
    setTimeout(() => setDownloaded(null), 1800);
  };

  return (
    <StepShell
      activeKey="export"
      title="Export your book"
      subtitle="Pick a format. Free-trial exports carry a watermark on PDF and PPTX."
      onBack={`/create/${bookId}/cover`}
      hideFooter
      wide
    >
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {exportOptions.map((opt) => {
          const disabledByFormat = opt.immersiveOnly && format !== "immersive";
          const locked = isLocked(opt.id) && !disabledByFormat;
          return (
            <Card
              key={opt.id}
              className={clsx(
                "relative flex flex-col",
                disabledByFormat ? "opacity-50" : ""
              )}
            >
              {locked && <PaidBadge />}
              <h3 className="font-display font-semibold mb-1">{opt.label}</h3>
              <p className="text-xs text-ink-soft mb-4 flex-1">
                {disabledByFormat ? "Classic books export as PDF, PPTX, or KDP print files." : opt.desc}
              </p>
              {isFree && opt.id === "pdf" && (
                <span className="inline-flex items-center gap-1 text-[11px] text-tangerine-text bg-tangerine-tint rounded-full px-2 py-0.5 w-fit mb-3">
                  <Droplet size={10} /> Watermarked
                </span>
              )}
              {isFree && opt.id === "pptx" && (
                <span className="inline-flex items-center gap-1 text-[11px] text-tangerine-text bg-tangerine-tint rounded-full px-2 py-0.5 w-fit mb-3">
                  <Droplet size={10} /> Watermarked
                </span>
              )}
              <Button
                size="sm"
                variant={locked || disabledByFormat ? "secondary" : "outline"}
                disabled={disabledByFormat}
                onClick={() => handleExport(opt.id)}
              >
                <Download size={14} /> {downloaded === opt.id ? "Downloaded!" : "Export"}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="bg-paper mb-6">
        <h3 className="font-medium text-sm mb-3">KDP cover</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setKdpCover("with")}
            className={clsx(
              "text-xs rounded-full px-3 py-1.5 border",
              kdpCover === "with" ? "bg-teal text-white border-teal" : "border-line bg-white hover:border-teal"
            )}
          >
            With cover
          </button>
          <button
            onClick={() => setKdpCover("without")}
            className={clsx(
              "text-xs rounded-full px-3 py-1.5 border",
              kdpCover === "without" ? "bg-teal text-white border-teal" : "border-line bg-white hover:border-teal"
            )}
          >
            Without cover (interior only)
          </button>
        </div>
      </Card>

      <Card className="flex items-start gap-3 bg-tangerine-tint border-tangerine/20">
        <Clock size={16} className="text-tangerine-text shrink-0 mt-0.5" />
        <p className="text-xs text-ink-soft">
          Download or save your book — it will be automatically deleted on{" "}
          <span className="font-medium text-ink">September 19, 2026</span>, 30 days from generation. No backups are kept.
        </p>
      </Card>
    </StepShell>
  );
}
