import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCheckpoint, readCheckpoint, writeCheckpoint, layoutRecoveryScope } from '../src/data/draft-checkpoints';
import { defaultItemLayout, validateItemLayout } from '../src/data/item-preferences';
import { validateItemDraft } from '../src/data/item-draft';
import { defaultReportLayout, validateReportLayout } from '../src/data/report-preferences';
import { validateReportDraft } from '../src/data/report-draft';

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('draft checkpoints', () => {
  it('isolates preview recovery keys from production and from older previews', () => {
    const base='items:source';
    expect(layoutRecoveryScope(base,'/HopHDND-WebApp/')).toBe(base);
    expect(layoutRecoveryScope(base,'/HopHDND-WebApp/preview/pr-3-ui-v7/')).toBe('preview:pr-3-ui-v7:'+base);
    expect(layoutRecoveryScope(base,'/HopHDND-WebApp/preview/current/')).toBe('preview:current:'+base);
    expect(layoutRecoveryScope(base,'/HopHDND-WebApp/preview/current/')).not.toBe(layoutRecoveryScope(base,'/HopHDND-WebApp/preview/pr-3-ui-v7/'));
  });

  it('round trips base and draft separately, then clears the stored checkpoint', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const base = { value: 'saved' };
    const draft = { value: 'editing' };
    expect(writeCheckpoint('unit', base, draft)).toBe(true);
    expect(readCheckpoint('unit', value => value as typeof base)).toMatchObject({ base, draft, schemaVersion: 1 });
    clearCheckpoint('unit');
    expect(readCheckpoint('unit', value => value as typeof base)).toBeNull();
  });

  it('reports blocked storage and ignores corrupt checkpoint data', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} });
    expect(writeCheckpoint('blocked', {}, {})).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => '{broken', setItem: () => {}, removeItem: () => {} });
    expect(readCheckpoint('corrupt', value => value)).toBeNull();
  });

  it('recovers an unfinished report name while strict apply validation still rejects it', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const base = defaultReportLayout();
    const draft = base.map((row, index) => index === 0 ? { ...row, title: '' } : row);
    expect(writeCheckpoint('report', base, draft)).toBe(true);
    expect(readCheckpoint('report', validateReportDraft)?.draft[0].title).toBe('');
    expect(() => validateReportLayout(draft)).toThrow();
  });

  it('recovers unfinished item widths including zero and all-hidden columns, while strict validation rejects them', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const base = defaultItemLayout();
    const draft = { tableWidth: 0, columns: base.columns.map(column => ({ ...column, width: 0, visible: false })) };
    expect(writeCheckpoint('items', base, draft)).toBe(true);
    const recovered = readCheckpoint('items', validateItemDraft)?.draft;
    expect(recovered?.tableWidth).toBe(0);
    expect(recovered?.columns.every(column => column.width === 0 && !column.visible)).toBe(true);
    expect(() => validateItemLayout(draft)).toThrow();
  });
});
