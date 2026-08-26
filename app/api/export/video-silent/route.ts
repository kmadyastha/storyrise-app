import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, sanitizeFilename } from "@/lib/export/exportData";
import { renderViaWorker } from "@/lib/videoWorker";

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

  const rate = await checkRateLimit(user.id, "export-video-silent");
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
    return NextResponse.json({ error: "Silent video is only available for Immersive-format books" }, { status: 400 });
  }
  if (book.is_free_trial) {
    return NextResponse.json({ error: "Video export isn't available on the free trial — upgrade to unlock it." }, { status: 403 });
  }

  const result = await renderViaWorker(
    bookId,
    "video_silent",
    pages.map((p) => ({ pageNumber: p.page_number, imageUrl: p.image_url }))
  );

  if (!result.ok || !result.bytes) {
    return NextResponse.json({ error: result.error || "Video rendering failed" }, { status: 502 });
  }

  const filename = `${sanitizeFilename(book.title)}-silent.mp4`;

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType || "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(result.bytes.length),
    },
  });
}