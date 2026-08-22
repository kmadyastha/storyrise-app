# StoryRise — Frontend Preview (V1)

Wireframe/UI pass of the full StoryRise app, running entirely on **dummy data** —
no backend, no Supabase, no real AI calls. Built to match the four spec docs:
PRD, Architecture Plan, File Structure, and Design System.

## What's here

- Marketing landing page (cycling wave hero, feature grid, comparison table)
- Pricing page
- Dummy login (magic-link style, auto-signs-in after a beat)
- Dashboard / book library
- The full 11-step story-creation flow, each step wired to dummy data:
  idea → story table → characters → layout → credit quote → generating →
  preview → cover → export
- Free-trial paywall gating (`PaidBadge` + `UpgradeModal`) exactly as specced —
  everything visible, locked actions marked, never hidden
- The **Pro-upgrade celebration**: caterpillar → cocoon → butterfly (x2, in the
  brand palette) → "Welcome to Pro" reveal, fires only after the (simulated)
  payment confirms — `components/celebration/ProCelebration.tsx`
- Account page with demo controls to replay the celebration and switch tiers,
  so you can see gating change across the whole app without a real payment

## Design tokens

Colors, fonts, and spacing all live in `app/globals.css` as CSS variables,
matching the locked Design System doc:

- Teal `#00BCC8` — brand anchor, used everywhere in-app
- Lime `#D0FF00`, Green `#1DC27A`, Tangerine `#FF6A1F` — cycling hero only
- Fredoka (headings) + Inter (body) — loaded via `<link>` in `app/layout.tsx`
  rather than `next/font/google`, so the build doesn't require network access
  to fonts.googleapis.com in every environment. Swap to `next/font/google`
  once this is running somewhere with normal internet access (Codespaces/Vercel)
  for better perf + self-hosting — see the comment in `app/layout.tsx`.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## What's NOT here yet (by design — this is a frontend-only pass)

- Razorpay/Stripe integration — the upgrade modal simulates a checkout with a
  `setTimeout`, per your call to do payments after the rest of the setup
- Supabase — no real auth, no persisted data; all content lives in
  `lib/dummy-data.ts` and resets on refresh
- The actual generation pipeline (Claude/Nano Banana/OpenAI TTS/ffmpeg) —
  `IllustrationPlaceholder.tsx` is a seeded SVG standing in for AI-generated art
- Real file export (PDF/PPTX/video/KDP) — the export buttons show a
  "Downloaded!" state but don't produce a file

## Structure

Mirrors the File Structure doc where it makes sense for a frontend-only repo:

```
app/                     # routes (App Router)
  page.tsx                 marketing landing
  pricing/, login/, dashboard/, account/
  create/                  the 11-step flow
    page.tsx                 Step 1
    [bookId]/story/          Steps 2-3
    [bookId]/characters/     Step 4
    [bookId]/style/          Step 5
    [bookId]/quote/          Step 6
    [bookId]/generating/     Step 7
    [bookId]/preview/        Step 8
    [bookId]/cover/          Step 9
    [bookId]/export/         Steps 10-11
components/
  nav/, landing/, ui/, paywall/, celebration/, create/
lib/
  app-context.tsx          demo global state (tier, credits, celebration)
  dummy-data.ts            every mock dataset the UI reads from
```

## Next steps (once GitHub + Supabase are set up)

1. Wire `lib/app-context.tsx` to real Supabase auth + a `profiles` row instead
   of in-memory state
2. Replace `lib/dummy-data.ts` reads with real queries against the schema in
   the Architecture doc (`books`, `story_pages`, `characters`, `credit_ledger`, etc.)
3. Swap `IllustrationPlaceholder` for real `image_url` values once the
   generation pipeline exists
4. Wire `UpgradeModal`'s `choose()` to a real Razorpay checkout session,
   and move the `setTier()` + `triggerCelebration()` call into the webhook
   handler's client-side confirmation instead of a `setTimeout`
