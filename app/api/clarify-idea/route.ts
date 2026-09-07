import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";

export const maxDuration = 30;

interface ClarifyQuestion {
  question: string;
  options: string[];
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  picture: "children's picture book",
  longform: "children's chapter book",
  educational: "children's educational book",
};

export async function POST(request: Request) {
  const { idea, contentType, pageCount, concepts } = await request.json().catch(() => ({}));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id, "clarify-idea");
  if (!rate.allowed) {
    // Fail open rather than block the person from creating — this check is
    // a nice-to-have quality improvement, not something that should ever
    // itself become the reason someone can't make a book.
    return NextResponse.json({ needsClarification: false, questions: [] });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ needsClarification: false, questions: [] });
  }

  const inputSummary =
    contentType === "educational" && Array.isArray(concepts) && concepts.length > 0
      ? `Concepts: ${concepts.join(", ")}${idea ? `. Extra context from the creator: ${idea}` : ""}`
      : idea;

  if (!inputSummary || typeof inputSummary !== "string" || !inputSummary.trim()) {
    return NextResponse.json({ needsClarification: false, questions: [] });
  }

  const typeLabel = CONTENT_TYPE_LABEL[contentType] ?? "children's book";

  const prompt = `You're helping someone create a ${pageCount}-page ${typeLabel} on StoryRise.

They entered: "${inputSummary}"

Decide: is this specific and clear enough to generate a genuinely good, well-scoped book right now, or is it so vague or broad that a few clarifying questions would meaningfully improve the result?

Be conservative — only ask questions if genuinely needed. Examples that DO need clarification: a single vague word like "Heart" for a ${pageCount}-page book with no angle specified, or "space" with no clear direction. Examples that DON'T need clarification: anything with a clear premise, angle, or specific enough scope already.

If clarification would help, generate 1-3 short questions, each with 3-4 concrete suggested answers. The user can also type their own answer, so keep the options as helpful starting points, not an exhaustive list.

Respond with ONLY valid JSON, no markdown code fences, no commentary before or after:
{
  "needsClarification": boolean,
  "questions": [
    { "question": "string", "options": ["string", "string", "string"] }
  ]
}

If needsClarification is false, questions must be an empty array.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(cleaned);
    const questions: ClarifyQuestion[] = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : [];
    return NextResponse.json({ needsClarification: !!parsed.needsClarification && questions.length > 0, questions });
  } catch {
    // Fail open — a broken pre-check should never block book creation.
    return NextResponse.json({ needsClarification: false, questions: [] });
  }
}
