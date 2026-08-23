import { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_MODEL = "gemini-3.1-flash-image";

interface ReferenceImage {
  base64: string;
  mimeType: string;
}

/**
 * Generates one image from a text prompt, optionally grounded on reference
 * images (e.g. a character's existing reference photo, so a page
 * illustration keeps that character consistent). Returns raw PNG bytes.
 */
export async function generateImage(prompt: string, references: ReferenceImage[] = []): Promise<Buffer> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set on the server");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contents = [
    ...references.map((ref) => ({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } })),
    { text: prompt },
  ];

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => "inlineData" in p && p.inlineData);

  if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData?.data) {
    throw new Error("Gemini didn't return an image — try again.");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

/** Fetches an existing image URL and returns it as base64, for use as a reference. */
export async function urlToBase64(url: string): Promise<ReferenceImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch reference image (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "image/png";
  return { base64: buffer.toString("base64"), mimeType };
}

/** Uploads generated image bytes to the book-assets bucket and returns its public URL. */
export async function uploadGeneratedImage(
  supabase: SupabaseClient,
  path: string,
  bytes: Buffer
): Promise<string> {
  const { error } = await supabase.storage.from("book-assets").upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from("book-assets").getPublicUrl(path);
  return data.publicUrl;
}