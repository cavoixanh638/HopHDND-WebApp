import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '../shared/types';
import { createDemoItems } from '../src/data/demo-items';
import { clearCheckpoint, readCheckpoint, writeCheckpoint } from '../src/data/draft-checkpoints';
import { readWorkspaceRecovery, validateRecovery } from '../src/data/workspace-recovery';
import { updateDraft } from '../src/domain/items';

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('workspace draft recovery', () => {
  it('binds a legacy checkpoint to its own original code and rejects mismatched code metadata',()=>{
    const item=createDemoItems(1)[0],patch=updateDraft(item,undefined,{note:'pending'})!;
    const {sourceCode:_code,...legacy}=patch;
    const recovered=validateRecovery({items:[item],drafts:{[item.recordId]:legacy}});
    expect(recovered.drafts[item.recordId].sourceCode).toBe(item.displayCode);expect(recovered.drafts[item.recordId].operationId).toBe(legacy.operationId);
    expect(()=>validateRecovery({items:[item],drafts:{[item.recordId]:{...patch,sourceCode:'wrong-code'}}})).toThrow(/không hợp lệ/);
  });
  it('recovers fixture edits only for the exact matching base and source', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const items = createDemoItems(4);
    const original = items[0];
    const patch = updateDraft(original, undefined, { note: 'MẪU: ghi chú đang sửa' })!;
    const bundle = { items, drafts: { [original.recordId]: patch } };
    expect(writeCheckpoint('data:fixture-a', { items, drafts: {} }, bundle)).toBe(true);
    const checkpoint = readCheckpoint('data:fixture-a', validateRecovery);
    expect(checkpoint?.base).toEqual({ items, drafts: {} });
    expect(checkpoint?.draft).toEqual(bundle);
    expect(readWorkspaceRecovery('fixture-a')).toEqual(bundle);
    expect(readWorkspaceRecovery('fixture-b')).toBeNull();

    const changedBase = structuredClone(items);
    changedBase[0].note = 'MẪU: bản gốc đã đổi';
    expect(JSON.stringify(changedBase) === JSON.stringify(items)).toBe(false);
    // Workspace initialization performs this exact-base comparison before installing recovered patches.
    expect(JSON.stringify(readWorkspaceRecovery('fixture-a')?.items) === JSON.stringify(changedBase)).toBe(false);
  });

  it('preserves patch operation ID and original field values in the recovery bundle', () => {
    const item = createDemoItems(1)[0];
    const patch = updateDraft(item, undefined, { note: 'MẪU: nội dung nháp' })!;
    const validated = validateRecovery({ items: [item], drafts: { [item.recordId]: patch } });
    expect(validated.drafts[item.recordId].operationId).toBe(patch.operationId);
    expect(validated.drafts[item.recordId].baseRevision).toBe(item.revision);
    expect(validated.drafts[item.recordId].baseValues).toEqual({ note: item.note });
    expect(validated.drafts[item.recordId].changes).toEqual({ note: 'MẪU: nội dung nháp' });
  });

  it('rejects mismatched base values and patches for unknown fixture items', () => {
    const item: Item = createDemoItems(1)[0];
    const patch = updateDraft(item, undefined, { note: 'MẪU: đổi' })!;
    expect(() => validateRecovery({ items: [{ ...item, note: 'MẪU: bản gốc khác' }], drafts: { [item.recordId]: patch } })).toThrow();
    expect(() => validateRecovery({ items: [item], drafts: { missing: { ...patch, recordId: 'missing' } } })).toThrow();
  });

  it('clearing removes only the selected fixture recovery checkpoint', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const items = createDemoItems(1);
    const bundle = { items, drafts: {} };
    writeCheckpoint('data:a', { items, drafts: {} }, bundle);
    writeCheckpoint('data:b', { items, drafts: {} }, bundle);
    clearCheckpoint('data:a');
    expect(readWorkspaceRecovery('a')).toBeNull();
    expect(readWorkspaceRecovery('b')).toEqual(bundle);
  });
});
