import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchExportData, fetchImage, sanitizeFilename, WATERMARK_TEXT } from "@/lib/export/exportData";
import { bookSizes } from "@/lib/dummy-data";

// pptxgenjs's Node output (nodebuffer) needs the Node runtime, not Edge.
export const runtime = "nodejs";

function toDataUrl(img: { bytes: Uint8Array; contentType: string } | null): string | null {
  if (!img) return null;
  // pptxgenjs wants a clean image/png or image/jpeg data URL — normalize
  // anything else to png rather than pass through an unrecognized mime type.
  const mime = img.contentType.includes("jpeg") || img.contentType.includes("jpg") ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${Buffer.from(img.bytes).toString("base64")}`;
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

  // --- Story slides — same Classic/Immersive layout logic as the PDF export ---
  for (const storyPage of pages) {
    const imgData = await embed(storyPage.image_url);

    if (book.format === "immersive") {
      const slide = pres.addSlide();
      const imageOnRight = book.layout !== "image-left";
      const half = W / 2;
      const imgX = imageOnRight ? half : 0;
      const textX = imageOnRight ? 0.3 : half + 0.3;

      addImageCover(slide, imgData, imgX, 0, half, H);
      slide.addText(storyPage.narration, {
        x: textX,
        y: 0.4,
        w: half - 0.6,
        h: H - 0.8,
        fontSize: 15,
        color: "262626",
        valign: "top",
        fontFace: "Arial",
      });
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
    } else {
      const imgSlide = pres.addSlide();
      addImageCover(imgSlide, imgData, 0, 0, W, H);
      addWatermark(imgSlide);

      const textSlide = pres.addSlide();
      textSlide.background = { color: "FEFAF6" };
      textSlide.addText(storyPage.narration, {
        x: 0.6,
        y: H / 2 - 0.6,
        w: W - 1.2,
        h: 1.2,
        align: "center",
        valign: "middle",
        fontSize: 18,
        color: "262626",
        fontFace: "Arial",
      });
      textSlide.addText(String(storyPage.page_number), {
        x: 0,
        y: H - 0.35,
        w: W,
        h: 0.3,
        align: "center",
        fontSize: 9,
        color: "999999",
      });
      addWatermark(textSlide);
    }
  }

  const buffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  const filename = `${sanitizeFilename(book.title)}.pptx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}