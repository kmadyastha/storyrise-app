import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage, uploadGeneratedImage } from "@/lib/gemini";

export async function POST(request: Request) {
  const { characterId } = await request.json();

  if (!characterId) {
    return NextResponse.json({ error: "Missing characterId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: character, error: charError } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .single();

  if (charError || !character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const prompt = `Children's picture-book illustration, character reference sheet. A single ${
    character.type === "human" ? "person" : "character"
  } shown clearly, centered, plain neutral background, warm friendly art style suitable for a kids' storybook. Description: ${
    character.description
  }. Name: ${character.name}.`;

  let imageUrl: string;
  try {
    const bytes = await generateImage(prompt);
    imageUrl = await uploadGeneratedImage(supabase, `characters/${characterId}.png`, bytes);
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

  return NextResponse.json({ imageUrl });
}