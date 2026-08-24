import { createAdminClient } from "@/lib/supabase/admin";

export type CreditOperation = "story" | "character_image" | "page_image" | "narration";

const CREDIT_COST: Record<CreditOperation, number> = {
  story: 1,
  character_image: 1,
  page_image: 1,
  narration: 1,
};

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
  isFreeTrial: boolean
): Promise<CheckResult> {
  if (isFreeTrial) {
    if (operation === "narration") {
      return { allowed: false, reason: "Narration isn't available on the free trial — upgrade to unlock it." };
    }
    return { allowed: true };
  }

  const cost = CREDIT_COST[operation];
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
export async function chargeCredits(userId: string, bookId: string, operation: CreditOperation, isFreeTrial: boolean) {
  if (isFreeTrial) return;

  const cost = CREDIT_COST[operation];
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