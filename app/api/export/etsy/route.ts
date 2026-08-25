import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, sanitizeFilename } from "@/lib/export/exportData";
import { buildInteriorPdf } from "@/lib/export/buildInteriorPdf";
import { bookSizes } from "@/lib/dummy-data";

export const runtime = "nodejs";

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

  const rate = await checkRateLimit(user.id, "export-etsy");
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

  // Etsy digital PDF is a paid-tier feature, same as KDP — not part of the
  // free trial's watermarked PDF/PPTX-only export scope. The UI already
  // hides this behind the upgrade modal for free-trial users; this is the
  // server-side backstop in case that ever gets bypassed.
  if (book.is_free_trial) {
    return NextResponse.json({ error: "Etsy digital export isn't available on the free trial — upgrade to unlock it." }, { status: 403 });
  }

  const size = bookSizes.find((s) => s.id === bookSizeId) ?? bookSizes.find((s) => "default" in s && s.default) ?? bookSizes[0];

  // Same interior build as KDP's print file (same margins/typography), just
  // without KDP's print-specific bleed padding — this is a digital-only file.
  const bytes = await buildInteriorPdf({
    book,
    pages,
    cover,
    trimWidthIn: size.widthIn,
    trimHeightIn: size.heightIn,
    bleedIn: 0,
    watermark: false,
  });

  const filename = `${sanitizeFilename(book.title)}-etsy.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.length),
    },
  });
}