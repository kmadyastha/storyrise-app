import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, sanitizeFilename } from "@/lib/export/exportData";
import { buildInteriorPdf } from "@/lib/export/buildInteriorPdf";
import { bookSizes } from "@/lib/dummy-data";

// pdf-lib and Buffer both need the Node runtime, not the Edge runtime.
export const runtime = "nodejs";
// See app/api/generate-story/route.ts for why this is needed — building a
// full multi-page PDF (fetching every page's image) can exceed 10s.
export const maxDuration = 60;

export async function POST(request: Request) {
  const { bookId, bookSizeId } = await request.json().catch(() => ({}));

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

  const rate = await checkRateLimit(user.id, "export-pdf");
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

  const size = bookSizes.find((s) => s.id === bookSizeId) ?? bookSizes.find((s) => "default" in s && s.default) ?? bookSizes[0];

  const bytes = await buildInteriorPdf({
    book,
    pages,
    cover,
    trimWidthIn: size.widthIn,
    trimHeightIn: size.heightIn,
  });

  const filename = `${sanitizeFilename(book.title)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.length),
    },
  });
}