import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";

const IMAGE_MODEL = "gemini-3.1-flash-image";

/** The @google/genai SDK stuffs the full raw API error response (JSON,
 * quota metric names, retry info, everything) into Error.message — fine for
 * server logs, but never something to show a user directly. This narrows
 * just the "you're rate-limited / out of quota" case to a clean message;
 * anything else still surfaces normally (still useful, just not this ugly). */
function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("RESOURCE_EXHAUSTED") || msg.includes('"code":429') || /\b429\b/.test(msg);
}

interface ReferenceImage {
  base64: string;
  mimeType: string;
}

/**
 * Generates one image from a text prompt, optionally grounded on reference
 * images (e.g. a character's existing reference photo, so a page
 * illustration keeps that character consistent). Returns the raw image
 * bytes AND the real mimeType Gemini reports — critically, NOT assumed to
 * be PNG. Earlier code discarded this and every caller hardcoded
 * "image/png", which was harmless for in-browser <img> tags (browsers
 * content-sniff the real format regardless of a wrong label) but broke
 * pdf-lib's embedPng() — which validates the real PNG file signature and
 * throws if the bytes aren't genuinely PNG — silently producing a blank
 * placeholder in every PDF/PPTX/Etsy export.
 */
export async function generateImage(
  prompt: string,
  references: ReferenceImage[] = []
): Promise<{ bytes: Buffer; mimeType: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set on the server");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contents = [
    ...references.map((ref) => ({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } })),
    { text: prompt },
  ];

  let response;
  try {
    response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents,
    });
  } catch (err) {
    if (isRateLimitError(err)) {
      throw new Error("Image generation hit a temporary rate limit — please wait a moment and try again.");
    }
    throw err;
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => "inlineData" in p && p.inlineData);

  if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData?.data) {
    throw new Error("Gemini didn't return an image — try again.");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return { bytes: Buffer.from(imagePart.inlineData.data, "base64"), mimeType };
}

/** Fetches an existing image URL and returns it as base64, for use as a reference. */
export async function urlToBase64(url: string): Promise<ReferenceImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch reference image (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "image/png";
  return { base64: buffer.toString("base64"), mimeType };
}

/** Uploads generated image bytes to the book-assets bucket and returns its
 * public URL. Uses the admin client rather than the caller's session-scoped
 * one: by the time this runs, the calling route has already confirmed
 * ownership of the character/page/book via an RLS-scoped SELECT, so this is
 * a trusted server-side write — using the session client here just made the
 * upload subject to storage.objects RLS policies a second time for no real
 * security benefit, and was the actual cause of "new row violates row-level
 * security policy" failures on upload. */
export async function uploadGeneratedImage(path: string, bytes: Buffer, contentType: string): Promise<string> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from("book-assets").upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = admin.storage.from("book-assets").getPublicUrl(path);
  return data.publicUrl;
}