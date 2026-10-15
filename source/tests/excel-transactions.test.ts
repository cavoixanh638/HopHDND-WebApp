import { describe, expect, it } from 'vitest';
import source from '../server/ExcelTransactions.gs?raw';

type RecordPatch = { operationId: string; code: string; recordId: string; baseRevision: number; baseValues: Record<string, unknown>; changes: Record<string, unknown> };
type Receipt = { schemaVersion: number; source: unknown; fingerprint: string; records: RecordPatch[]; beforeHash: string; afterHash: string; backupId: string; phase: string; at: string; actor: string; results?: unknown[]; confirmedAt?: string };
type Engine = { save: (io: object, source: unknown, records: RecordPatch[]) => { results: unknown[] }; stable: (value: unknown) => string };

const engine = new Function(`${source}\n;return HDNDExcelTransactions;`)() as Engine;
const first: RecordPatch = {
  operationId: 'operation-001', code: 'NQ1', recordId: 'source:row:4', baseRevision: 0,
  baseValues: { content: 'old' }, changes: { content: 'new' },
};
const second: RecordPatch = {
  operationId: 'operation-002', code: 'NQ2', recordId: 'source:row:7', baseRevision: 0,
  baseValues: { note: '' }, changes: { note: 'checked' },
};
const sourceKey = { spreadsheetId: 'fake-sheet', gid: '123' };

function fakeIO(options: {
  afterHash?: string;
  readbackHash?: string;
  writeStatus?: number;
  writeThrows?: boolean;
  prepareThrows?: boolean;
  backupThrows?: boolean;
  storeReceiptThrows?: boolean;
  storeOperationThrows?: boolean;
} = {}) {
  const events: string[] = [];
  const receipts = new Map<string, Receipt>();
  const operations = new Map<string, string>();
  const before = { hash: 'hash-before', etag: 'etag-before', payload: 'original' };
  let current = { ...before };
  let writeCount = 0;
  let readCount = 0;
  let backupCount = 0;
  const cloned = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const io = {
    read() { events.push('read'); readCount++; return cloned(current); },
    prepare(input: typeof before, records: RecordPatch[]) {
      events.push('prepare');
      if (options.prepareThrows) throw new Error('baseline validation failed');
      expect(input.hash).toBe('hash-before');
      expect(records.length).toBeGreaterThan(0);
      return { hash: options.afterHash ?? 'hash-after', payload: 'prepared-workbook' };
    },
    backup(input: typeof before, key: string) {
      events.push('backup'); backupCount++;
      expect(input.hash).toBe('hash-before'); expect(key).toBeTruthy();
      if (options.backupThrows) throw new Error('backup unavailable');
      return 'backup-id-fake';
    },
    receipt(key: string) { events.push('receipt'); const value = receipts.get(key); return value ? cloned(value) : null; },
    storeReceipt(key: string, value: Receipt) {
      events.push(`storeReceipt:${value.phase}`);
      if (options.storeReceiptThrows) throw new Error('journal receipt unavailable');
      receipts.set(key, cloned(value));
    },
    operation(id: string) { events.push('operation'); return operations.get(id) ?? null; },
    storeOperation(id: string, key: string) {
      events.push('storeOperation');
      if (options.storeOperationThrows) throw new Error('operation journal unavailable');
      operations.set(id, key);
    },
    write(prepared: { hash: string; payload: string }, etag: string) {
      events.push('write'); writeCount++;
      expect(etag).toBe('etag-before'); expect(prepared.payload).toBe('prepared-workbook');
      if (options.writeThrows) { current = { ...before, hash: options.readbackHash ?? prepared.hash }; throw new Error('ambiguous transport failure'); }
      if (options.writeStatus === 412) return { status: 412 };
      if (options.writeStatus && options.writeStatus !== 200) return { status: options.writeStatus };
      current = { ...before, hash: options.readbackHash ?? prepared.hash, etag: 'etag-after', payload: prepared.payload };
      return { status: 200 };
    },
    confirm(readback: typeof before, records: RecordPatch[]) {
      events.push('confirm');
      return records.map(record => ({ recordId: record.recordId, ok: true, item: { recordId: record.recordId, source: readback.payload } }));
    },
    digest(value: string) { events.push('digest'); return `digest:${value}`; },
    now() { events.push('now'); return '2026-10-15T00:00:00.000Z'; },
    actor: 'fixture-test-user',
  };
  return { io, events, receipts, operations, counts: () => ({ writeCount, readCount, backupCount }), getCurrent: () => cloned(current) };
}

const save = (test: ReturnType<typeof fakeIO>, records: RecordPatch[] = [first]) => engine.save(test.io, sourceKey, records);

