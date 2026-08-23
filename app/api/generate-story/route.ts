import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { bookId } = await request.json();

  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Confirm the book exists and belongs to the caller — RLS enforces this
  // too, but a clear 404 up front makes client-side error handling simpler.
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a professional children's picture-book writer for StoryRise.

Write a ${book.page_count}-page picture book based on this idea: "${book.idea}"

Constraints:
- Style/genre: ${book.style}
- Target age group: ${book.age_group}
- Exactly ${book.page_count} pages, numbered 1 to ${book.page_count}
- Each page's narration: 1-3 sentences, roughly 20-40 words, age-appropriate vocabulary for ${book.age_group}
- Each page's imageDescription: a short, vivid visual description of what the illustration should show on that page (for an AI image generator — describe the scene, not the text)
- Introduce a consistent cast of named characters (2-4 total is typical) and reuse them across pages rather than inventing new ones each page
- Track which named characters appear on each page, and flag multiCharacter: true only when 2+ named characters appear together in the same scene
- Track the setting/location for each page (short label, e.g. "Village", "Forest", "Sky")
- Suggest a short, warm book title

Respond with ONLY valid JSON matching this exact shape, no markdown code fences, no commentary before or after:

{
  "title": "string",
  "characters": [
    { "name": "string", "type": "human" | "non_human", "description": "string — physical description an illustrator could follow consistently" }
  ],
  "pages": [
    { "page": 1, "narration": "string", "imageDescription": "string", "characters": ["string"], "setting": "string", "multiCharacter": false }
  ]
}`;

  let raw: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock && "text" in textBlock ? textBlock.text : "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claude API request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let parsed: {
    title: string;
    characters: { name: string; type: "human" | "non_human"; description: string }[];
    pages: {
      page: number;
      narration: string;
      imageDescription: string;
      characters: string[];
      setting: string;
      multiCharacter: boolean;
    }[];
  };

  try {
    // Defensive: strip stray markdown fences if the model adds them despite instructions.
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Claude's response wasn't valid JSON — try regenerating." },
      { status: 502 }
    );
  }

  // Replace any existing pages/characters for this book (covers the "regenerate" case).
  await supabase.from("story_pages").delete().eq("book_id", bookId);
  await supabase.from("characters").delete().eq("book_id", bookId);

  const { error: pagesError } = await supabase.from("story_pages").insert(
    parsed.pages.map((p) => ({
      book_id: bookId,
      page_number: p.page,
      narration: p.narration,
      image_description: p.imageDescription,
      characters: p.characters,
      setting: p.setting,
      multi_character: p.multiCharacter,
    }))
  );

  const { error: charactersError } = await supabase.from("characters").insert(
    parsed.characters.map((c) => ({
      book_id: bookId,
      name: c.name,
      type: c.type,
      description: c.description,
    }))
  );

  if (pagesError || charactersError) {
    return NextResponse.json(
      { error: pagesError?.message || charactersError?.message || "Failed to save generated story" },
      { status: 500 }
    );
  }

  await supabase.from("books").update({ title: parsed.title, status: "story_generated" }).eq("id", bookId);

  return NextResponse.json({ title: parsed.title, pages: parsed.pages, characters: parsed.characters });
}