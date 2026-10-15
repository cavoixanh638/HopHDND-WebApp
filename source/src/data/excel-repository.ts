import type { AuditEntry, Changes, EditableField, Item, Patch, SaveResult } from '../../shared/types';
import { TEXT_FIELDS } from '../../shared/field-definitions';
import type { Repository } from './repository';
import { googleCall } from './google-bridge';
import { parseSheetConfig, type SheetConfig } from './sheet-config';
import type { SheetSnapshot } from './gviz-parser';

const DOCUMENT_KINDS = ['NQ', 'BC', 'UNCLASSIFIED'] as const;
const SAVE_ERRORS = ['CONFLICT', 'VALIDATION', 'NOT_FOUND'] as const;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const safeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

function validateItem(value: unknown, label: string): Item {
  if (!isObject(value)
    || !nonEmpty(value.recordId)
    || !nonEmpty(value.displayCode)
    || !safeInteger(value.stt) || value.stt < 0
    || !safeInteger(value.revision) || value.revision < 0
    || !DOCUMENT_KINDS.includes(value.documentKind as typeof DOCUMENT_KINDS[number])
    || typeof value.isDropped !== 'boolean'
    || (value.archivedAt !== undefined && value.archivedAt !== null && typeof value.archivedAt !== 'string')
    || TEXT_FIELDS.some(field => typeof value[field.key] !== 'string')) {
    throw new Error(`${label} không đúng cấu trúc dữ liệu Excel.`);
  }
  return { ...value, archivedAt: value.archivedAt ?? null } as Item;
}

function validateSnapshot(value: unknown): SheetSnapshot {
  if (!isObject(value) || !Array.isArray(value.items) || !Array.isArray(value.warnings)
    || value.warnings.some(warning => typeof warning !== 'string')
    || !safeInteger(value.ignoredRows) || value.ignoredRows < 0) {
    throw new Error('Google không trả snapshot dữ liệu Excel hợp lệ.');
  }
  const ids = new Set<string>();
  const items = value.items.map((item, index) => {
    const validated = validateItem(item, `Dòng dữ liệu ${index + 1}`);
    if (ids.has(validated.recordId)) throw new Error('Google trả mã recordId bị trùng trong dữ liệu Excel.');
    ids.add(validated.recordId);
    return validated;
  });
  return { items, warnings: value.warnings as string[], ignoredRows: value.ignoredRows };
}

function validateChanges(value: unknown, label: string): Changes {
  if (!isObject(value)) throw new Error(`${label} không hợp lệ.`);
  const editable = new Set<EditableField>([...TEXT_FIELDS.map(field => field.key), 'documentKind', 'isDropped']);
  const result: Changes = {};
  for (const [field, fieldValue] of Object.entries(value)) {
    if (!editable.has(field as EditableField)) throw new Error(`${label} chứa trường không hợp lệ.`);
    if (field === 'isDropped') {
      if (typeof fieldValue !== 'boolean') throw new Error(`${label} chứa trạng thái không hợp lệ.`);
    } else if (field === 'documentKind') {
      if (!DOCUMENT_KINDS.includes(fieldValue as typeof DOCUMENT_KINDS[number])) throw new Error(`${label} chứa loại nội dung không hợp lệ.`);
    } else if (typeof fieldValue !== 'string') throw new Error(`${label} chứa giá trị không hợp lệ.`);
    Object.assign(result, { [field]: fieldValue });
  }
  return result;
}

