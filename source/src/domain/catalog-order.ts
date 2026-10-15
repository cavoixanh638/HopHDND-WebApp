/** Sort catalog values by their saved order, then alphabetically by Vietnamese locale. */
export function orderValues(values: string[], preferred: readonly string[]): string[] {
  return [...values].sort((a, b) => compareCatalogValues(a, b, preferred));
}

const vietnameseCollator = new Intl.Collator('vi', { sensitivity: 'variant', numeric: false });

/** Compare exact catalog values using a preferred order and deterministic Vietnamese fallback. */
export function compareCatalogValues(a: string, b: string, preferred: readonly string[]): number {
  const positions = new Map<string, number>();
  for (let index = 0; index < preferred.length; index += 1) {
    if (!positions.has(preferred[index])) positions.set(preferred[index], index);
  }

  const aPosition = positions.get(a);
  const bPosition = positions.get(b);
  if (aPosition !== undefined || bPosition !== undefined) {
    if (aPosition === undefined) return 1;
    if (bPosition === undefined) return -1;
    if (aPosition !== bPosition) return aPosition - bPosition;
  }

  const localeOrder = vietnameseCollator.compare(a, b);
  if (localeOrder !== 0) return localeOrder;
  // Intl.Collator may consider distinct strings equivalent; code point order breaks ties
  // without normalizing or merging accents, case, whitespace, or empty values.
  return a < b ? -1 : a > b ? 1 : 0;
}
