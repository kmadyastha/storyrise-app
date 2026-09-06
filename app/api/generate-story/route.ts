import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { precheckCredits, chargeCredits } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateAIInput, isLikelyRefusal, ValidationError, MAX_LENGTHS } from "@/lib/validation";
import type { Book } from "@/lib/supabase/queries";

// Vercel's default Node function timeout (10s on Hobby) is well under what a
// full multi-page Claude story generation can take — without this, the
// function gets killed mid-response and the client sees a truncated/empty
// body, which surfaces as a confusing "Unexpected end of JSON input" error
// instead of the real problem. Fluid Compute (the default on Vercel projects
// created after April 2025) raises Hobby's real ceiling to 300s, not the
// old 60s — 120 gives real headroom for large books without maxing it out.
// Requires Fluid Compute to be enabled on this project (Settings → Functions
// → Fluid Compute) — without it, any value above 60 fails the build.
export const maxDuration = 120;

interface ParsedPage {
  page: number;
  narration: string;
  imageDescription: string | null;
  characters: string[];
  setting: string;
  multiCharacter: boolean;
  chapterNumber?: number;
  qaPairs?: { question: string; answer: string }[];
}

interface ParsedStory {
  title: string;
  characters: { name: string; type: "human" | "non_human"; description: string }[];
  pages: ParsedPage[];
}

function buildMythologyGuidance(book: Book): string {
  const isMythology = book.style.startsWith("Mythology");
  const mythologySubType = isMythology && book.style.includes(" - ") ? book.style.split(" - ")[1] : null;
  if (mythologySubType === "Bible") {
    return "\n- This is a Bible-themed story: gently retell or draw inspiration from a Bible story or value, in warm, age-appropriate language. Respectful and not preachy — focus on the story, not a lesson delivered directly to the reader.";
  }
  if (mythologySubType === "Hindu") {
    return "\n- This is a Hindu-mythology-themed story: draw inspiration from stories, characters, or values from Hindu mythology (e.g. Ramayana, Mahabharata, Puranas), told respectfully and in age-appropriate language suitable for a children's picture book.";
  }
  if (mythologySubType?.startsWith("Vedic")) {
    return "\n- This is a Vedic-style story: write the narration on each page in a shloka-inspired verse style — simple, rhythmic, rhyming couplets in English that evoke Vedic verse structure, while staying clear and age-appropriate for a children's picture book.";
  }
  return "";
}

