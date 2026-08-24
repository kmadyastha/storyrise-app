import type { SupabaseClient } from "@supabase/supabase-js";
import type { Book, StoryPage, Cover } from "@/lib/supabase/queries";

export interface ExportData {
  book: Book;
  pages: StoryPage[];
  cover: Cover | null;
}

/** Pulls everything an export route needs in one place — RLS on the
 * user-scoped client still applies, so a book that isn't the caller's
 * simply won't come back. */
export async function fetchExportData(supabase: SupabaseClient, bookId: string): Promise<ExportData | null> {
  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single<Book>();
  if (!book) return null;

  const { data: pages } = await supabase
    .from("story_pages")
    .select("*")
    .eq("book_id", bookId)
    .order("page_number", { ascending: true })
    .returns<StoryPage[]>();

  const { data: cover } = await supabase.from("covers").select("*").eq("book_id", bookId).maybeSingle<Cover>();

  return { book, pages: pages ?? [], cover: (cover as Cover) ?? null };
}

export interface FetchedImage {
  bytes: Uint8Array;
  contentType: string;
}

/** Downloads an illustration/cover image so it can be embedded in the
 * export file. Returns null on any failure — callers fall back to a plain
 * color panel rather than failing the whole export over one missing image. */
export async function fetchImage(url: string | null | undefined): Promise<FetchedImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const buf = await res.arrayBuffer();
    return { bytes: new Uint8Array(buf), contentType };
  } catch {
    return null;
  }
}

export function sanitizeFilename(title: string): string {
  const cleaned = (title || "storybook")
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned || "storybook";
}

const WATERMARK_TEXT = "STORYRISE — FREE TRIAL";

export { WATERMARK_TEXT };