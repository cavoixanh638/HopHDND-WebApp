import type { Item, Patch } from '../../shared/types';
import { TEXT_FIELDS } from '../../shared/field-definitions';
import { validateChanges } from '../domain/items';
import { readCheckpoint } from './draft-checkpoints';
export interface WorkspaceRecovery { items: Item[]; drafts: Record<string, Patch> }
export function validateRecovery(value: unknown): WorkspaceRecovery {
  if (!value || typeof value !== 'object') throw new Error('Nháp không hợp lệ.');
  const bundle = value as WorkspaceRecovery;
  if (!Array.isArray(bundle.items) || !bundle.drafts || typeof bundle.drafts !== 'object' || Array.isArray(bundle.drafts)) throw new Error('Nháp không hợp lệ.');
  const ids = new Set<string>();
  for (const item of bundle.items) {
    if (!item || typeof item.recordId !== 'string' || ids.has(item.recordId) || typeof item.displayCode !== 'string' || !Number.isInteger(item.stt) || !Number.isInteger(item.revision) || !['NQ','BC','UNCLASSIFIED'].includes(item.documentKind) || typeof item.isDropped !== 'boolean' || (item.archivedAt !== null && typeof item.archivedAt !== 'string') || TEXT_FIELDS.some(field => typeof item[field.key] !== 'string')) throw new Error('Bản gốc của nháp không hợp lệ.');
    ids.add(item.recordId);
  }
  for (const [id, patch] of Object.entries(bundle.drafts)) {
    const item = bundle.items.find(row => row.recordId === id);
    if (!item || patch.recordId !== id || patch.sourceCode!==undefined&&patch.sourceCode!==item.displayCode || patch.baseRevision !== item.revision || typeof patch.operationId !== 'string' || !patch.baseValues || !patch.changes || !Object.keys(patch.changes).length || validateChanges(patch.changes)) throw new Error('Thay đổi nháp không hợp lệ.');
    for (const field of Object.keys(patch.changes) as (keyof typeof patch.changes)[]) if (!(field in patch.baseValues) || patch.baseValues[field] !== item[field]) throw new Error('Nháp không khớp bản gốc.');
  }
  const recovered=structuredClone(bundle);
  for(const [id,patch] of Object.entries(recovered.drafts))patch.sourceCode??=recovered.items.find(item=>item.recordId===id)!.displayCode;
  return recovered;
}
export function readWorkspaceRecovery(source: string): WorkspaceRecovery | null { return readCheckpoint(`data:${source}`, validateRecovery)?.draft ?? null; }
