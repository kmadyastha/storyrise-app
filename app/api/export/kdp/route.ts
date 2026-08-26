import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { precheckCredits, chargeCredits } from "@/lib/credits";
import { fetchExportData, fetchImage, sanitizeFilename } from "@/lib/export/exportData";
import { normalizeImageForEmbed } from "@/lib/export/normalizeImageForEmbed";
import { buildInteriorPdf } from "@/lib/export/buildInteriorPdf";
import { wrapText } from "@/lib/export/wrapText";
import { bookSizes } from "@/lib/dummy-data";
import { KDP_BLEED_IN, KDP_MIN_PAGES, KDP_BARCODE_BOX_IN, computeCoverSpread, computeKdpCreditCost } from "@/lib/export/kdpSpec";

export const runtime = "nodejs";
// See app/api/generate-story/route.ts for why this is needed — KDP export
// fetches every page's image twice (interior + cover) and builds two PDFs
// plus a zip, so it's the single most time-hungry route in the app. Raised
// past the old 60s figure now that Fluid Compute's real Hobby ceiling is
// 300s (requires Fluid Compute enabled — Settings → Functions).
export const maxDuration = 100;

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

  const rate = await checkRateLimit(user.id, "export-kdp");
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

  // KDP is a paid-tier feature — free trial can't reach it via the UI, but
  // enforce it server-side too in case that's ever bypassed.
  if (book.is_free_trial) {
    return NextResponse.json({ error: "KDP export isn't available on the free trial — upgrade to unlock it." }, { status: 403 });
  }

  if (book.page_count < KDP_MIN_PAGES) {
    return NextResponse.json(
      { error: `KDP print files need at least ${KDP_MIN_PAGES} pages — this book has ${book.page_count}.` },
      { status: 400 }
    );
  }

  const size = bookSizes.find((s) => s.id === bookSizeId) ?? bookSizes.find((s) => "default" in s && s.default) ?? bookSizes[0];

  const cost = computeKdpCreditCost(book.page_count);
  const precheck = await precheckCredits(user.id, "kdp", book.is_free_trial, cost);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
  }

  // --- Interior: real bleed, no inline cover page (cover is a separate file) ---
  const interiorBytes = await buildInteriorPdf({
    book,
    pages,
    cover,
    trimWidthIn: size.widthIn,
    trimHeightIn: size.heightIn,
    bleedIn: KDP_BLEED_IN,
    watermark: false,
    includeCoverPage: false,
  });

  // --- Cover: real wrap-spread (back cover | spine | front cover) ---
  const { spineWidthIn, fullWidthIn, fullHeightIn } = computeCoverSpread(size.widthIn, size.heightIn, book.page_count);
  const fullWidthPt = fullWidthIn * PT_PER_IN;
  const fullHeightPt = fullHeightIn * PT_PER_IN;
  const bleedPt = KDP_BLEED_IN * PT_PER_IN;
  const trimWidthPt = size.widthIn * PT_PER_IN;
  const spineWidthPt = spineWidthIn * PT_PER_IN;

  const coverPdf = await PDFDocument.create();
  coverPdf.registerFontkit(fontkit);
  coverPdf.setTitle(`${book.title || "Untitled"} — KDP Cover`);
  coverPdf.setProducer("StoryRise");
  const bodyFont = await coverPdf.embedFont(StandardFonts.Helvetica);
  // Spine text is small, rotated, and meant to be read on an actual
  // physical printed book — bold Helvetica stays there for legibility.
  // The front cover title is large and is where the brand's actual
  // typography should show, so it gets the real Fredoka font instead.
  const spineFont = await coverPdf.embedFont(StandardFonts.HelveticaBold);
  const fredokaPath = path.join(process.cwd(), "assets/fonts/Fredoka-Variable.ttf");
  const titleFont = fs.existsSync(fredokaPath) ? await coverPdf.embedFont(fs.readFileSync(fredokaPath)) : spineFont;

  async function embed(url: string | null | undefined) {
    const fetched = await fetchImage(url);
    if (!fetched) return null;
    try {
      const normalized = await normalizeImageForEmbed(fetched.bytes);
      return normalized.format === "png"
        ? await coverPdf.embedPng(normalized.bytes)
        : await coverPdf.embedJpg(normalized.bytes);
    } catch {
      return null;
    }
  }

  const page = coverPdf.addPage([fullWidthPt, fullHeightPt]);
  const artImg = await embed(cover?.image_url ?? pages[0]?.image_url ?? null);

  function drawFit(x: number, y: number, w: number, h: number) {
    if (!artImg) {
      page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.91, 0.98, 0.98) });
      return;
    }
    const scale = Math.max(w / artImg.width, h / artImg.height);
    const drawW = artImg.width * scale;
    const drawH = artImg.height * scale;
    page.drawImage(artImg, { x: x - (drawW - w) / 2, y: y - (drawH - h) / 2, width: drawW, height: drawH });
  }

  // Panel x-offsets, left to right: [bleed][back cover][spine][front cover][bleed]
  const backX = 0;
  const spineX = bleedPt + trimWidthPt;
  const frontX = bleedPt + trimWidthPt + spineWidthPt;

  // Back cover — art + blurb, kept well clear of the barcode box.
  drawFit(backX, 0, bleedPt + trimWidthPt, fullHeightPt);
  const title = cover?.title || book.title || "Untitled story";
  const blurb =
    cover?.blurb || "A personalized StoryRise storybook — one idea, turned into a real, illustrated printed book.";
  const textSafeMargin = 0.5 * PT_PER_IN;
  const backTextX = backX + bleedPt + textSafeMargin * 0.6;
  const backTextWidth = trimWidthPt - textSafeMargin * 1.2;

  {
    const lines = wrapText(blurb, backTextWidth, (s) => bodyFont.widthOfTextAtSize(s, 11));
    let cursorY = fullHeightPt - bleedPt - textSafeMargin;
    page.drawRectangle({
      x: backTextX - 10,
      y: cursorY - lines.length * 15 - 10,
      width: backTextWidth + 20,
      height: lines.length * 15 + 20,
      color: rgb(1, 1, 1),
      opacity: 0.88,
    });
    for (const line of lines) {
      page.drawText(line, { x: backTextX, y: cursorY, size: 11, font: bodyFont, color: rgb(0.15, 0.15, 0.15) });
      cursorY -= 15;
    }
  }

  // Barcode reservation — real KDP spec: 2" × 1.2" clear white box, bottom-right
  // of the back cover. No real ISBN/barcode is generated here (StoryRise doesn't
  // assign ISBNs) — this reserves the correct space so Amazon's own auto-generated
  // barcode has clean room to sit without overlapping art or text.
  {
    const boxW = KDP_BARCODE_BOX_IN.width * PT_PER_IN;
    const boxH = KDP_BARCODE_BOX_IN.height * PT_PER_IN;
    const boxX = spineX - bleedPt - boxW - 0.125 * PT_PER_IN; // inset from the spine-side edge of the back cover
    const boxY = bleedPt + 0.125 * PT_PER_IN;
    page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
    page.drawText("Barcode area — reserved for KDP", {
      x: boxX + 8,
      y: boxY + boxH / 2 - 4,
      size: 7,
      font: bodyFont,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  // Spine — solid brand color band; title only drawn if the spine is wide
  // enough to be legible (very short books get a blank spine, same as most
  // real short paperbacks).
  page.drawRectangle({ x: spineX, y: 0, width: spineWidthPt, height: fullHeightPt, color: rgb(0, 0.737, 0.784) });
  if (spineWidthIn >= 0.1) {
    const spineTitle = title.length > 40 ? title.slice(0, 37) + "…" : title;
    page.drawText(spineTitle, {
      x: spineX + spineWidthPt / 2 + 5,
      y: fullHeightPt / 2 - bodyFont.widthOfTextAtSize(spineTitle, 10) / 2,
      size: 10,
      font: spineFont,
      color: rgb(1, 1, 1),
      rotate: degrees(90),
    });
  }

  // Front cover — art + title card, same treatment as the digital cover preview.
  drawFit(frontX, 0, trimWidthPt + bleedPt, fullHeightPt);
  {
    const titleSize = 26;
    const authorLine = cover?.author ? `by ${cover.author}` : null;
    const cardPadX = 24;
    const cardPadTop = 22;
    const cardPadBottom = authorLine ? 34 : 18;
    const frontTextWidth = trimWidthPt - textSafeMargin - cardPadX * 2;

    const lines = wrapText(title, frontTextWidth, (s) => titleFont.widthOfTextAtSize(s, titleSize));
    const lineHeight = titleSize * 1.15;
    const textBlockWidth = Math.max(...lines.map((l) => titleFont.widthOfTextAtSize(l, titleSize)));
    const cardWidth = Math.min(trimWidthPt - textSafeMargin, textBlockWidth + cardPadX * 2);
    const cardHeight = lines.length * lineHeight + cardPadTop + cardPadBottom;
    const cardX = frontX + bleedPt / 2 + (trimWidthPt - cardWidth) / 2;

    const placement = cover?.title_placement ?? "center";
    const cardY =
      placement === "top" ? fullHeightPt - textSafeMargin - cardHeight : placement === "bottom" ? textSafeMargin : fullHeightPt / 2 - cardHeight / 2;

    page.drawRectangle({ x: cardX, y: cardY, width: cardWidth, height: cardHeight, color: rgb(1, 1, 1), opacity: 0.95 });

    let cursorY = cardY + cardHeight - cardPadTop - titleSize * 0.85;
    for (const line of lines) {
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
  }

  const coverBytes = await coverPdf.save();

  // --- Zip both files together — KDP genuinely wants interior and cover
  // uploaded as two separate files, so a single PDF wouldn't match how
  // this actually gets used. ---
  const zip = new JSZip();
  const baseName = sanitizeFilename(book.title);
  zip.file(`${baseName}-interior.pdf`, interiorBytes);
  zip.file(`${baseName}-cover.pdf`, coverBytes);
  zip.file(
    "README.txt",
    `StoryRise KDP print files for "${book.title || "Untitled"}"\n\n` +
      `Trim size: ${size.widthIn}" x ${size.heightIn}"\n` +
      `Page count: ${book.page_count}\n` +
      `Spine width: ${spineWidthIn.toFixed(3)}"\n` +
      `Bleed: ${KDP_BLEED_IN}" on all outer edges\n\n` +
      `Upload "${baseName}-interior.pdf" as your manuscript/interior file and ` +
      `"${baseName}-cover.pdf" as your cover file in KDP's dashboard.\n\n` +
      `The cover file reserves a 2" x 1.2" white box on the back cover, bottom-` +
      `right, for Amazon's auto-generated barcode — no barcode image is included, ` +
      `since StoryRise doesn't assign ISBNs.\n\n` +
      `Amazon will ask you to declare AI-assisted content during upload — that ` +
      `happens on KDP's site, not StoryRise's.`
  );

  const zipBytes = await zip.generateAsync({ type: "uint8array" });

  // Only charge once both files were actually built successfully.
  await chargeCredits(user.id, bookId, "kdp", book.is_free_trial, cost);

  const filename = `${baseName}-kdp.zip`;

  return new NextResponse(Buffer.from(zipBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipBytes.length),
    },
  });
}