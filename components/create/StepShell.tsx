"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { ChevronLeft } from "lucide-react";

const STEPS = [
  { key: "create", label: "Idea" },
  { key: "story", label: "Story" },
  { key: "characters", label: "Characters" },
  { key: "quote", label: "Quote" },
  { key: "generating", label: "Generate" },
  { key: "preview", label: "Preview" },
];

// "create" (step 1) has no bookId yet — it's a different route shape
// (/create, not /create/[bookId]/...) that always starts a BRAND NEW book.
// Once inside an existing book's flow, it must never be clickable — going
// "back" to it wouldn't edit the current book's idea, it would abandon it
// and start over, which is exactly the bad behavior this guards against.
function routeForStep(key: string, bookId?: string) {
  if (key === "create") return bookId ? null : "/create";
  if (!bookId) return null;
  return `/create/${bookId}/${key}`;
}

interface Props {
  activeKey: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideFooter?: boolean;
  wide?: boolean;
  /** Enables direct navigation on the step rail — clicking any already-
   * reached step (index <= current) jumps straight there instead of
   * requiring repeated Back clicks. Steps ahead of current progress stay
   * non-interactive, since jumping into a step with no data yet would show
   * a broken/empty page rather than actually skip you ahead. */
  bookId?: string;
}

export default function StepShell({
  activeKey,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  hideFooter,
  wide,
  bookId,
}: Props) {
  const router = useRouter();
  const activeIndex = STEPS.findIndex((s) => s.key === activeKey);

  return (
    <div className="hero-bridge-bg">
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-8 sm:py-10">
        {/* progress rail */}
        <div className="flex items-center justify-center gap-1.5 mb-8 overflow-x-auto thin-scroll pb-1">
          {STEPS.map((s, i) => {
            const pillClass = `flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${
              i === activeIndex
                ? "bg-teal text-white"
                : i < activeIndex
                ? "bg-teal-tint text-teal-text hover:bg-teal-tint/70 transition-colors"
                : "bg-white/70 text-ink-soft border border-line"
            }`;
            const pillContent = (
              <>
                <span>{i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </>
            );
            const route = i <= activeIndex ? routeForStep(s.key, bookId) : null;

            return (
              <div key={s.key} className="flex items-center gap-1.5 shrink-0">
                {route && i !== activeIndex ? (
                  <Link href={route} className={pillClass}>
                    {pillContent}
                  </Link>
                ) : (
                  <div className={pillClass}>{pillContent}</div>
                )}
                {i < STEPS.length - 1 && <span className="w-3 h-px bg-line shrink-0" />}
              </div>
            );
          })}
        </div>

        <div className={wide ? "" : "max-w-2xl"}>
          {title && (
            <div className="mb-7">
              {onBack && (
                <button
                  onClick={() => router.push(onBack)}
                  className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink mb-3"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              )}
              <h1 className="font-display text-2xl sm:text-3xl font-semibold">{title}</h1>
              {subtitle && <p className="text-ink-soft mt-2 text-sm sm:text-base">{subtitle}</p>}
            </div>
          )}
          {!title && onBack && (
            <button
              onClick={() => router.push(onBack)}
              className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink mb-5"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}

          {children}

          {!hideFooter && (
            <div className="flex justify-end mt-8">
              <Button size="lg" onClick={onNext} disabled={nextDisabled}>
                {nextLabel}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}