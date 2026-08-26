import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_SECONDS = 60;

// Generous enough that no real person doing real book-creation ever notices —
// this exists to stop a script or a stuck retry loop, not to ration normal use.
const ROUTE_LIMITS: Record<string, number> = {
  "generate-story": 8,
  "generate-character-image": 15,
  "generate-page-image": 40,
  "generate-narration": 40,
  "generate-cover": 15,
  "export-pdf": 10,
  "export-pptx": 10,
  "export-kdp": 6,
  "export-etsy": 10,
  "export-video-narrated": 3,
  "export-video-silent": 3,
  "export-audiobook": 5,
  "export-flipbook": 10,
  "preview-voice": 15,
};

export async function checkRateLimit(
  userId: string,
  route: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const limit = ROUTE_LIMITS[route] ?? 10;
  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  try {
    // Opportunistic cleanup — keeps the table bounded without needing a
    // separate cron job. Cheap since it's scoped to this one user+route.
    await admin.from("rate_limit_events").delete().eq("user_id", userId).eq("route", route).lt("created_at", since);

    const { count } = await admin
      .from("rate_limit_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("route", route)
      .gte("created_at", since);

    if ((count ?? 0) >= limit) {
      return { allowed: false, retryAfterSeconds: WINDOW_SECONDS };
    }

    await admin.from("rate_limit_events").insert({ user_id: userId, route });
    return { allowed: true };
  } catch {
    // If the rate-limit check itself can't run, fail open rather than
    // blocking every real request on an infrastructure hiccup — the credit
    // check downstream is the actual financial gate, not this one.
    return { allowed: true };
  }
}