-- StoryRise: Long-Form Story Books + Educational Books
-- Run this in the Supabase SQL editor before deploying the app changes.

-- 1. What kind of book this is. Existing rows default to 'picture' (the
--    original, only-ever-existed type) so nothing already in the database
--    needs backfilling.
alter table books
  add column if not exists content_type text not null default 'picture'
  check (content_type in ('picture', 'longform', 'educational'));

-- 2. Long-Form Story Book fields (all null for picture/educational books).
alter table books
  add column if not exists chapter_count integer,
  add column if not exists illustration_density text
    check (illustration_density in ('none', 'per_chapter', 'two_per_chapter', 'every_few_pages')),
  add column if not exists total_illustrations integer,
  add column if not exists story_type text; -- adventure, moral, mystery, etc — longform's answer to "style"

-- 3. Educational Book fields (all null for picture/longform books).
alter table books
  add column if not exists subject text,
  add column if not exists concept_count integer,
  add column if not exists explanation_style text
    check (explanation_style in ('high_concept', 'eli5', 'for_dummies')),
  add column if not exists grade_level text;

-- 4. story_pages needs to represent chapters (longform) and concept+Q&A
--    blocks (educational), not just single illustrated picture-book pages.
--    chapter_number is null for picture books (page_number already covers
--    that case); qa_pairs is only populated on educational books' final
--    page/section.
alter table story_pages
  add column if not exists chapter_number integer,
  add column if not exists qa_pairs jsonb;

-- image_url and image_description were NOT NULL-ish in practice for picture
-- books (every page always got an illustration) — longform pages may have
-- no illustration at all depending on the book's illustration_density, so
-- make sure the column allows null if it doesn't already.
alter table story_pages
  alter column image_description drop not null;
