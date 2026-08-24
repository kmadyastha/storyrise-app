export const MAX_LENGTHS = {
  idea: 2000,
  description: 1000,
  narration: 1000,
  imageDescription: 1000,
} as const;

export class ValidationError extends Error {}

/**
 * Throws a clear, user-facing error for empty, oversized, or junk input.
 * This is a sanity/cost gate, not a content-safety layer — Claude's own
 * judgment is what actually decides whether a request is appropriate to
 * fulfil (see isLikelyRefusal below for how we detect that cleanly).
 */
export function validateAIInput(text: string, fieldName: string, maxLength: number) {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} can't be empty.`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} is too long (max ${maxLength} characters).`);
  }
  // Catches pure junk like "aaaaaaaaaaaaaaaaaaaa" or "........." without
  // trying to judge the actual content — that's Claude's job, not ours.
  const uniqueChars = new Set(trimmed.replace(/\s/g, "").toLowerCase()).size;
  if (trimmed.length > 15 && uniqueChars <= 2) {
    throw new ValidationError(`${fieldName} doesn't look like a real idea — try describing it in your own words.`);
  }
}

/**
 * Claude declining a request doesn't come back as an error — it comes back
 * as ordinary text that isn't the JSON we asked for. Without this, that
 * shows up to the user as a confusing "invalid JSON" failure. This gives a
 * much clearer signal so the route can surface the right message.
 */
export function isLikelyRefusal(raw: string): boolean {
  const text = raw.trim().toLowerCase();
  if (text.startsWith("{")) return false;
  const refusalPhrases = ["i can't", "i cannot", "i'm not able to", "i won't", "i'm unable to", "sorry, but"];
  return refusalPhrases.some((p) => text.startsWith(p) || text.includes(p));
}