describe('ExcelTransactions pure orchestration (in-memory fake IO)', () => {
  it('backs up and journals a prepared receipt before PUT, then confirms exact readback', () => {
    const test = fakeIO();
    const result = save(test);
    expect(result.results).toHaveLength(1);
    expect(test.events.indexOf('backup')).toBeLessThan(test.events.indexOf('storeReceipt:prepared'));
    expect(test.events.indexOf('storeReceipt:prepared')).toBeLessThan(test.events.indexOf('storeOperation'));
    expect(test.events.indexOf('storeOperation')).toBeLessThan(test.events.indexOf('write'));
    expect(test.events.indexOf('write')).toBeLessThan(test.events.lastIndexOf('read'));
    expect(test.events.indexOf('confirm')).toBeGreaterThan(test.events.lastIndexOf('read'));
    expect(test.receipts.values().next().value).toMatchObject({ phase: 'committed', beforeHash: 'hash-before', afterHash: 'hash-after', backupId: 'backup-id-fake' });
    expect(test.counts()).toEqual({ writeCount: 1, readCount: 2, backupCount: 1 });
  });

  it('returns conflicts on HTTP 412 without confirming or overwriting', () => {
    const test = fakeIO({ writeStatus: 412 });
    const result = save(test);
    expect(result.results[0]).toMatchObject({ recordId: first.recordId, ok: false, error: 'CONFLICT' });
    expect(test.getCurrent()).toMatchObject({ hash: 'hash-before', etag: 'etag-before', payload: 'original' });
    expect(test.events).not.toContain('confirm');
    expect(test.receipts.values().next().value).toMatchObject({ phase: 'rejected' });
    expect(test.counts().writeCount).toBe(1);
  });

  it('resolves a lost write reply from the exact readback hash', () => {
    const test = fakeIO({ writeThrows: true });
    const result = save(test);
    expect(result.results[0]).toMatchObject({ recordId: first.recordId, ok: true });
    expect(test.receipts.values().next().value).toMatchObject({ phase: 'committed', afterHash: 'hash-after' });
    expect(test.counts().writeCount).toBe(1);
  });

  it('keeps a prepared receipt and never repeats a write when lost-reply readback differs', () => {
    const test = fakeIO({ writeThrows: true, readbackHash: 'different-hash' });
    expect(() => save(test)).toThrow(/Chưa xác định kết quả ghi Excel/);
    expect(test.receipts.values().next().value).toMatchObject({ phase: 'prepared', afterHash: 'hash-after' });
    expect(() => save(test)).toThrow(/Chưa xác định kết quả ghi Excel/);
    expect(test.counts().writeCount).toBe(1);
    expect(test.events).not.toContain('confirm');
  });

  it('replays a committed operation without another read, backup or write', () => {
    const test = fakeIO();
    const firstResult = save(test);
    const beforeReplay = test.counts();
    expect(save(test)).toEqual(firstResult);
    expect(test.counts()).toEqual(beforeReplay);
  });

  it('rejects changed payload for a committed operation and operation reuse in another batch', () => {
    const test = fakeIO();
    save(test);
    const changed = { ...first, changes: { content: 'different payload' } };
    expect(() => save(test, [changed])).toThrow(/được dùng cho nội dung khác/);
    expect(() => save(test, [first, second])).toThrow(/lần lưu chưa xử lý xong/);
    expect(test.counts().writeCount).toBe(1);
  });

  it('validates records before backup and leaves the source untouched', () => {
    const test = fakeIO({ prepareThrows: true });
    expect(() => save(test)).toThrow('baseline validation failed');
    expect(test.counts()).toEqual({ writeCount: 0, readCount: 1, backupCount: 0 });
    expect(test.events).not.toContain('storeReceipt:prepared');
    expect(test.events).not.toContain('write');
  });

  it.each([
    ['backup', { backupThrows: true }],
    ['receipt journal', { storeReceiptThrows: true }],
    ['operation journal', { storeOperationThrows: true }],
  ] as const)('does not write if the %s step fails', (_label, settings) => {
    const test = fakeIO(settings);
    expect(() => save(test)).toThrow();
    expect(test.counts().writeCount).toBe(0);
    expect(test.events).not.toContain('write');
  });

  it('does not acknowledge a successful HTTP write when readback hash mismatches', () => {
    const test = fakeIO({ readbackHash: 'mismatched-hash' });
    expect(() => save(test)).toThrow(/Chưa xác định kết quả ghi Excel/);
    expect(test.receipts.values().next().value).toMatchObject({ phase: 'prepared' });
    expect(test.events).not.toContain('confirm');
    expect(test.counts().writeCount).toBe(1);
  });

  it.each([
    ['empty batch', []],
    ['invalid operation id', [{ ...first, operationId: 'bad' }]],
    ['duplicate operation', [first, { ...second, operationId: first.operationId }]],
    ['duplicate code', [first, { ...second, code: first.code }]],
    ['duplicate record', [first, { ...second, recordId: first.recordId }]],
    ['nonzero base revision', [{ ...first, baseRevision: 1 }]],
  ])('rejects initial invalid records (%s) before any IO', (_label, records) => {
    const test = fakeIO();
    expect(() => save(test, records as RecordPatch[])).toThrow();
    expect(test.events).toEqual([]);
  });
});
