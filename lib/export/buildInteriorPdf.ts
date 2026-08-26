import { PDFDocument, StandardFonts, rgb, degrees, PDFPage, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import type { Book, StoryPage, Cover } from "@/lib/supabase/queries";
import { fetchImage, WATERMARK_TEXT } from "@/lib/export/exportData";
import { normalizeImageForEmbed } from "@/lib/export/normalizeImageForEmbed";
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
  pdf.registerFontkit(fontkit);
  pdf.setTitle(book.title || "Untitled StoryRise book");
  pdf.setProducer("StoryRise");

  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  // The app's actual display font, not a generic PDF standard font — this
  // is what was rendering as plain Helvetica before, which looked nothing
  // like the branded in-app/marketing typography. Fredoka ships only as a
  // variable font (no separate static Bold file), and pdf-lib always
  // re-parses embedded fonts from raw bytes rather than accepting an
  // already-instanced variation — so this embeds at the font's default
  // weight (~Light) rather than true Bold. Sized larger to compensate;
  // still unmistakably the real brand font, not a substitute.
  const fredokaPath = path.join(process.cwd(), "assets/fonts/Fredoka-Variable.ttf");
  const titleFont = fs.existsSync(fredokaPath) ? await pdf.embedFont(fs.readFileSync(fredokaPath)) : await pdf.embedFont(StandardFonts.HelveticaBold);

  async function embedImage(url: string | null | undefined) {
    const fetched = await fetchImage(url);
    if (!fetched) return null;
    try {
      const normalized = await normalizeImageForEmbed(fetched.bytes);
      return normalized.format === "png" ? await pdf.embedPng(normalized.bytes) : await pdf.embedJpg(normalized.bytes);
    } catch {
      // Genuinely corrupt/unreadable image data (rare) — skip it rather
      // than fail the whole export.
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
    opts2: {
      x: number;
      y: number;
      width: number;
      size: number;
      lineHeight: number;
      align?: "left" | "center";
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
    }
  ) {
    const font = opts2.font ?? bodyFont;
    const lines = wrapText(text, opts2.width, (s) => font.widthOfTextAtSize(s, opts2.size));
    let cursorY = opts2.y;
    for (const line of lines) {
      const lineWidth = font.widthOfTextAtSize(line, opts2.size);
      const x = opts2.align === "center" ? opts2.x + (opts2.width - lineWidth) / 2 : opts2.x;
      page.drawText(line, { x, y: cursorY, size: opts2.size, font, color: opts2.color ?? rgb(0.15, 0.15, 0.15) });
      cursorY -= opts2.lineHeight;
    }
    return cursorY;
  }

  if (includeCoverPage) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    const img = await embedImage(cover?.image_url ?? pages[0]?.image_url ?? null);
    drawImageCover(page, img, 0, 0, pageWidth, pageHeight);

    const title = cover?.title || book.title || "Untitled story";
    const titleSize = 32;
    const authorLine = cover?.author ? `by ${cover.author}` : null;
    const cardPadX = 28;
    const cardPadTop = 26;
    const cardPadBottom = authorLine ? 40 : 22;

    // Wrap first so the card can be sized to what the text actually needs,
    // instead of a fixed-height band stretched across the full page
    // width regardless of how short the title is.
    const maxTextWidth = pageWidth - margin * 2 - cardPadX * 2;
    const titleLines = wrapText(title, maxTextWidth, (s) => titleFont.widthOfTextAtSize(s, titleSize));
    const lineHeight = titleSize * 1.15;
    const textBlockWidth = Math.max(...titleLines.map((l) => titleFont.widthOfTextAtSize(l, titleSize)));
    const cardWidth = Math.min(pageWidth - margin * 2, textBlockWidth + cardPadX * 2);
    const cardHeight = titleLines.length * lineHeight + cardPadTop + cardPadBottom;
    const cardX = (pageWidth - cardWidth) / 2;

    // Respects the placement chosen in the Cover drawer instead of always
    // hard-centering regardless of what was actually picked and saved.
    const placement = cover?.title_placement ?? "center";
    const cardY = placement === "top" ? pageHeight - margin - cardHeight : placement === "bottom" ? margin : pageHeight / 2 - cardHeight / 2;

    page.drawRectangle({ x: cardX, y: cardY, width: cardWidth, height: cardHeight, color: rgb(1, 1, 1), opacity: 0.95 });

    let cursorY = cardY + cardHeight - cardPadTop - titleSize * 0.85;
    for (const line of titleLines) {
      const lineWidth = titleFont.widthOfTextAtSize(line, titleSize);
      page.drawText(line, {
        x: cardX + (cardWidth - lineWidth) / 2,
        y: cursorY,
        size: titleSize,
        font: titleFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= lineHeight;
    }
    if (authorLine) {
      const authorWidth = bodyFont.widthOfTextAtSize(authorLine, 13);
      page.drawText(authorLine, {
        x: cardX + (cardWidth - authorWidth) / 2,
        y: cardY + 16,
        size: 13,
        font: bodyFont,
        color: rgb(0.35, 0.35, 0.35),
      });
    }
    drawWatermark(page);
  }

  // One PDF page per story page, always — matches exactly what's shown in
  // the in-app Preview. Immersive splits image/text side by side; Classic
  // shows the full illustration with the narration as a caption strip along
  // the bottom, same as the Preview page's single-image-plus-caption card.
  // (Earlier version produced two separate PDF pages per story page for
  // Classic — image-only then text-only — which doubled the page count and
  // didn't match what the customer had actually previewed and approved.)
  for (const storyPage of pages) {
    const img = await embedImage(storyPage.image_url);
    const page = pdf.addPage([pageWidth, pageHeight]);

    if (book.format === "immersive") {
      // Full-bleed image, exactly like Classic — the difference is a
      // translucent dark box holding the narration directly over the art,
      // not a hard split hiding half the illustration. Matches the in-app
      // Preview page's Immersive treatment 1:1, per the explicit "webapp
      // and PDF should look the same" requirement.
      drawImageCover(page, img, 0, 0, pageWidth, pageHeight);

      const overlayX = margin * 0.6;
      const overlayWidth = pageWidth - margin * 1.2;
      const lines = wrapText(storyPage.narration, overlayWidth - 24, (s) => bodyFont.widthOfTextAtSize(s, 14));
      const overlayHeight = lines.length * 19 + 24;
      const overlayY = pageHeight - margin * 0.6 - overlayHeight;

      page.drawRectangle({
        x: overlayX,
        y: overlayY,
        width: overlayWidth,
        height: overlayHeight,
        color: rgb(0, 0, 0),
        opacity: 0.9,
      });
      drawWrappedText(page, storyPage.narration, {
        x: overlayX + 12,
        y: overlayY + overlayHeight - 20,
        width: overlayWidth - 24,
        size: 14,
        lineHeight: 19,
        color: rgb(1, 1, 1),
      });
    } else {
      drawImageCover(page, img, 0, 0, pageWidth, pageHeight);

      // Caption strip along the bottom, matching the Preview page's white
      // card sitting over the illustration.
      const lines = wrapText(storyPage.narration, pageWidth - margin * 2, (s) => bodyFont.widthOfTextAtSize(s, 13));
      const stripHeight = Math.max(60, lines.length * 17 + 26);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: stripHeight,
        color: rgb(1, 1, 1),
        opacity: 0.94,
      });
      let cursorY = stripHeight - 22;
      for (const line of lines) {
        page.drawText(line, { x: margin, y: cursorY, size: 13, font: bodyFont, color: rgb(0.15, 0.15, 0.15) });
        cursorY -= 17;
      }
    }

    page.drawText(String(storyPage.page_number), {
      x: pageWidth / 2 - 6,
      y: 16,
      size: 9,
      font: bodyFont,
      color: rgb(0.6, 0.6, 0.6),
    });
    drawWatermark(page);
  }

  return pdf.save();
}