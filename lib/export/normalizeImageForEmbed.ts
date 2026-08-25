import sharp from "sharp";

export interface NormalizedImage {
  bytes: Buffer;
  format: "png" | "jpeg";
}

/**
 * Sniffs the REAL image format from the actual bytes (magic numbers) —
 * deliberately ignoring any stored/reported content-type, since images
 * uploaded before the mimeType fix in lib/gemini.ts were all mislabeled
 * "image/png" regardless of their real format. Guarantees a buffer that
 * pdf-lib (embedPng/embedJpg) and pptxgenjs can both actually embed,
 * transcoding via sharp if the real bytes are neither PNG nor JPEG (e.g.
 * WEBP, which Nano Banana can return and neither library supports).
 */
export async function normalizeImageForEmbed(bytes: Uint8Array): Promise<NormalizedImage> {
  const buf = Buffer.from(bytes);
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

  if (isPng) return { bytes: buf, format: "png" };
  if (isJpeg) return { bytes: buf, format: "jpeg" };

  // Neither — transcode to PNG so it's always embeddable regardless of what
  // the real source format turns out to be.
  const png = await sharp(buf).png().toBuffer();
  return { bytes: png, format: "png" };
}