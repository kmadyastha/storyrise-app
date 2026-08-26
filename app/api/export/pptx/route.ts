import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, fetchImage, sanitizeFilename, WATERMARK_TEXT } from "@/lib/export/exportData";
import { normalizeImageForEmbed } from "@/lib/export/normalizeImageForEmbed";
import { bookSizes } from "@/lib/dummy-data";

// pptxgenjs's Node output (nodebuffer) needs the Node runtime, not Edge.
export const runtime = "nodejs";
// See app/api/generate-story/route.ts for why this is needed.
export const maxDuration = 60;

async function toDataUrl(img: { bytes: Uint8Array; contentType: string } | null): Promise<string | null> {
  if (!img) return null;
  // The stored content-type can be wrong for images uploaded before the
  // mimeType fix in lib/gemini.ts — sniff the real bytes instead of trusting
  // it, so the data URL's mime prefix always genuinely matches what's inside.
  const normalized = await normalizeImageForEmbed(img.bytes);
  const mime = normalized.format === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${normalized.bytes.toString("base64")}`;
}

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

  const rate = await checkRateLimit(user.id, "export-pptx");
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

  const pres = new PptxGenJS();
  pres.defineLayout({ name: "STORYRISE_TRIM", width: size.widthIn, height: size.heightIn });
  pres.layout = "STORYRISE_TRIM";
  pres.title = book.title || "Untitled StoryRise book";
  pres.author = "StoryRise";

  const W = size.widthIn;
  const H = size.heightIn;

  function addWatermark(slide: PptxGenJS.Slide) {
    if (!book.is_free_trial) return;
    slide.addText(WATERMARK_TEXT, {
      x: -W * 0.15,
      y: H / 2 - 0.3,
      w: W * 1.3,
      h: 0.6,
      align: "center",
      fontSize: 28,
      color: "999999",
      transparency: 65,
      rotate: 335,
      bold: true,
    });
  }

  function addImageCover(slide: PptxGenJS.Slide, dataUrl: string | null, x: number, y: number, w: number, h: number) {
    if (dataUrl) {
      slide.addImage({ data: dataUrl, x, y, w, h, sizing: { type: "cover", w, h } });
    } else {
      slide.addShape("rect", { x, y, w, h, fill: { color: "E8FAFB" } });
    }
  }

  async function embed(url: string | null | undefined) {
    return toDataUrl(await fetchImage(url));
  }

  // --- Cover slide ---
  {
    const slide = pres.addSlide();
    const coverImg = await embed(cover?.image_url ?? pages[0]?.image_url ?? null);
    addImageCover(slide, coverImg, 0, 0, W, H);

    const title = cover?.title || book.title || "Untitled story";
    slide.addShape("rect", { x: 0, y: H / 2 - 0.6, w: W, h: 1.2, fill: { color: "FFFFFF", transparency: 8 } });
    slide.addText(title, {
      x: 0.4,
      y: H / 2 - 0.55,
      w: W - 0.8,
      h: cover?.author ? 0.75 : 1.1,
      align: "center",
      valign: "middle",
      fontSize: 28,
      bold: true,
      color: "1A1A1A",
      fontFace: "Arial",
    });
    if (cover?.author) {
      slide.addText(`by ${cover.author}`, {
        x: 0.4,
        y: H / 2 + 0.2,
        w: W - 0.8,
        h: 0.35,
        align: "center",
        fontSize: 13,
        color: "5A5A5A",
      });
    }
    addWatermark(slide);
  }

  // --- Story slides — one slide per story page, matching exactly what's
  // shown in the in-app Preview (earlier version made two slides per story
  // page for Classic, doubling the deck length and not matching what the
  // customer had actually previewed). ---
  for (const storyPage of pages) {
    const imgData = await embed(storyPage.image_url);
    const slide = pres.addSlide();

    if (book.format === "immersive") {
      // Full-bleed image, exactly like Classic — a translucent dark box
      // holds the narration directly over the art instead of a hard split
      // hiding half the illustration. Matches the PDF export and in-app
      // Preview 1:1.
      addImageCover(slide, imgData, 0, 0, W, H);

      const overlayH = 1.6;
      slide.addShape("rect", { x: 0.3, y: 0.3, w: W - 0.6, h: overlayH, fill: { color: "000000", transparency: 25 } });
      slide.addText(storyPage.narration, {
        x: 0.5,
        y: 0.3,
        w: W - 1.0,
        h: overlayH,
        fontSize: 14,
        color: "FFFFFF",
        valign: "middle",
        fontFace: "Arial",
      });
    } else {
      addImageCover(slide, imgData, 0, 0, W, H);

      // Caption strip along the bottom, matching the Preview page's white
      // card sitting over the illustration.
      const stripH = 1.3;
      slide.addShape("rect", { x: 0, y: H - stripH, w: W, h: stripH, fill: { color: "FFFFFF", transparency: 6 } });
      slide.addText(storyPage.narration, {
        x: 0.4,
        y: H - stripH,
        w: W - 0.8,
        h: stripH,
        fontSize: 13,
        color: "262626",
        valign: "middle",
        fontFace: "Arial",
      });
    }

    slide.addText(String(storyPage.page_number), {
      x: 0,
      y: H - 0.35,
      w: W,
      h: 0.3,
      align: "center",
      fontSize: 9,
      color: "999999",
    });
    addWatermark(slide);
  }

  const buffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  const filename = `${sanitizeFilename(book.title)}.pptx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}