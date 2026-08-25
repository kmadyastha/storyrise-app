import { PDFDocument, StandardFonts, rgb, degrees, PDFPage, PDFFont } from "pdf-lib";
import type { Book, StoryPage, Cover } from "@/lib/supabase/queries";
import { fetchImage, WATERMARK_TEXT } from "@/lib/export/exportData";
import { wrapText } from "@/lib/export/wrapText";

const PT_PER_IN = 72;

export interface BuildInteriorPdfOptions {
  book: Book;
  pages: StoryPage[];
  cover: Cover | null;
  trimWidthIn: number;
  trimHeightIn: number;
  /** Extra bleed added to every page edge. 0 for a plain/digital PDF
   * (pdf, etsy) — only KDP's real print interior needs this. */
  bleedIn?: number;
  /** Whether to draw a diagonal free-trial watermark on every page. */
  watermark?: boolean;
  /** Whether to include an inline cover page as page 1. KDP omits this
   * since its cover is a separate wrap-cover file, not part of the interior. */
  includeCoverPage?: boolean;
}

/** Builds the interior pages (optionally with an inline cover page) shared
 * by the plain PDF export, the Etsy digital PDF, and KDP's print interior.
 * Returns raw PDF bytes — callers decide filename/response headers. */
export async function buildInteriorPdf(opts: BuildInteriorPdfOptions): Promise<Uint8Array> {
  const { book, pages, cover, trimWidthIn, trimHeightIn } = opts;
  const bleedIn = opts.bleedIn ?? 0;
  const watermarkEnabled = opts.watermark ?? book.is_free_trial;
  const includeCoverPage = opts.includeCoverPage ?? true;

  const pageWidth = (trimWidthIn + bleedIn * 2) * PT_PER_IN;
  const pageHeight = (trimHeightIn + bleedIn * 2) * PT_PER_IN;
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

  function drawWatermark(page: PDFPage) {
    if (!watermarkEnabled) return;
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

  function drawImageCover(page: PDFPage, img: Awaited<ReturnType<typeof embedImage>>, x: number, y: number, w: number, h: number) {
    if (!img) {
      page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.91, 0.98, 0.98) });
      return;
    }
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
    page: PDFPage,
    text: string,
    opts2: { x: number; y: number; width: number; size: number; lineHeight: number; align?: "left" | "center"; font?: PDFFont }
  ) {
    const font = opts2.font ?? bodyFont;
    const lines = wrapText(text, opts2.width, (s) => font.widthOfTextAtSize(s, opts2.size));
    let cursorY = opts2.y;
    for (const line of lines) {
      const lineWidth = font.widthOfTextAtSize(line, opts2.size);
      const x = opts2.align === "center" ? opts2.x + (opts2.width - lineWidth) / 2 : opts2.x;
      page.drawText(line, { x, y: cursorY, size: opts2.size, font, color: rgb(0.15, 0.15, 0.15) });
      cursorY -= opts2.lineHeight;
    }
    return cursorY;
  }

  if (includeCoverPage) {
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
      font: titleFont,
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

  // Immersive: one page per story page, image + text blended together.
  // Classic: two pages per story page — full-bleed image page, then text page.
  for (const storyPage of pages) {
    const img = await embedImage(storyPage.image_url);

    if (book.format === "immersive") {
      const page = pdf.addPage([pageWidth, pageHeight]);
      const imageOnRight = book.layout !== "image-left";
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
      const imgPage = pdf.addPage([pageWidth, pageHeight]);
      drawImageCover(imgPage, img, 0, 0, pageWidth, pageHeight);
      drawWatermark(imgPage);

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

  return pdf.save();
}