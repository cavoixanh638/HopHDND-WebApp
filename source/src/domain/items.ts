import type { Changes, EditableField, Item, Patch } from '../../shared/types';
import { TEXT_FIELDS } from '../../shared/field-definitions';

export const EDITABLE_FIELDS: EditableField[] = [...TEXT_FIELDS.map(f => f.key), 'isDropped', 'documentKind'];
export function validateChanges(changes: Changes): string | null {
  for (const [key, value] of Object.entries(changes)) {
    if (!EDITABLE_FIELDS.includes(key as EditableField)) return `Trường không được phép sửa: ${key}`;
    if (key === 'isDropped') { if (typeof value !== 'boolean') return 'Trạng thái rút phải là đúng/sai.'; }
    else if (key === 'documentKind') { if (!['NQ', 'BC', 'UNCLASSIFIED'].includes(String(value))) return 'Loại nội dung không hợp lệ.'; }
    else if (typeof value !== 'string' || value.length > 20000) return `Giá trị không hợp lệ: ${key}`;
    if (key === 'content' && typeof value === 'string' && !value.trim()) return 'Nội dung trình không được để trống.';
  }
  return null;
}
export function updateDraft(item: Item, previous: Patch | undefined, changes: Changes): Patch | undefined {
  const merged: Changes = { ...(previous?.changes ?? {}), ...changes };
  const base: Changes = { ...(previous?.baseValues ?? {}) };
  for (const key of Object.keys(merged) as EditableField[]) {
    if (!(key in base)) Object.assign(base, { [key]: item[key] });
    if (merged[key] === base[key]) { delete merged[key]; delete base[key]; }
  }
  if (!Object.keys(merged).length) return undefined;
  return { recordId: item.recordId, sourceCode: previous?.sourceCode??item.displayCode, baseRevision: previous?.baseRevision ?? item.revision, baseValues: base, changes: merged, operationId: crypto.randomUUID() };
}
