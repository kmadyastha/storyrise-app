-- StoryRise: persistent render-job tracking for the video/audiobook worker
-- Run this in the Supabase SQL editor before deploying the worker changes.
--
-- Replaces the worker's in-memory job Map, which was being wiped out
-- whenever the Fly.io machine restarted between the job being kicked off
-- and a later status poll — surfacing as "Unknown job (it may have
-- expired)" even though the render itself may have been working fine.

create table if not exists render_jobs (
  id text primary key,
  book_id text not null,
  job_type text not null check (job_type in ('video_narrated', 'video_silent', 'audiobook')),
  status text not null default 'processing' check (status in ('processing', 'done', 'error')),
  error text,
  result_path text,
  content_type text,
  filename text,
  created_at timestamptz not null default now()
);

-- The worker only ever accesses this via its service-role key, never a
-- user session, so RLS can stay simple — deny all by default, service role
-- bypasses RLS entirely regardless.
alter table render_jobs enable row level security;
