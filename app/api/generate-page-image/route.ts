import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage, uploadGeneratedImage, urlToBase64 } from "@/lib/gemini";

export async function POST(request: Request) {
  const { pageId } = await request.json();

  if (!pageId) {
    return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: page, error: pageError } = await supabase
    .from("story_pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
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
  }. Warm, friendly art style suitable for a kids' storybook, full-bleed illustration, no text or lettering in the image itself.${characterNote}`;

  let imageUrl: string;
  try {
    const bytes = await generateImage(prompt, references);
    imageUrl = await uploadGeneratedImage(supabase, `pages/${pageId}.png`, bytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: updateError } = await supabase.from("story_pages").update({ image_url: imageUrl }).eq("id", pageId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ imageUrl });
}