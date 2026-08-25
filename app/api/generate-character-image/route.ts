import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage, uploadGeneratedImage } from "@/lib/gemini";
import { precheckCredits, chargeCredits } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateAIInput, ValidationError, MAX_LENGTHS } from "@/lib/validation";

// See app/api/generate-story/route.ts for why this is needed — image
// generation can also exceed Vercel's 10s default on Hobby.
export const maxDuration = 60;

export async function POST(request: Request) {
  const { characterId } = await request.json();

  if (!characterId) {
    return NextResponse.json({ error: "Missing characterId" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id, "generate-character-image");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  const { data: character, error: charError } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .single();

  if (charError || !character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  try {
    validateAIInput(character.description, "Character description", MAX_LENGTHS.description);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const { data: book } = await supabase.from("books").select("is_free_trial").eq("id", character.book_id).single();
  const isFreeTrial = book?.is_free_trial ?? false;

  const precheck = await precheckCredits(user.id, "character_image", isFreeTrial);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
  }

  const prompt = `Children's picture-book illustration, character reference sheet. A single ${
    character.type === "human" ? "person" : "character"
  } shown clearly, centered, plain neutral background, warm friendly art style suitable for a kids' storybook. Description: ${
    character.description
  }. Name: ${character.name}.`;

  let imageUrl: string;
  try {
    const { bytes, mimeType } = await generateImage(prompt);
    imageUrl = await uploadGeneratedImage(`characters/${characterId}.png`, bytes, mimeType);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("characters")
    .update({ reference_image_url: imageUrl })
    .eq("id", characterId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await chargeCredits(user.id, character.book_id, "character_image", isFreeTrial);

  return NextResponse.json({ imageUrl });
}