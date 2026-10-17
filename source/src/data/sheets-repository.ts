import type { Item, AuditEntry, Patch, SaveResult } from '../../shared/types';
import type { Repository } from './repository';
import type { SheetConfig } from './sheet-config';
import { parseSheetConfig } from './sheet-config';
import { parseGvizPayload, type SheetSnapshot } from './gviz-parser';

/** JSONP chỉ từ docs.google.com đã kiểm tra, không nhận URL script tùy ý. */
export function readSheet(config: SheetConfig, timeoutMs = 15000): Promise<SheetSnapshot> {
  const validated = parseSheetConfig(config.url, config.gid);
  return new Promise((resolve, reject) => {
    const callback = `hdnd_gviz_${crypto.randomUUID().replaceAll('-', '')}`;
    const scope = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let settled = false;
    const cleanup = () => { clearTimeout(timer); script.remove(); delete scope[callback]; };
    const finish = (error?: Error, snapshot?: SheetSnapshot) => {
      if (settled) return;
      settled = true; cleanup();
      if (error) reject(error); else resolve(snapshot!);
    };
    const timer = window.setTimeout(() => finish(new Error('Sheets chưa trả dữ liệu sau 15 giây. Kiểm tra mạng, quyền đọc hoặc định dạng Google Trang tính.')), timeoutMs);
    scope[callback] = (payload: unknown) => {
      try { finish(undefined, parseGvizPayload(payload, `${validated.spreadsheetId}:${validated.gid}`)); }
      catch (error) { finish(error instanceof Error ? error : new Error('Dữ liệu không hợp lệ.')); }
    };
    const params = new URLSearchParams({ tqx: `out:json;responseHandler:${callback}`, gid: validated.gid, headers: '0', range: 'A:O', cb: String(Date.now()) });
    script.src = `https://docs.google.com/spreadsheets/d/${validated.spreadsheetId}/gviz/tq?${params}`;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => finish(new Error('Không tải được Sheets. Link chia sẻ HTML và quyền đọc bảng là hai quyền riêng; app chưa hỗ trợ OAuth cho bảng riêng tư.'));
    document.head.append(script);
  });
}
export class SheetsRepository implements Repository {
  readonly sourceKind = 'google' as const;
  readonly readOnly = true;
  readonly canDraft = true;
  private pending: Promise<SheetSnapshot> | null = null;
  snapshot: SheetSnapshot | null = null;
  private seeded: boolean;
  constructor(readonly config: SheetConfig, seed?: SheetSnapshot) { this.snapshot = seed ?? null; this.seeded = !!seed; }
  async list(): Promise<Item[]> {
    if (this.seeded) { this.seeded = false; return this.snapshot!.items; }
    this.pending ??= readSheet(this.config);
    try { this.snapshot = await this.pending; return this.snapshot.items; }
    finally { this.pending = null; }
  }
  async save(_patches: Patch[]): Promise<SaveResult[]> { throw new Error('Chưa bật lưu vào file Excel nguồn. Phần sửa trên máy vẫn được giữ; file nguồn chưa thay đổi.'); }
  async history(_recordId: string): Promise<AuditEntry[]> { return []; }
}
