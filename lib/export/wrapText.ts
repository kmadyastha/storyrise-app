/** Greedy word-wrap: splits `text` into lines that each fit within
 * `maxWidth`, using `measureWidth` to measure a candidate line. Works with
 * any font-measuring function (e.g. `font.widthOfTextAtSize`), not just
 * pdf-lib, so it isn't coupled to pdf-lib's types. */
export function wrapText(text: string, maxWidth: number, measureWidth: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureWidth(candidate) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}