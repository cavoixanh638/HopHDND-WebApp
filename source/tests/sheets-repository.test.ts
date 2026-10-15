import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSheet, SheetsRepository } from '../src/data/sheets-repository';
import { parseSheetConfig, DEFAULT_SHEET_URL } from '../src/data/sheet-config';
import { createDemoItems } from '../src/data/demo-items';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function setup() {
  const scope: Record<string, unknown> = { setTimeout: globalThis.setTimeout };
  const script = { src: '', referrerPolicy: '', onerror: () => {}, remove: vi.fn() };
  const append = vi.fn();
  vi.stubGlobal('window', scope);
  vi.stubGlobal('document', { createElement: () => script, head: { append } });
  return { scope, script, append };
}
describe('Kết nối Sheets chỉ đọc', () => {
  it('timeout xóa script/callback; không báo dữ liệu giả là thành công', async () => {
    vi.useFakeTimers();
    const { scope, script, append } = setup();
    const promise = readSheet(parseSheetConfig(DEFAULT_SHEET_URL), 10);
    const rejected = expect(promise).rejects.toThrow('chưa trả dữ liệu');
    expect(script.src).toMatch(/^https:\/\/docs.google.com\/spreadsheets\/d\//);
    expect(append).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10);
    await rejected;
    expect(script.remove).toHaveBeenCalledOnce();
    expect(Object.keys(scope)).toEqual(['setTimeout']);
  });
  it('lỗi script dọn callback và thông báo quyền đọc', async () => {
    const { scope, script } = setup();
    const promise = readSheet(parseSheetConfig(DEFAULT_SHEET_URL));
    const rejected = expect(promise).rejects.toThrow('quyền đọc');
    script.onerror();
    await rejected;
    expect(Object.keys(scope)).toEqual(['setTimeout']);
    expect(script.remove).toHaveBeenCalledOnce();
  });
  it('callback trả dữ liệu lỗi không được coi là kết nối thành công', async () => {
    const { scope, script } = setup();
    const promise = readSheet(parseSheetConfig(DEFAULT_SHEET_URL));
    const rejected = expect(promise).rejects.toThrow('denied');
    const callback = new URL(script.src).searchParams.get('tqx')!.split('responseHandler:')[1];
    (scope[callback] as (data: unknown) => void)({ status: 'error', errors: [{ message: 'denied' }] });
    await rejected;
    expect(script.remove).toHaveBeenCalledOnce();
  });
  it('repo nguồn thật chặn ghi; seed đã kiểm tra không gọi lại mạng ngay', async () => {
    const seed = { items: createDemoItems(1), warnings: [], ignoredRows: 0 };
    const repo = new SheetsRepository(parseSheetConfig(DEFAULT_SHEET_URL), seed);
    expect(repo.readOnly).toBe(true);expect(repo.canDraft).toBe(true);
    expect(await repo.list()).toEqual(seed.items);
    await expect(repo.save([])).rejects.toThrow('Chưa bật lưu vào file Excel nguồn');
  });
});