function buildPicturePrompt(book: Book): string {
  return `You are a professional children's picture-book writer for StoryRise.

Write a ${book.page_count}-page picture book based on this idea: "${book.idea}"

Constraints:
- Style/genre: ${book.style}${buildMythologyGuidance(book)}
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
}

/** Computes exactly which page numbers should be illustrated, given the
 * chosen density — decided server-side (not left to the AI to count
 * correctly), so the actual generated content and the real credit/asset
 * cost always match what was quoted. */
function computeIllustratedPages(book: Book): Set<number> {
  const total = book.page_count;
  const chapters = book.chapter_count ?? 1;
  const pagesPerChapter = Math.max(1, Math.round(total / chapters));
  const illustrated = new Set<number>();

  if (book.illustration_density === "none") return illustrated;

  if (book.illustration_density === "per_chapter" || book.illustration_density === "two_per_chapter") {
    const perChapter = book.illustration_density === "two_per_chapter" ? 2 : 1;
    for (let c = 0; c < chapters; c++) {
      const chapterStart = c * pagesPerChapter + 1;
      illustrated.add(chapterStart);
      if (perChapter === 2) {
        const mid = chapterStart + Math.floor(pagesPerChapter / 2);
        illustrated.add(Math.min(mid, total));
      }
    }
  } else if (book.illustration_density === "every_few_pages") {
    for (let p = 1; p <= total; p += 5) illustrated.add(p);
  }

  return illustrated;
}

function buildLongformPrompt(book: Book): string {
  const chapters = book.chapter_count ?? 5;
  const illustratedPages = computeIllustratedPages(book);
  const illustratedList = illustratedPages.size > 0 ? [...illustratedPages].sort((a, b) => a - b).join(", ") : "none";

  return `You are a professional children's chapter-book author for StoryRise.

Write a ${chapters}-chapter story based on this idea: "${book.idea}"

Constraints:
- Story type: ${book.story_type ?? "Adventure"}
- Target age group: ${book.age_group}
- Exactly ${chapters} chapters, and exactly ${book.page_count} total pages spread across them (roughly even chapter lengths)
- Number pages 1 to ${book.page_count} continuously across the whole book (don't restart numbering per chapter) — but track which chapter (1 to ${chapters}) each page belongs to via chapterNumber
- Each page's narration: a full page of chapter-book prose appropriate for ${book.age_group} — richer and longer than a picture-book page, several sentences to a short paragraph
- Only these page numbers should have an illustration (imageDescription): ${illustratedList}. For every other page, set imageDescription to null — this book intentionally has sparser illustration than a picture book, not one per page
- Where a page IS illustrated, imageDescription should be a short, vivid visual description of that page's key moment (for an AI image generator — describe the scene, not the text)
- Introduce a consistent cast of named characters and reuse them across chapters rather than inventing new ones
- Track which named characters appear on each page, and flag multiCharacter: true only when 2+ named characters appear together in the same scene
- Track the setting/location for each page (short label)
- Suggest a short, compelling book title

Respond with ONLY valid JSON matching this exact shape, no markdown code fences, no commentary before or after:

{
  "title": "string",
  "characters": [
    { "name": "string", "type": "human" | "non_human", "description": "string — physical description an illustrator could follow consistently" }
  ],
  "pages": [
    { "page": 1, "chapterNumber": 1, "narration": "string", "imageDescription": "string or null", "characters": ["string"], "setting": "string", "multiCharacter": false }
  ]
}`;
}

function buildEducationalPrompt(book: Book): string {
  const styleGuidance: Record<string, string> = {
    high_concept: "a confident, slightly advanced overview — still age-appropriate, but doesn't over-simplify",
    eli5: "as simple and playful as possible — short sentences, everyday analogies, like explaining to a curious 5-year-old",
    for_dummies: "plain, step-by-step, assuming zero prior knowledge — spell out even things that might seem obvious",
  };
  const style = styleGuidance[book.explanation_style ?? "eli5"];
  const concepts = book.concept_count ?? 1;
  const isStoryWrapped = book.story_type === "Story-wrapped";

  return `You are a professional educational children's author for StoryRise, writing a factually accurate learning book — not fiction. Getting facts right matters more than being entertaining here.

Write a ${book.page_count}-page learning book teaching this: "${book.idea}"

Constraints:
- Subject: ${book.subject ?? "Science"}
- Grade/age level: ${book.grade_level ?? "Grade 3-4"} — pitch vocabulary and depth exactly there
- Explanation style: ${style}
- ${isStoryWrapped ? "Wrap the explanation in a light narrative frame (a character discovering or exploring the concept) — but the story is a vehicle for the facts, not the point" : "Explain the concept(s) directly, without a fictional narrative frame — this is a direct explanation, not a story"}
- Cover ${concepts} concept${concepts > 1 ? "s" : ""} total, with roughly even page-space per concept if more than one
- ACCURACY IS CRITICAL: only state facts you're genuinely confident are correct and well-established for this subject and grade level. If you're not certain of a specific detail (an exact number, date, or statistic), state the underlying idea in general, safely-true terms instead of inventing a precise-sounding but unverified specific
- Exactly ${book.page_count} pages, numbered 1 to ${book.page_count}
- Each page's imageDescription should describe a clear, labeled, diagram-style or concept-illustration visual (not a narrative scene) that helps explain that page's idea — for an AI image generator
- On the FINAL page only, instead of continuing the explanation, include a "Check your understanding" section: exactly 4 question-and-answer pairs testing comprehension of what was just taught, generated directly from facts already stated earlier in this same book (don't introduce new facts in the Q&A) — put these in that page's qaPairs field, and leave imageDescription null for that page
- Track the setting/location loosely (can be "Classroom", "Diagram", "Nature", etc. — whatever fits) and characters (only relevant if story-wrapped; otherwise use an empty array)
- Suggest a short, clear book title

Respond with ONLY valid JSON matching this exact shape, no markdown code fences, no commentary before or after:

{
  "title": "string",
  "characters": [
    { "name": "string", "type": "human" | "non_human", "description": "string" }
  ],
  "pages": [
    { "page": 1, "narration": "string", "imageDescription": "string or null", "characters": ["string"], "setting": "string", "multiCharacter": false, "qaPairs": [{ "question": "string", "answer": "string" }] }
  ]
}

Only the LAST page should have a non-empty qaPairs array (with exactly 4 pairs) — every other page's qaPairs should be omitted or empty.`;
}

export async function POST(request: Request) {
  const { bookId } = await request.json();

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

  const rate = await checkRateLimit(user.id, "generate-story");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  // Confirm the book exists and belongs to the caller — RLS enforces this
  // too, but a clear 404 up front makes client-side error handling simpler.
  const { data: book, error: bookError } = await supabase.from("books").select("*").eq("id", bookId).single<Book>();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  try {
    validateAIInput(book.idea, "Your idea", MAX_LENGTHS.idea);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server" }, { status: 500 });
  }

  const precheck = await precheckCredits(user.id, "story", book.is_free_trial);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt =
    book.content_type === "longform"
      ? buildLongformPrompt(book)
      : book.content_type === "educational"
      ? buildEducationalPrompt(book)
      : buildPicturePrompt(book);

  let raw: string;
  try {
    // Fixed at 4096 regardless of page count used to work fine for ~20-page
    // books but wasn't enough for larger ones — a 50-page book's narration +
    // image descriptions + characters genuinely needs more room, and running
    // out mid-generation produces truncated, invalid JSON. Scales with page
    // count, capped at a safe ceiling for this model. Longform pages carry
    // meaningfully more prose per page than picture-book pages, so it gets
    // a bigger per-page allowance.
    const perPageTokens = book.content_type === "longform" ? 220 : 130;
    const maxTokens = Math.min(8000, 1500 + book.page_count * perPageTokens);
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock && "text" in textBlock ? textBlock.text : "";
  } catch (err) {
    // The AI call itself failed — nothing to charge for, the user got nothing.
    const message = err instanceof Error ? err.message : "Story generation failed — please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let parsed: ParsedStory;

  try {
    // Defensive: strip stray markdown fences if the model adds them despite instructions.
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    // Refusal or malformed output — again, nothing usable was produced, so
    // don't charge for it.
    if (isLikelyRefusal(raw)) {
      return NextResponse.json(
        { error: "That idea couldn't be turned into a book — try describing something different." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Something went wrong writing your story — please try regenerating." }, { status: 502 });
  }

  // Only charge once we know Claude actually produced usable content.
  await chargeCredits(user.id, bookId, "story", book.is_free_trial);

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
      chapter_number: p.chapterNumber ?? null,
      qa_pairs: p.qaPairs && p.qaPairs.length > 0 ? p.qaPairs : null,
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