function validateSaveResults(value: unknown): SaveResult[] {
  // Apps Script's RPC serializer can reject an otherwise valid nested result.
  // The save endpoint returns an explicit JSON string across that boundary.
  if (typeof value === 'string') {
    try { value = JSON.parse(value); }
    catch { throw new Error('Phản hồi lưu Excel không đọc được; giữ phần sửa để đối chiếu với file nguồn.'); }
  }
  if (!isObject(value) || !Array.isArray(value.results)) throw new Error('Phản hồi lưu dữ liệu Excel không hợp lệ; phần sửa trên máy vẫn được giữ.');
  return value.results.map((result, index) => {
    if (!isObject(result) || !nonEmpty(result.recordId) || typeof result.ok !== 'boolean'
      || (result.error !== undefined && !SAVE_ERRORS.includes(result.error as typeof SAVE_ERRORS[number]))
      || (result.message !== undefined && typeof result.message !== 'string')) {
      throw new Error(`Kết quả lưu dòng ${index + 1} không hợp lệ; phần sửa trên máy vẫn được giữ.`);
    }
    const item = result.item === undefined ? undefined : validateItem(result.item, `Kết quả dòng ${index + 1}`);
    if (result.ok && (!item || item.recordId !== result.recordId)) throw new Error(`Kết quả lưu dòng ${index + 1} thiếu dữ liệu xác nhận; phần sửa trên máy vẫn được giữ.`);
    return { recordId: result.recordId, ok: result.ok, ...(item ? { item } : {}), ...(result.error ? { error: result.error as SaveResult['error'] } : {}), ...(typeof result.message === 'string' ? { message: result.message } : {}) };
  });
}

function validateHistory(value: unknown): AuditEntry[] {
  if (!Array.isArray(value)) throw new Error('Google không trả lịch sử dữ liệu hợp lệ.');
  return value.map((entry, index) => {
    if (!isObject(entry) || !nonEmpty(entry.operationId) || !nonEmpty(entry.recordId) || !nonEmpty(entry.at)) {
      throw new Error(`Mục lịch sử ${index + 1} không hợp lệ.`);
    }
    return {
      operationId: entry.operationId,
      recordId: entry.recordId,
      at: entry.at,
      changes: validateChanges(entry.changes, `Thay đổi lịch sử ${index + 1}`),
      oldValues: validateChanges(entry.oldValues, `Giá trị cũ lịch sử ${index + 1}`),
    };
  });
}

export class ExcelRepository implements Repository {
  readonly sourceKind = 'google' as const;
  readonly readOnly = false;
  readonly canDraft = true;
  private snapshot: SheetSnapshot | null = null;
  readonly config: SheetConfig;
  get warnings():readonly string[]{return this.snapshot?.warnings??[];}

  constructor(config: SheetConfig) {
    const canonical = parseSheetConfig(config.url, config.gid);
    if (canonical.spreadsheetId !== config.spreadsheetId) throw new Error('Thông tin file nguồn không khớp link Google Sheets.');
    this.config = canonical;
  }

  async list(): Promise<Item[]> {
    const snapshot = validateSnapshot(await googleCall('getDashboardData', this.config));
    this.snapshot = snapshot;
    return snapshot.items;
  }

  async save(patches: Patch[]): Promise<SaveResult[]> {
    if (!Array.isArray(patches) || !patches.length) return [];
    if (!this.snapshot) throw new Error('Hãy đọc dữ liệu Excel trước khi lưu. Phần sửa trên máy vẫn được giữ.');
    const requestPatches = patches.map(patch => {
      const item = this.snapshot!.items.find(candidate => candidate.recordId === patch.recordId);
      const code=patch.sourceCode??item?.displayCode;
      if (!code) throw new Error(`Không tìm thấy mã nguồn của ${patch.recordId} trong lần đọc hiện tại. Phần sửa trên máy vẫn được giữ.`);
      const {sourceCode:_localCode,...wirePatch}=patch;
      return { ...wirePatch, code };
    });
    return validateSaveResults(await googleCall('saveDashboardData', { source: this.config, records: requestPatches }));
  }

  async history(recordId: string,sourceCode?:string): Promise<AuditEntry[]> {
    const item = this.snapshot?.items.find(candidate => candidate.recordId === recordId);
    const code=sourceCode??item?.displayCode;
    if (!code) throw new Error('Hãy đọc lại dữ liệu Excel trước khi mở lịch sử.');
    return validateHistory(await googleCall('getDashboardHistory', { source: this.config, code }));
  }
}
