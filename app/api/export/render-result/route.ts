import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchRenderJobResult, type RenderJobType } from "@/lib/videoWorker";
import { fetchExportData, sanitizeFilename } from "@/lib/export/exportData";
import { chargeCredits, computeVideoCreditCost } from "@/lib/credits";

// The actual file transfer — can take a little longer than the status
// check, but still just a single fetch-and-relay, not a polling loop.
export const maxDuration = 90;

const VALID_TYPES: RenderJobType[] = ["video_narrated", "video_silent", "audiobook"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const jobType = searchParams.get("jobType") as RenderJobType | null;
  const bookId = searchParams.get("bookId");

  if (!jobId || !jobType || !bookId) {
    return NextResponse.json({ error: "Missing jobId, jobType, or bookId" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(jobType)) {
    return NextResponse.json({ error: "Invalid jobType" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const exportData = await fetchExportData(supabase, bookId);
  if (!exportData) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  const { book, pages } = exportData;

  const result = await fetchRenderJobResult(jobId, jobType);
  if (!result.ok || !result.bytes) {
    return NextResponse.json({ error: result.error || "Rendering failed" }, { status: 502 });
  }

  // Only charged now that we know the render genuinely succeeded — same
  // "no result, no charge" principle used everywhere else in this app.
  if (jobType === "audiobook") {
    await chargeCredits(user.id, bookId, "audiobook_export", book.is_free_trial);
  } else {
    const cost = computeVideoCreditCost(pages.length);
    await chargeCredits(user.id, bookId, "video", book.is_free_trial, cost);
  }

  const suffix = jobType === "video_narrated" ? "narrated" : jobType === "video_silent" ? "silent" : "audiobook";
  const ext = jobType === "audiobook" ? "mp3" : "mp4";
  const filename = `${sanitizeFilename(book.title)}-${suffix}.${ext}`;

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType || (jobType === "audiobook" ? "audio/mpeg" : "video/mp4"),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(result.bytes.length),
    },
  });
}
