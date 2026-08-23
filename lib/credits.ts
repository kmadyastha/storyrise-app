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
 * The single gate every paid AI route must pass through before doing the
 * expensive work. Reads the user's REAL balance from the database (never
 * trusts anything the client claims), and — for paid tier — deducts credits
 * and logs the spend atomically-enough for our purposes before returning.
 *
 * Free-trial books get story/character/page generation at no charge (already
 * bounded server-side by the free-trial page/format limits enforced via a DB
 * trigger on the books table) but narration is paid-only, matching what the
 * UI has always said.
 */
export async function checkAndChargeCredits(
  userId: string,
  bookId: string,
  operation: CreditOperation,
  isFreeTrial: boolean
): Promise<CheckResult> {
  const admin = createAdminClient();

  if (isFreeTrial) {
    if (operation === "narration") {
      return { allowed: false, reason: "Narration isn't available on the free trial — upgrade to unlock it." };
    }
    return { allowed: true };
  }

  const cost = CREDIT_COST[operation];
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();

  const balance = profile?.credits ?? 0;
  if (balance < cost) {
    return { allowed: false, reason: `This costs ${cost} credit${cost > 1 ? "s" : ""} — you have ${balance}. Upgrade or top up to continue.` };
  }

  const newBalance = balance - cost;
  await admin.from("profiles").update({ credits: newBalance }).eq("id", userId);
  await admin.from("credit_ledger").insert({
    user_id: userId,
    book_id: bookId,
    amount: -cost,
    reason: operation,
  });

  return { allowed: true };
}