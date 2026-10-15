/** Move the item identified by fromKey to the position of toKey, preserving all other items. */
export function reorderByKey<T, K>(
  items: readonly T[],
  keyOf: (item: T) => K,
  fromKey: K,
  toKey: K,
): T[] {
  const fromIndex = items.findIndex(item => keyOf(item) === fromKey);
  const toIndex = items.findIndex(item => keyOf(item) === toKey);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [...items];

  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}
