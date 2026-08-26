import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, sanitizeFilename } from "@/lib/export/exportData";
import { buildFlipbookHtml } from "@/lib/export/buildFlipbookHtml";

export const runtime = "nodejs";
// Embedding every page's image as base64 (potentially 20-50 fetches) is the
// slow part here, not encoding — same order of magnitude as the KDP route.
export const maxDuration = 100;

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

  const rate = await checkRateLimit(user.id, "export-flipbook");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  const exportData = await fetchExportData(supabase, bookId);
  if (!exportData) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  const { book, pages, cover } = exportData;

  if (pages.length === 0) {
    return NextResponse.json({ error: "This book doesn't have any pages generated yet" }, { status: 400 });
  }

  const html = await buildFlipbookHtml({ book, pages, cover });
  const filename = `${sanitizeFilename(book.title)}-flipbook.html`;
  const bytes = Buffer.from(html, "utf-8");

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.length),
    },
  });
}