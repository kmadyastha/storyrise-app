"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Palette, Check, AlertCircle, RefreshCw, Sparkle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStoryPages, generatePageImage, updateBookStatus, type StoryPage } from "@/lib/supabase/queries";

const ORBIT_SPARKLES = [
  { top: "4%", left: "76%", size: 15, delay: 0 },
  { top: "70%", left: "82%", size: 11, delay: 0.6 },
  { top: "78%", left: "10%", size: 13, delay: 1.1 },
  { top: "8%", left: "8%", size: 10, delay: 1.7 },
];

export default function GeneratingStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();

  const [pages, setPages] = useState<StoryPage[]>([]);
  const [illustratedCount, setIllustratedCount] = useState(0);
  const [totalToIllustrate, setTotalToIllustrate] = useState(0);
  const [failedPages, setFailedPages] = useState<{ id: string; pageNumber: number; error: string }[]>([]);
  const [phase, setPhase] = useState<"loading" | "illustrating" | "done" | "error">("loading");
  const started = useRef(false);

  const runIllustration = async (pagesToRun: StoryPage[]) => {
    setPhase("illustrating");
    setFailedPages([]);
    setIllustratedCount(0);
    // Captured once, fixed for the whole run — this must NOT be recomputed
    // from live pages state later, since that state updates (via setPages
    // below) as each page completes, which would make the denominator
    // shrink in lockstep with progress instead of staying the real total.
    setTotalToIllustrate(pagesToRun.length);
    updateBookStatus(bookId, "generating").catch(() => {});
    let completed = 0;
    const failures: { id: string; pageNumber: number; error: string }[] = [];

    for (const page of pagesToRun) {
      try {
        const { imageUrl } = await generatePageImage(page.id);
        setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, image_url: imageUrl } : p)));
      } catch (err) {
        failures.push({ id: page.id, pageNumber: page.page_number, error: err instanceof Error ? err.message : "Failed" });
        setFailedPages((f) => [...f, failures[failures.length - 1]]);
      }
      completed += 1;
      setIllustratedCount(completed);
    }

    const supabase = createClient();
    await supabase.from("books").update({ status: "complete", generated_at: new Date().toISOString() }).eq("id", bookId);

    setPhase("done");
    // Only auto-advance when everything genuinely succeeded — with failures,
    // redirecting immediately meant the failure summary and retry button
    // (rendered on this same page) flashed by in under a second before
    // anyone could see or use them.
    if (failures.length === 0) {
      setTimeout(() => router.push(`/create/${bookId}/preview`), 700);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const supabase = createClient();
        const { data } = await getStoryPages(supabase, bookId);
        const allPages = data ?? [];

        if (allPages.length === 0) {
          // No pages exist at all — the book either doesn't exist or Story
          // generation never ran for it. Distinct from "all pages already
          // illustrated", which should proceed straight to Preview.
          setPhase("error");
          return;
        }

        setPages(allPages);

        const missingImages = allPages.filter((p) => !p.image_url);
        if (missingImages.length === 0) {
          setPhase("done");
          router.push(`/create/${bookId}/preview`);
          return;
        }
        await runIllustration(missingImages);
      } catch {
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const retryFailed = () => {
    const retryPages = pages.filter((p) => failedPages.some((f) => f.id === p.id));
    runIllustration(retryPages);
  };

  // totalToIllustrate is now a fixed state value set once in runIllustration —
  // see the comment there for why it can't be derived from live pages state.

  return (
    <section className="mx-auto max-w-2xl px-5 py-16 text-center">
      <div className="max-w-md mx-auto">
      <div className="relative w-24 h-24 mx-auto mb-6">
        <motion.div
          animate={
            phase === "illustrating" || phase === "loading"
              ? { scale: [1, 1.08, 1] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-teal-tint"
        />
        <motion.div
          animate={
            phase === "illustrating" || phase === "loading"
              ? { rotate: [0, -6, 6, 0], y: [0, -4, 0] }
              : {}
          }
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 grid place-items-center text-teal-text"
        >
          <Palette size={34} strokeWidth={1.8} />
        </motion.div>
        {(phase === "illustrating" || phase === "loading") &&
          ORBIT_SPARKLES.map((s, i) => (
            <motion.span
              key={i}
              className="absolute text-teal"
              style={{ top: s.top, left: s.left }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
              transition={{ duration: 1.7, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
            >
              <Sparkle size={s.size} fill="currentColor" />
            </motion.span>
          ))}
        {phase === "done" && (
          <div className="absolute inset-0 grid place-items-center text-green">
            <Check size={34} strokeWidth={2.2} />
          </div>
        )}
      </div>
      <h1 className="font-display text-2xl font-semibold mb-2">Generating your storybook</h1>
      <p className="text-sm text-ink-soft mb-8">
        {phase === "error"
          ? "Something went wrong loading your book."
          : "This runs in the background — feel free to keep this tab open, it\u2019ll be ready shortly."}
      </p>

      <div className="space-y-3 text-left">
        <div className="flex items-center gap-3 rounded-xl border border-green/30 bg-green-tint p-3.5">
          <span className="w-7 h-7 rounded-full bg-green text-white grid place-items-center shrink-0">
            <Check size={14} />
          </span>
          <span className="text-sm">Story text written</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-green/30 bg-green-tint p-3.5">
          <span className="w-7 h-7 rounded-full bg-green text-white grid place-items-center shrink-0">
            <Check size={14} />
          </span>
          <span className="text-sm">Character references ready</span>
        </div>
        <div
          className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
            phase === "done" ? "border-green/30 bg-green-tint" : "border-teal bg-teal-tint"
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
              phase === "done" ? "bg-green text-white" : "bg-teal text-white"
            }`}
          >
            {phase === "done" ? <Check size={14} /> : <Palette size={14} />}
          </span>
          <span className="text-sm flex items-center gap-2">
            {phase === "loading" && "Preparing pages…"}
            {phase === "illustrating" && (
              <>
                {`Rendering illustrations — page ${illustratedCount} of ${totalToIllustrate}`}
                <span className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-teal"
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    />
                  ))}
                </span>
              </>
            )}
            {phase === "done" && "Illustrations complete"}
            {phase === "error" && "Rendering each page's illustration"}
          </span>
        </div>
      </div>

      {failedPages.length > 0 && (
        <div className="mt-6 text-left bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-start gap-2 text-sm text-red-700 mb-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              {failedPages.length} page{failedPages.length > 1 ? "s" : ""} couldn&rsquo;t be illustrated: pages{" "}
              {failedPages.map((f) => f.pageNumber).join(", ")}. You can still preview the rest and retry these
              individually.
            </span>
          </div>
          <button
            onClick={retryFailed}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-text hover:text-teal"
          >
            <RefreshCw size={12} /> Retry failed pages
          </button>
          <button
            onClick={() => router.push(`/create/${bookId}/preview`)}
            className="ml-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
          >
            Continue to Preview anyway
          </button>
        </div>
      )}

      </div>

      {phase === "error" && (
        <div className="mt-6 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4 text-left">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>We couldn&rsquo;t load this book. Try going back and generating your story again.</span>
        </div>
      )}

      {pages.length > 0 && phase !== "error" && (
        <div className="mt-10 text-left">
          <p className="text-xs font-medium text-ink-soft mb-3">{pages.length} PAGES</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {pages.map((p) => {
              const failed = failedPages.some((f) => f.id === p.id);
              return (
                <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-line bg-paper">
                  {p.image_url ? (
                    <img src={p.image_url} alt={`Page ${p.page_number}`} className="w-full h-full object-cover" />
                  ) : failed ? (
                    <div className="w-full h-full grid place-items-center bg-red-50">
                      <AlertCircle size={16} className="text-red-500" />
                    </div>
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <RefreshCw size={14} className="text-ink-soft/50 animate-spin" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 bg-black/50 text-white text-[9px] rounded px-1">
                    {p.page_number}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}