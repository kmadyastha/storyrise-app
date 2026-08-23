"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Palette, Check, AlertCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStoryPages, generatePageImage, type StoryPage } from "@/lib/supabase/queries";

export default function GeneratingStep({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();

  const [pages, setPages] = useState<StoryPage[]>([]);
  const [illustratedCount, setIllustratedCount] = useState(0);
  const [failedPages, setFailedPages] = useState<{ id: string; pageNumber: number; error: string }[]>([]);
  const [phase, setPhase] = useState<"loading" | "illustrating" | "done" | "error">("loading");
  const started = useRef(false);

  const runIllustration = async (pagesToRun: StoryPage[]) => {
    setPhase("illustrating");
    setFailedPages([]);
    let completed = 0;

    for (const page of pagesToRun) {
      try {
        await generatePageImage(page.id);
      } catch (err) {
        setFailedPages((f) => [
          ...f,
          { id: page.id, pageNumber: page.page_number, error: err instanceof Error ? err.message : "Failed" },
        ]);
      }
      completed += 1;
      setIllustratedCount(completed);
    }

    const supabase = createClient();
    await supabase.from("books").update({ status: "complete", generated_at: new Date().toISOString() }).eq("id", bookId);

    setPhase("done");
    setTimeout(() => router.push(`/create/${bookId}/preview`), 700);
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

  const totalToIllustrate = pages.filter((p) => !p.image_url).length || pages.length;

  return (
    <section className="mx-auto max-w-md px-5 py-24 text-center">
      <motion.div
        className="w-16 h-16 rounded-full bg-teal-tint grid place-items-center mx-auto mb-6"
        animate={phase === "illustrating" || phase === "loading" ? { rotate: 360 } : {}}
        transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
      >
        <BookOpen size={26} className="text-teal-text" />
      </motion.div>
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
          <span className="text-sm">
            {phase === "loading" && "Preparing pages…"}
            {phase === "illustrating" && `Rendering illustrations — page ${illustratedCount} of ${totalToIllustrate}`}
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
        </div>
      )}

      {phase === "error" && (
        <div className="mt-6 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4 text-left">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>We couldn&rsquo;t load this book. Try going back and generating your story again.</span>
        </div>
      )}
    </section>
  );
}