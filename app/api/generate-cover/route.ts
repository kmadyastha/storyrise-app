import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { precheckCredits, chargeCredits } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rateLimit";

// See app/api/generate-story/route.ts for why this is needed.
export const maxDuration = 60;

const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 100;
const MAX_BLURB_LENGTH = 1000;

export async function POST(request: Request) {
  const body = await request.json();
  const { bookId, mode, style, titlePlacement, title, author, blurb } = body ?? {};

  if (!bookId || !mode || !style || !titlePlacement || !title) {
    return NextResponse.json({ error: "Missing required cover fields" }, { status: 400 });
  }
  if (mode !== "digital" && mode !== "kdp") {
    return NextResponse.json({ error: "Invalid cover mode" }, { status: 400 });
  }

  const trimmedTitle = String(title).trim();
  const trimmedAuthor = String(author ?? "").trim();
  const trimmedBlurb = String(blurb ?? "").trim();

  if (trimmedTitle.length === 0) {
    return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
  }
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title is too long (max ${MAX_TITLE_LENGTH} characters)` }, { status: 400 });
  }
  if (trimmedAuthor.length > MAX_AUTHOR_LENGTH) {
    return NextResponse.json({ error: `Author name is too long (max ${MAX_AUTHOR_LENGTH} characters)` }, { status: 400 });
  }
  if (trimmedBlurb.length > MAX_BLURB_LENGTH) {
    return NextResponse.json({ error: `Blurb is too long (max ${MAX_BLURB_LENGTH} characters)` }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id, "generate-cover");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  // Confirm the book exists and belongs to the caller — RLS enforces this
  // too, but a clear 404 up front makes client-side error handling simpler.
  const { data: book, error: bookError } = await supabase.from("books").select("id, is_free_trial").eq("id", bookId).single();
  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const precheck = await precheckCredits(user.id, "cover", book.is_free_trial);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
  }

  // No dedicated cover-art model wired up yet (that's a Phase 4 item) — for
  // now the cover reuses the book's own page-1 illustration as its base
  // image, so what's saved is real art rather than another placeholder.
  const { data: firstPage } = await supabase
    .from("story_pages")
    .select("image_url")
    .eq("book_id", bookId)
    .eq("page_number", 1)
    .maybeSingle();

  // One cover row per book — re-saving (including switching digital/kdp
  // mode) overwrites the previous config rather than creating a new row.
  // Requires a unique constraint on covers.book_id; add one via migration
  // if it isn't already there (`alter table covers add constraint
  // covers_book_id_key unique (book_id);`).
  const { data: cover, error: coverError } = await supabase
    .from("covers")
    .upsert(
      {
        book_id: bookId,
        mode,
        style,
        title_placement: titlePlacement,
        title: trimmedTitle,
        author: trimmedAuthor || null,
        blurb: trimmedBlurb || null,
        image_url: firstPage?.image_url ?? null,
      },
      { onConflict: "book_id" }
    )
    .select()
    .single();

  if (coverError || !cover) {
    return NextResponse.json({ error: coverError?.message ?? "Failed to save cover" }, { status: 500 });
  }

  // Only charge once the cover has actually been saved successfully.
  await chargeCredits(user.id, bookId, "cover", book.is_free_trial);

  return NextResponse.json({ cover });
}