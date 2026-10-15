import { describe, expect, it } from 'vitest';
import { reorderByKey } from '../src/domain/reorder-columns';

describe('reorderByKey', () => {
  const keyOf = (column: { key: string }) => column.key;

  it('moves a keyed column to the target position and retains hidden columns in the array', () => {
    const columns = [
      { key: 'visible-a', visible: true },
      { key: 'hidden-x', visible: false },
      { key: 'visible-b', visible: true },
      { key: 'hidden-y', visible: false },
      { key: 'visible-c', visible: true },
    ];

    expect(reorderByKey(columns, keyOf, 'visible-c', 'visible-a')).toEqual([
      { key: 'visible-c', visible: true },
      { key: 'visible-a', visible: true },
      { key: 'hidden-x', visible: false },
      { key: 'visible-b', visible: true },
      { key: 'hidden-y', visible: false },
    ]);
    expect(columns.map(column => column.key)).toEqual(['visible-a', 'hidden-x', 'visible-b', 'hidden-y', 'visible-c']);
  });

  it('returns a copy without changing order when a key is missing or already at the target', () => {
    const columns = [{ key: 'a' }, { key: 'b' }];
    expect(reorderByKey(columns, keyOf, 'missing', 'b')).toEqual(columns);
    expect(reorderByKey(columns, keyOf, 'a', 'missing')).toEqual(columns);
    expect(reorderByKey(columns, keyOf, 'a', 'a')).toEqual(columns);
    expect(reorderByKey(columns, keyOf, 'a', 'b')).not.toBe(columns);
  });
});
