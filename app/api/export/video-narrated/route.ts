import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, sanitizeFilename } from "@/lib/export/exportData";
import { renderViaWorker } from "@/lib/videoWorker";

// Cold-starting the Fly.io machine plus real multi-page video encoding can
// genuinely take a couple of minutes — this needs real headroom, matched to
// renderViaWorker's own 280s timeout in lib/videoWorker.ts.
export const maxDuration = 290;

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
  // Free trial can't reach this via the UI, but enforce it server-side too.
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

  const result = await renderViaWorker(
    bookId,
    "video_narrated",
    pages.map((p) => ({ pageNumber: p.page_number, imageUrl: p.image_url, audioUrl: p.audio_url, narration: p.narration }))
  );

  if (!result.ok || !result.bytes) {
    return NextResponse.json({ error: result.error || "Video rendering failed" }, { status: 502 });
  }

  const filename = `${sanitizeFilename(book.title)}-narrated.mp4`;

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType || "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(result.bytes.length),
    },
  });
}