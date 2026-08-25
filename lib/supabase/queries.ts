import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface Book {
  id: string;
  user_id: string;
  title: string;
  idea: string;
  style: string;
  age_group: string;
  page_count: number;
  format: "classic" | "immersive";
  layout: "image-left" | "image-right" | null;
  art_style: string | null;
  setting: string | null;
  rhyme_mode: boolean;
  is_free_trial: boolean;
  status: "draft" | "story_generated" | "characters_confirmed" | "generating" | "complete";
  cover_color: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookInput {
  idea: string;
  style: string;
  ageGroup: string;
  pageCount: number;
  format: "classic" | "immersive";
  layout: "image-left" | "image-right";
  artStyle: string;
  setting: string;
  rhymeMode: boolean;
  isFreeTrial: boolean;
}

export async function createBook(supabase: SupabaseClient, userId: string, input: CreateBookInput) {
  return supabase
    .from("books")
    .insert({
      user_id: userId,
      idea: input.idea,
      style: input.style,
      age_group: input.ageGroup,
      page_count: input.pageCount,
      format: input.format,
      layout: input.layout,
      art_style: input.artStyle,
      setting: input.setting,
      rhyme_mode: input.rhymeMode,
      is_free_trial: input.isFreeTrial,
      status: "draft",
    })
    .select()
    .single<Book>();
}

export async function getBook(supabase: SupabaseClient, bookId: string) {
  return supabase.from("books").select("*").eq("id", bookId).single<Book>();
}

/** Marks the book's status for resume-progress purposes (e.g. "which step
 * did the user actually get to"). Uses the client-side Supabase client
 * directly (not a route) since this is a plain owner-scoped UPDATE, no
 * credit or AI logic involved. */
export async function updateBookStatus(bookId: string, status: Book["status"]) {
  const supabase = createClient();
  return supabase.from("books").update({ status }).eq("id", bookId);
}

export interface BookWithCoverImage extends Book {
  // Not a DB column — derived client-side from the book's first illustrated
  // page (if any), purely so the dashboard has something real to show
  // before a dedicated cover image exists.
  cover_image_url: string | null;
}

/** All of the signed-in user's books, newest-updated first, with each book's
 * page-1 illustration (if generated) attached for the dashboard thumbnail. */
export async function getUserBooks(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("books")
    .select("*, story_pages(image_url, page_number)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return { data: null as BookWithCoverImage[] | null, error };
  }

  const books: BookWithCoverImage[] = data.map((row) => {
    const { story_pages, ...book } = row as Book & {
      story_pages: { image_url: string | null; page_number: number }[] | null;
    };
    const pages = story_pages ?? [];
    const firstPage = pages.find((p) => p.page_number === 1) ?? pages[0];
    return { ...book, cover_image_url: firstPage?.image_url ?? null };
  });

  return { data: books, error: null };
}

export interface StoryPage {
  id: string;
  book_id: string;
  page_number: number;
  narration: string;
  image_description: string;
  characters: string[];
  setting: string | null;
  multi_character: boolean;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getStoryPages(supabase: SupabaseClient, bookId: string) {
  return supabase
    .from("story_pages")
    .select("*")
    .eq("book_id", bookId)
    .order("page_number", { ascending: true })
    .returns<StoryPage[]>();
}

export async function updateStoryPage(
  supabase: SupabaseClient,
  pageId: string,
  fields: Partial<Pick<StoryPage, "narration" | "image_description">>
) {
  return supabase.from("story_pages").update(fields).eq("id", pageId);
}

export interface Character {
  id: string;
  book_id: string;
  name: string;
  type: "human" | "non_human";
  description: string;
  reference_image_url: string | null;
  custom_image_url: string | null;
  created_at: string;
}

export async function getCharacters(supabase: SupabaseClient, bookId: string) {
  return supabase
    .from("characters")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: true })
    .returns<Character[]>();
}

export interface GenerateStoryResult {
  title: string;
  pages: {
    page: number;
    narration: string;
    imageDescription: string;
    characters: string[];
    setting: string;
    multiCharacter: boolean;
  }[];
  characters: { name: string; type: "human" | "non_human"; description: string }[];
}

/** Reads a fetch Response as JSON, but never throws a raw parse error
 * (e.g. "Unexpected end of JSON input") at the caller. That specific error
 * is what you get when the response body is empty or cut off mid-stream —
 * almost always a serverless function timeout killing the request, not
 * actually malformed JSON — so it's translated into a message that explains
 * what likely happened instead of leaking a JS internals string to the user. */
async function safeJsonResponse(res: Response): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const text = await res.text();
  try {
    return { ok: res.ok, data: text ? JSON.parse(text) : {} };
  } catch {
    return {
      ok: false,
      data: {
        error: res.ok
          ? "Something went wrong reading the response — please try again."
          : "The request took too long and was cut off — please try again (shorter books or fewer pages at once help).",
      },
    };
  }
}

export async function generateStory(bookId: string): Promise<GenerateStoryResult> {
  const res = await fetch("/api/generate-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookId }),
  });
  const { ok, data } = await safeJsonResponse(res);
  if (!ok) {
    throw new Error((data.error as string) || "Failed to generate story");
  }
  return data as unknown as GenerateStoryResult;
}

export async function generateCharacterImage(characterId: string): Promise<{ imageUrl: string }> {
  const res = await fetch("/api/generate-character-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterId }),
  });
  const { ok, data } = await safeJsonResponse(res);
  if (!ok) throw new Error((data.error as string) || "Failed to generate character image");
  return data as unknown as { imageUrl: string };
}

export async function generatePageImage(pageId: string): Promise<{ imageUrl: string }> {
  const res = await fetch("/api/generate-page-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageId }),
  });
  const { ok, data } = await safeJsonResponse(res);
  if (!ok) throw new Error((data.error as string) || "Failed to generate page image");
  return data as unknown as { imageUrl: string };
}

export async function generateNarration(pageId: string, voice?: string): Promise<{ audioUrl: string }> {
  const res = await fetch("/api/generate-narration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageId, voice }),
  });
  const { ok, data } = await safeJsonResponse(res);
  if (!ok) throw new Error((data.error as string) || "Failed to generate narration");
  return data as unknown as { audioUrl: string };
}

export interface Cover {
  id: string;
  book_id: string;
  mode: "digital" | "kdp";
  style: string;
  title_placement: string;
  title: string;
  author: string | null;
  blurb: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

/** One saved cover per book — returns null (not an error) when the book
 * doesn't have one yet, since "no cover saved" is the normal starting state. */
export async function getCover(supabase: SupabaseClient, bookId: string) {
  return supabase.from("covers").select("*").eq("book_id", bookId).maybeSingle<Cover>();
}

export interface GenerateCoverInput {
  bookId: string;
  mode: "digital" | "kdp";
  style: string;
  titlePlacement: string;
  title: string;
  author: string;
  blurb: string;
}

export async function generateCover(input: GenerateCoverInput): Promise<{ cover: Cover }> {
  const res = await fetch("/api/generate-cover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const { ok, data } = await safeJsonResponse(res);
  if (!ok) throw new Error((data.error as string) || "Failed to save cover");
  return data as unknown as { cover: Cover };
}