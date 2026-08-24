import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, fetchImage, sanitizeFilename, WATERMARK_TEXT } from "@/lib/export/exportData";
import { wrapText } from "@/lib/export/wrapText";
import { bookSizes } from "@/lib/dummy-data";

// pdf-lib and Buffer both need the Node runtime, not the Edge runtime.
export const runtime = "nodejs";

const PT_PER_IN = 72;

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
  const pageWidth = size.widthIn * PT_PER_IN;
  const pageHeight = size.heightIn * PT_PER_IN;
  const margin = 0.5 * PT_PER_IN;

  const pdf = await PDFDocument.create();
  pdf.setTitle(book.title || "Untitled StoryRise book");
  pdf.setProducer("StoryRise");

  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  async function embedImage(url: string | null | undefined) {
    const fetched = await fetchImage(url);
    if (!fetched) return null;
    try {
      if (fetched.contentType.includes("png")) return await pdf.embedPng(fetched.bytes);
      return await pdf.embedJpg(fetched.bytes);
    } catch {
      // Some Nano Banana responses come back as webp/other — pdf-lib only
      // embeds PNG/JPEG. Skip the image rather than fail the whole export.
      return null;
    }
  }

  function drawWatermark(page: import("pdf-lib").PDFPage) {
    if (!book.is_free_trial) return;
    page.drawText(WATERMARK_TEXT, {
      x: pageWidth / 2 - 160,
      y: pageHeight / 2,
      size: 22,
      font: titleFont,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.35,
      rotate: degrees(35),
    });
  }

  function drawImageCover(page: import("pdf-lib").PDFPage, img: Awaited<ReturnType<typeof embedImage>>, x: number, y: number, w: number, h: number) {
    if (!img) {
      page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.91, 0.98, 0.98) });
      return;
    }
    // Cover-fit (crop to fill) rather than stretch, so illustrations don't distort.
    const scale = Math.max(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    page.drawImage(img, {
      x: x - (drawW - w) / 2,
      y: y - (drawH - h) / 2,
      width: drawW,
      height: drawH,
    });
  }

  function drawWrappedText(
    page: import("pdf-lib").PDFPage,
    text: string,
    opts: { x: number; y: number; width: number; size: number; lineHeight: number; align?: "left" | "center" }
  ) {
    const lines = wrapText(text, opts.width, (s) => bodyFont.widthOfTextAtSize(s, opts.size));
    let cursorY = opts.y;
    for (const line of lines) {
      const lineWidth = bodyFont.widthOfTextAtSize(line, opts.size);
      const x = opts.align === "center" ? opts.x + (opts.width - lineWidth) / 2 : opts.x;
      page.drawText(line, { x, y: cursorY, size: opts.size, font: bodyFont, color: rgb(0.15, 0.15, 0.15) });
      cursorY -= opts.lineHeight;
    }
    return cursorY;
  }

  // --- Cover page ---
  {
    const page = pdf.addPage([pageWidth, pageHeight]);
    const img = await embedImage(cover?.image_url ?? pages[0]?.image_url ?? null);
    drawImageCover(page, img, 0, 0, pageWidth, pageHeight);

    const title = cover?.title || book.title || "Untitled story";
    const bandHeight = 90;
    page.drawRectangle({ x: 0, y: pageHeight / 2 - bandHeight / 2, width: pageWidth, height: bandHeight, color: rgb(1, 1, 1), opacity: 0.92 });
    drawWrappedText(page, title, {
      x: margin,
      y: pageHeight / 2 + 10,
      width: pageWidth - margin * 2,
      size: 26,
      lineHeight: 30,
      align: "center",
    });
    if (cover?.author) {
      page.drawText(`by ${cover.author}`, {
        x: pageWidth / 2 - bodyFont.widthOfTextAtSize(`by ${cover.author}`, 13) / 2,
        y: pageHeight / 2 - bandHeight / 2 + 16,
        size: 13,
        font: bodyFont,
        color: rgb(0.35, 0.35, 0.35),
      });
    }
    drawWatermark(page);
  }

  // --- Story pages ---
  // Immersive: one page per story page, image + text blended together
  // (image on the side set by `layout`, text alongside it).
  // Classic: two pages per story page — a full-bleed image page followed by
  // a plain text page — which is what "alternating image/text" in the PRD
  // actually looks like on the printed page, even though today every page
  // still costs an illustration credit the same as Immersive (see
  // docs/IMPLEMENTATION_STATUS.md — the credit-cost split isn't built yet).
  for (const storyPage of pages) {
    const img = await embedImage(storyPage.image_url);

    if (book.format === "immersive") {
      const page = pdf.addPage([pageWidth, pageHeight]);
      const imageOnRight = book.layout !== "image-left"; // default matches create-flow default
      const half = pageWidth / 2;
      const imgX = imageOnRight ? half : 0;
      const textX = imageOnRight ? 0 : half;

      drawImageCover(page, img, imgX, 0, half, pageHeight);
      drawWrappedText(page, storyPage.narration, {
        x: textX + margin * 0.6,
        y: pageHeight - margin,
        width: half - margin * 1.2,
        size: 15,
        lineHeight: 21,
      });
      page.drawText(String(storyPage.page_number), {
        x: pageWidth / 2 - 6,
        y: 16,
        size: 9,
        font: bodyFont,
        color: rgb(0.6, 0.6, 0.6),
      });
      drawWatermark(page);
    } else {
      // image page
      const imgPage = pdf.addPage([pageWidth, pageHeight]);
      drawImageCover(imgPage, img, 0, 0, pageWidth, pageHeight);
      drawWatermark(imgPage);

      // text page
      const textPage = pdf.addPage([pageWidth, pageHeight]);
      textPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(0.996, 0.98, 0.965) });
      drawWrappedText(textPage, storyPage.narration, {
        x: margin,
        y: pageHeight / 2 + 20,
        width: pageWidth - margin * 2,
        size: 18,
        lineHeight: 26,
        align: "center",
      });
      textPage.drawText(String(storyPage.page_number), {
        x: pageWidth / 2 - 6,
        y: 16,
        size: 9,
        font: bodyFont,
        color: rgb(0.6, 0.6, 0.6),
      });
      drawWatermark(textPage);
    }
  }

  const bytes = await pdf.save();
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