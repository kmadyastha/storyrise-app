import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData } from "@/lib/export/exportData";
import { kickoffRenderJob } from "@/lib/videoWorker";
import { precheckCredits, computeVideoCreditCost } from "@/lib/credits";

// Just the kickoff — fast, no long polling inside this function anymore.
// See /api/export/render-status and /api/export/render-result for the
// browser-polling flow that replaced the old single-long-request pattern.
export const maxDuration = 60;

export async function POST(request: Request) {
  const { bookId } = await request.json().catch(() => ({}));

  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id, "export-video-narrated");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  const exportData = await fetchExportData(supabase, bookId);
  if (!exportData) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  const { book, pages } = exportData;

  if (pages.length === 0) {
    return NextResponse.json({ error: "This book doesn't have any pages generated yet" }, { status: 400 });
  }
  if (book.format !== "immersive") {
    return NextResponse.json({ error: "Narrated video is only available for Immersive-format books" }, { status: 400 });
  }
  if (book.is_free_trial) {
    return NextResponse.json({ error: "Video export isn't available on the free trial — upgrade to unlock it." }, { status: 403 });
  }

  const missingNarration = pages.filter((p) => !p.audio_url);
  if (missingNarration.length > 0) {
    return NextResponse.json(
      {
        error: `${missingNarration.length} page${
          missingNarration.length === 1 ? "" : "s"
        } still need${missingNarration.length === 1 ? "s" : ""} narration before you can export a narrated video — generate narration for every page on the Preview screen first.`,
      },
      { status: 400 }
    );
  }

  const cost = computeVideoCreditCost(pages.length);
  const precheck = await precheckCredits(user.id, "video", book.is_free_trial, cost);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
  }

  const kickoff = await kickoffRenderJob(
    bookId,
    "video_narrated",
    pages.map((p) => ({ pageNumber: p.page_number, imageUrl: p.image_url, audioUrl: p.audio_url, narration: p.narration }))
  );

  if (!kickoff.ok || !kickoff.jobId) {
    return NextResponse.json({ error: kickoff.error || "Couldn't start rendering" }, { status: 502 });
  }

  return NextResponse.json({ jobId: kickoff.jobId });
}
