-- StoryRise: book size upfront + structured Educational concepts
-- Run this in the Supabase SQL editor before deploying the app changes.

-- 1. Trim/book size, now chosen at creation time (not just export time) so
--    illustrations can be generated at the right aspect ratio from the
--    start, instead of always generating one shape and hoping it fits
--    whatever trim gets picked later at export.
alter table books
  add column if not exists book_size_id text not null default '8.5x8.5';

-- 2. Structured concept list for Educational books — replaces relying on
--    a single free-text idea field (e.g. "Heart, Brain & Digestive System")
--    that the AI had to guess how to split. Null/empty for picture/longform
--    books. Stored as a JSON array of strings, e.g. ["Heart", "Brain"].
alter table books
  add column if not exists concepts jsonb;
