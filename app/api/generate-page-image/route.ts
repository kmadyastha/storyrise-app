import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage, uploadGeneratedImage, urlToBase64 } from "@/lib/gemini";
import { precheckCredits, chargeCredits } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateAIInput, ValidationError, MAX_LENGTHS } from "@/lib/validation";
import { bookSizeToAspectRatio } from "@/lib/dummy-data";

// See app/api/generate-story/route.ts for why this is needed.
export const maxDuration = 60;

export async function POST(request: Request) {
  const { pageId } = await request.json();

  if (!pageId) {
    return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id, "generate-page-image");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  // Same reasoning as generate-character-image/route.ts: this row may have
  // been inserted by a different serverless invocation (generate-story)
  // moments ago, and the Generating step fires these requests immediately
  // after. A short bounded retry is the standard mitigation for this class
  // of read-after-write timing gap.
  let page = null;
  let pageError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await supabase.from("story_pages").select("*").eq("id", pageId).single();
    page = result.data;
    pageError = result.error;
    if (page) break;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
  }

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  try {
    validateAIInput(page.image_description, "Image description", MAX_LENGTHS.imageDescription);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const { data: book } = await supabase.from("books").select("is_free_trial, book_size_id").eq("id", page.book_id).single();
  const isFreeTrial = book?.is_free_trial ?? false;

  const precheck = await precheckCredits(user.id, "page_image", isFreeTrial);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
  }

  // Pull reference images for whichever named characters appear on this page,
  // so Gemini has something concrete to stay visually consistent with.
  const { data: allCharacters } = await supabase
    .from("characters")
    .select("*")
    .eq("book_id", page.book_id);

  const relevantCharacters = (allCharacters ?? []).filter((c) => page.characters.includes(c.name));

  const references = [];
  for (const c of relevantCharacters) {
    const url = c.custom_image_url || c.reference_image_url;
    if (!url) continue;
    try {
      references.push(await urlToBase64(url));
    } catch {
      // Missing/unreachable reference shouldn't block the whole page —
      // Gemini falls back to the text description alone for that character.
    }
  }

  const characterNote =
    relevantCharacters.length > 0
      ? ` Keep ${relevantCharacters.map((c) => c.name).join(" and ")} visually consistent with the attached reference image(s).`
      : "";

  const prompt = `Children's picture-book illustration. Scene: ${page.image_description}. Setting: ${
    page.setting ?? "unspecified"
  }. Warm, friendly art style suitable for a kids' storybook, full-bleed illustration, no text or lettering in the image itself. Each character should appear exactly once, fully and correctly formed — no duplicated heads, limbs, or bodies, no extra or malformed body parts.${characterNote}`;

  let imageUrl: string;
  try {
    const { bytes, mimeType } = await generateImage(prompt, references, bookSizeToAspectRatio(book?.book_size_id ?? "8.5x8.5"));
    imageUrl = await uploadGeneratedImage(`pages/${pageId}.png`, bytes, mimeType);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: updateError } = await supabase.from("story_pages").update({ image_url: imageUrl }).eq("id", pageId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await chargeCredits(user.id, page.book_id, "page_image", isFreeTrial);

  return NextResponse.json({ imageUrl });
}