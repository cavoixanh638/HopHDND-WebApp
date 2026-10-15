import type { AuditEntry, EditableField, Item, Patch, SaveResult } from '../../shared/types';
import type { Repository } from './repository';
import { validateChanges } from '../domain/items';

/** Repository thử: giữ trong bộ nhớ phiên, không gọi nguồn dữ liệu thật. */
export class MockRepository implements Repository {
  readonly sourceKind = 'demo' as const;
  private items: Item[];
  private audit: AuditEntry[] = [];
  private operations = new Map<string, { signature: string; result: SaveResult }>();
  constructor(seed: Item[]) { this.items = structuredClone(seed); }
  async list() { return structuredClone(this.items); }
  async history(recordId: string) { return structuredClone(this.audit.filter(a => a.recordId === recordId)); }
  async save(patches: Patch[]): Promise<SaveResult[]> {
    return patches.map(patch => {
      const signature = JSON.stringify(patch);
      const replay = this.operations.get(patch.operationId);
      if (replay) return replay.signature === signature ? structuredClone(replay.result) : { recordId: patch.recordId, ok: false, error: 'VALIDATION', message: 'Mã thao tác đã được dùng cho dữ liệu khác.' };
      const result = this.apply(patch);
      if (result.ok) this.operations.set(patch.operationId, { signature, result: structuredClone(result) });
      return result;
    });
  }
  private apply(patch: Patch): SaveResult {
    const index = this.items.findIndex(i => i.recordId === patch.recordId);
    if (index < 0) return { recordId: patch.recordId, ok: false, error: 'NOT_FOUND', message: 'Không tìm thấy nội dung.' };
    const current = this.items[index];
    const invalid = validateChanges(patch.changes);
    if (invalid) return { recordId: patch.recordId, ok: false, error: 'VALIDATION', message: invalid };
    const keys = Object.keys(patch.changes) as EditableField[];
    if (!keys.length || keys.some(key => !(key in patch.baseValues))) return { recordId: patch.recordId, ok: false, error: 'VALIDATION', message: 'Thiếu thay đổi hoặc giá trị gốc.' };
    if (patch.baseRevision !== current.revision || keys.some(key => patch.baseValues[key] !== current[key])) {
      return { recordId: patch.recordId, ok: false, error: 'CONFLICT', message: 'Dữ liệu gốc đã thay đổi. Bản nháp được giữ; hãy làm mới và đối chiếu.' };
    }
    const next: Item = { ...current, ...patch.changes, revision: current.revision + 1 };
    this.items[index] = next;
    this.audit.push({ operationId: patch.operationId, recordId: patch.recordId, at: new Date().toISOString(), changes: structuredClone(patch.changes), oldValues: structuredClone(patch.baseValues) });
    return { recordId: patch.recordId, ok: true, item: structuredClone(next) };
  }
}
