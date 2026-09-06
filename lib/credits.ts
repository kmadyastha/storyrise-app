import { createAdminClient } from "@/lib/supabase/admin";

export type CreditOperation = "story" | "character_image" | "page_image" | "narration" | "cover" | "kdp" | "etsy" | "video" | "audiobook_export";

const CREDIT_COST: Record<CreditOperation, number> = {
  story: 1,
  character_image: 1,
  page_image: 1,
  narration: 1,
  cover: 1,
  // KDP's real cost is page-count-tiered (9/17/20 — see lib/export/kdpSpec.ts
  // computeKdpCreditCost) and always passed as an explicit override below;
  // this default only matters if a caller ever forgets to pass one.
  kdp: 9,
  // Etsy digital export is a paid-tier feature but not a separately metered
  // one — same as pdf/pptx, it's included rather than charged per-export.
  etsy: 0,
  // Video/audiobook exports use real Fly.io machine compute time — unlike
  // pdf/pptx/etsy (which are just fast in-process rendering), these
  // genuinely cost something per export, scaling with page count for video
  // since ffmpeg encoding time scales with it. Always passed as an
  // explicit costOverride computed from real page count — see
  // computeVideoCreditCost below; these defaults only matter if a caller
  // ever forgets to pass one.
  video: 8,
  audiobook_export: 3,
};

/** Video encoding time scales with page count (each page is its own ffmpeg
 * pass); audiobook concat doesn't (stream-copy, no re-encoding), so it
 * stays a flat cost regardless of length. */
export function computeVideoCreditCost(pageCount: number): number {
  return Math.min(20, Math.max(6, Math.ceil(pageCount / 2)));
}

export const AUDIOBOOK_EXPORT_COST = CREDIT_COST.audiobook_export;

interface CheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Cheap read-only check — call this BEFORE doing the expensive AI work, so
 * someone with no credits (or on free trial trying narration) never causes
 * a real API call in the first place.
 */
export async function precheckCredits(
  userId: string,
  operation: CreditOperation,
  isFreeTrial: boolean,
  costOverride?: number
): Promise<CheckResult> {
  if (isFreeTrial) {
    if (operation === "narration") {
      return { allowed: false, reason: "Narration isn't available on the free trial — upgrade to unlock it." };
    }
    return { allowed: true };
  }

  const cost = costOverride ?? CREDIT_COST[operation];
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();
  const balance = profile?.credits ?? 0;

  if (balance < cost) {
    return {
      allowed: false,
      reason: `This costs ${cost} credit${cost > 1 ? "s" : ""} — you have ${balance}. Upgrade or top up to continue.`,
    };
  }
  return { allowed: true };
}

/**
 * Actually deducts credits and logs the spend — call this ONLY after the AI
 * call has genuinely succeeded and produced something usable. Free-trial
 * operations are a no-op here (nothing to deduct).
 */
export async function chargeCredits(
  userId: string,
  bookId: string,
  operation: CreditOperation,
  isFreeTrial: boolean,
  costOverride?: number
) {
  if (isFreeTrial) return;

  const cost = costOverride ?? CREDIT_COST[operation];
  if (cost === 0) return;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();
  const balance = profile?.credits ?? 0;
  const newBalance = Math.max(0, balance - cost);

  await admin.from("profiles").update({ credits: newBalance }).eq("id", userId);
  await admin.from("credit_ledger").insert({
    user_id: userId,
    book_id: bookId,
    amount: -cost,
    reason: operation,
  });
}