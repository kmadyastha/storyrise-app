// Real Amazon KDP print specifications for a full-color ("Premium Color")
// paperback interior — this product is an illustrated children's book,
// color throughout, so the color-interior formula is the correct one to use
// here (KDP publishes a different, thinner formula for black-and-white).

/** Bleed KDP requires on every outer trim edge where art extends to the
 * edge of the page (top, bottom, and the outer edge — not the spine side). */
export const KDP_BLEED_IN = 0.125;

/** Keep all text at least this far inside the trim edge. More generous than
 * KDP's bare minimum gutter/margin requirements (which vary by page count) —
 * a fixed, simple safe margin is a deliberate simplification so every page
 * count uses the same layout math instead of a sliding scale. */
export const KDP_TEXT_SAFE_MARGIN_IN = 0.5;

/** Matches the "24 — KDP Print Minimum" preset already offered in the
 * create-flow page-count picker. The exportOptions entry for "kdp" used to
 * say 15 here, which didn't match that already-locked business rule — fixed
 * as part of this phase, not a new decision. */
export const KDP_MIN_PAGES = 24;

/** Real KDP requirement: leave a clean 2" × 1.2" white area in the
 * bottom-right corner of the back cover if you want Amazon to place its own
 * generated barcode there (rather than supplying your own barcode image). */
export const KDP_BARCODE_BOX_IN = { width: 2, height: 1.2 };

const SPINE_IN_PER_PAGE_PREMIUM_COLOR = 0.002347;

/** Real KDP spine-width formula for Premium Color interiors: page count ×
 * 0.002347". (KDP's white-paper formula is 0.002252/page, cream is
 * 0.0025/page — those apply to black-and-white interiors, not this book.) */
export function computeSpineWidthIn(pageCount: number): number {
  return Math.round(pageCount * SPINE_IN_PER_PAGE_PREMIUM_COLOR * 1000) / 1000;
}

export interface CoverSpreadDimensions {
  spineWidthIn: number;
  fullWidthIn: number;
  fullHeightIn: number;
}

/** Full wrap-cover dimensions (back cover + spine + front cover, laid flat)
 * per KDP's published cover-template formula. */
export function computeCoverSpread(trimWidthIn: number, trimHeightIn: number, pageCount: number): CoverSpreadDimensions {
  const spineWidthIn = computeSpineWidthIn(pageCount);
  const fullWidthIn = trimWidthIn * 2 + spineWidthIn + KDP_BLEED_IN * 2;
  const fullHeightIn = trimHeightIn + KDP_BLEED_IN * 2;
  return { spineWidthIn, fullWidthIn, fullHeightIn };
}

/** Locked pricing from the V1 PRD: 9 credits up to 20 pages, 17 for 21-40,
 * 20 for 41-50. This is charged separately from the 1-credit cover-save
 * flow (Phase 2's CoverDrawer) — "cover priced separately" per that rule. */
export function computeKdpCreditCost(pageCount: number): number {
  if (pageCount <= 20) return 9;
  if (pageCount <= 40) return 17;
  return 20;
}