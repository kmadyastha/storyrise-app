import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function generateStory(bookId: string): Promise<GenerateStoryResult> {
  const res = await fetch("/api/generate-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate story");
  }
  return data;
}

export async function generateCharacterImage(characterId: string): Promise<{ imageUrl: string }> {
  const res = await fetch("/api/generate-character-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate character image");
  return data;
}

export async function generatePageImage(pageId: string): Promise<{ imageUrl: string }> {
  const res = await fetch("/api/generate-page-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate page image");
  return data;
}

export async function generateNarration(pageId: string): Promise<{ audioUrl: string }> {
  const res = await fetch("/api/generate-narration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate narration");
  return data;
}