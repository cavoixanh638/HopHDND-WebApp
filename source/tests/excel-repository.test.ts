import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditEntry, Item, Patch, SaveResult } from '../shared/types';
import { DEFAULT_SHEET_URL, parseSheetConfig } from '../src/data/sheet-config';
import { googleCall } from '../src/data/google-bridge';
import { ExcelRepository } from '../src/data/excel-repository';

vi.mock('../src/data/google-bridge', () => ({ googleCall: vi.fn() }));
const call = vi.mocked(googleCall);

const item: Item = {
  recordId: 'source:row:4', displayCode: 'NQ1', stt: 1, documentKind: 'NQ',
  content: 'Nội dung cũ', department: 'Phòng A', type: 'NQ', partyLevel: '', progressParty: '',
  progressBuild: '', progressCouncil: '', specialist: '', room: '', vpLeader: '', ubndLeader: '',
  specificProgress: '', note: '', isDropped: false, archivedAt: null, revision: 0,
};
const snapshot = { items: [item], warnings: [], ignoredRows: 2 };
const repository = () => new ExcelRepository(parseSheetConfig(DEFAULT_SHEET_URL));

beforeEach(() => call.mockReset());

describe('ExcelRepository (Google bridge mocked)', () => {
  it('uses the frozen baseline code when a later read reuses the old row ID for another code',async()=>{
    const repo=repository();call.mockResolvedValueOnce(snapshot);await repo.list();
    const patch:Patch={recordId:item.recordId,sourceCode:item.displayCode,baseRevision:0,baseValues:{note:''},changes:{note:'new'},operationId:'frozen-code-001'};
    call.mockResolvedValueOnce({...snapshot,items:[{...item,displayCode:'NQ2'}]});await repo.list();
    call.mockResolvedValueOnce({results:[{recordId:item.recordId,ok:true,item:{...item,note:'new'}}]});await repo.save([patch]);
    expect(call).toHaveBeenLastCalledWith('saveDashboardData',{source:repo.config,records:[{recordId:patch.recordId,baseRevision:0,baseValues:patch.baseValues,changes:patch.changes,operationId:patch.operationId,code:'NQ1'}]});
    call.mockResolvedValueOnce([]);await repo.history(item.recordId,'NQ1');expect(call).toHaveBeenLastCalledWith('getDashboardHistory',{source:repo.config,code:'NQ1'});
  });
  it('is writable and draft-capable for a Google source, and validates snapshot structure', async () => {
    const repo = repository();
    expect(repo.sourceKind).toBe('google');
    expect(repo.readOnly).toBe(false);
    expect(repo.canDraft).toBe(true);
    call.mockResolvedValueOnce(snapshot);
    await expect(repo.list()).resolves.toEqual([item]);
    expect(call).toHaveBeenCalledWith('getDashboardData', repo.config);

    const malformed = repository();
    call.mockResolvedValueOnce({ ...snapshot, items: [{ ...item, content: null }] });
    await expect(malformed.list()).rejects.toThrow(/không đúng cấu trúc/);
  });

  it('sends the stable source code from the listed snapshot, not the local recordId alias', async () => {
    const repo = repository();
    call.mockResolvedValueOnce(snapshot);
    await repo.list();
    const patch: Patch = {
      recordId: item.recordId, baseRevision: item.revision,
      baseValues: { content: item.content }, changes: { content: 'Nội dung mới' }, operationId: 'operation-1',
    };
    const savedItem = { ...item, content: 'Nội dung mới', revision: 1 };
    const results: SaveResult[] = [{ recordId: item.recordId, ok: true, item: savedItem }];
    call.mockResolvedValueOnce({ results });
    await expect(repo.save([patch])).resolves.toEqual(results);
    expect(call).toHaveBeenLastCalledWith('saveDashboardData', {
      source: repo.config,
      records: [{ ...patch, code: 'NQ1' }],
    });
  });

  it('rejects malformed or lost save responses without retrying', async () => {
    const repo = repository();
    call.mockResolvedValueOnce(snapshot);
    await repo.list();
    const patch: Patch = { recordId: item.recordId, baseRevision: 0, baseValues: { content: item.content }, changes: { content: 'New' }, operationId: 'operation-2' };
    call.mockResolvedValueOnce({ results: [{ recordId: item.recordId, ok: true }] });
    await expect(repo.save([patch])).rejects.toThrow(/thiếu dữ liệu xác nhận/);
    expect(call).toHaveBeenCalledTimes(2);

    call.mockRejectedValueOnce(new Error('Kết quả ghi chưa được xác nhận; giữ phần sửa.'));
    await expect(repo.save([patch])).rejects.toThrow(/chưa được xác nhận/);
    expect(call).toHaveBeenCalledTimes(3);
  });

  it('parses JSON string save results and leaves malformed JSON unconfirmed', async () => {
    const repo = repository();
    call.mockResolvedValueOnce(snapshot);
    await repo.list();
    const patch: Patch = {
      recordId: item.recordId, baseRevision: 0,
      baseValues: { content: item.content }, changes: { content: 'Nội dung mới' },
      operationId: 'operation-json-1',
    };
    const results: SaveResult[] = [{
      recordId: item.recordId, ok: true,
      item: { ...item, content: 'Nội dung mới', revision: 1 },
    }];

    call.mockResolvedValueOnce(JSON.stringify({ results }));
    await expect(repo.save([patch])).resolves.toEqual(results);

    call.mockResolvedValueOnce('{malformed json');
    await expect(repo.save([patch])).rejects.toThrow(/chưa được xác nhận|JSON|phản hồi/i);
    expect(call).toHaveBeenCalledTimes(3);
  });

  it('loads history using the cached source code and validates its entries', async () => {
    const repo = repository();
    call.mockResolvedValueOnce(snapshot);
    await repo.list();
    const entries: AuditEntry[] = [{
      operationId: 'audit-1', recordId: item.recordId, at: '2026-10-15T00:00:00Z',
      changes: { content: 'mới' }, oldValues: { content: 'cũ' },
    }];
    call.mockResolvedValueOnce(entries);
    await expect(repo.history(item.recordId)).resolves.toEqual(entries);
    expect(call).toHaveBeenLastCalledWith('getDashboardHistory', { source: repo.config, code: 'NQ1' });

    call.mockResolvedValueOnce({ not: 'an array' });
    await expect(repo.history(item.recordId)).rejects.toThrow(/lịch sử dữ liệu hợp lệ/);
  });
});
