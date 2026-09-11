import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData } from "@/lib/export/exportData";
import { kickoffRenderJob } from "@/lib/videoWorker";
import { precheckCredits } from "@/lib/credits";

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

  const rate = await checkRateLimit(user.id, "export-audiobook");
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
  if (book.is_free_trial) {
    return NextResponse.json({ error: "Audiobook export isn't available on the free trial — upgrade to unlock it." }, { status: 403 });
  }

  const missingNarration = pages.filter((p) => !p.audio_url);
  if (missingNarration.length > 0) {
    return NextResponse.json(
      {
        error: `${missingNarration.length} page${
          missingNarration.length === 1 ? "" : "s"
        } still need${missingNarration.length === 1 ? "s" : ""} narration before you can export an audiobook — generate narration for every page on the Preview screen first.`,
      },
      { status: 400 }
    );
  }

  const precheck = await precheckCredits(user.id, "audiobook_export", book.is_free_trial);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
  }

  const kickoff = await kickoffRenderJob(
    bookId,
    "audiobook",
    pages.map((p) => ({ pageNumber: p.page_number, audioUrl: p.audio_url }))
  );

  if (!kickoff.ok || !kickoff.jobId) {
    return NextResponse.json({ error: kickoff.error || "Couldn't start rendering" }, { status: 502 });
  }

  return NextResponse.json({ jobId: kickoff.jobId });
}
