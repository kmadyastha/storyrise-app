"use client";

import { Lock } from "lucide-react";
import { useApp } from "@/lib/app-context";

/**
 * Universal lock-marker. Rendered as a <span> (not <button>) because every
 * call site sits inside an already-clickable card/button — nesting a real
 * <button> there is invalid HTML and breaks hydration.
 */
export default function PaidBadge({ inline = false }: { inline?: boolean }) {
  const { openUpgradeModal } = useApp();
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        openUpgradeModal();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          e.preventDefault();
          openUpgradeModal();
        }
      }}
      className={`inline-flex items-center gap-1 text-[11px] font-medium bg-tangerine-tint text-tangerine-text rounded-full px-2 py-0.5 hover:bg-tangerine/20 transition-colors cursor-pointer ${
        inline ? "" : "absolute top-2 right-2"
      }`}
    >
      <Lock size={10} /> Paid
    </span>
  );
}
