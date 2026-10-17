import * as XLSX from 'xlsx';
import { TEXT_FIELDS } from '../../shared/field-definitions';
import type { Item } from '../../shared/types';

const OLD_HEADERS = ['recordId', 'displayCode', 'stt', 'documentKind', ...TEXT_FIELDS.map(field => field.key), 'isDropped', 'archivedAt'] as const;
const HEADERS = ['recordId', 'displayCode', 'stt', 'documentKind', ...TEXT_FIELDS.map(field => field.key), 'partyMeeting', 'examined', 'isDropped', 'archivedAt'] as const;
const REQUIRED = new Set(['recordId', 'displayCode', 'stt', 'documentKind', 'content']);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;
const SAFE_ID = /^[A-Za-z0-9_-]{1,100}$/;

export function createExcel(items: Item[]): Uint8Array {
  if (items.length > MAX_ROWS) throw new Error('Tệp Excel không được vượt quá 1.000 dòng.');
  const ids = new Set<string>();
  const codes = new Set<string>();
  const rows = items.map(item => {
    validateItem(item);
    if (ids.has(item.recordId)) throw new Error(`recordId bị trùng: ${item.recordId}`);
    if (codes.has(item.displayCode)) throw new Error(`displayCode bị trùng: ${item.displayCode}`);
    ids.add(item.recordId);
    codes.add(item.displayCode);
    return HEADERS.map(key => item[key as keyof Item]??(key==='partyMeeting'||key==='examined'?'':null));
  });
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS as unknown as string[], ...rows]);
  // Explicit string cell types keep user text such as "=SUM(...)" from becoming formulas.
  for (const address of Object.keys(sheet)) {
    if (address.startsWith('!')) continue;
    const cell = sheet[address] as XLSX.CellObject;
    if (typeof cell.v === 'string') cell.t = 's';
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Data');
  const bytes = new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx', cellDates: false }) as ArrayBuffer);
  if (bytes.byteLength > MAX_BYTES) throw new Error('Tệp Excel không được vượt quá 5 MB.');
  return bytes;
}

export function readExcel(input: ArrayBuffer | Uint8Array): { items: Item[]; warnings: string[] } {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new Error('Tệp Excel phải có dữ liệu và không vượt quá 5 MB.');
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: 'array', cellFormula: true, cellDates: false });
  } catch {
    throw new Error('Không đọc được tệp Excel. Hãy chọn tệp .xlsx đã tải từ ứng dụng.');
  }
  const sheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames[0];
  const sheet = sheetName && workbook.Sheets[sheetName];
  if (!sheet) throw new Error('Tệp Excel không có trang tính dữ liệu.');
  const bounds=XLSX.utils.decode_range(sheet['!ref']??'A1');
  if(bounds.e.r>=MAX_ROWS+1||bounds.e.c>63)throw new Error('Vùng Excel vượt quá giới hạn 1.000 dòng hoặc 64 cột.');
  for (const [address, cell] of Object.entries(sheet)) {
    if (!address.startsWith('!') && (cell as XLSX.CellObject).f !== undefined) {
      throw new Error(`Không chấp nhận ô công thức (${address}).`);
    }
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null, blankrows: false });
  if (!rows.length) throw new Error('Trang tính Excel đang trống.');
  const headers = rows[0].map(value => typeof value === 'string' ? value : String(value ?? ''));
  const currentFormat=headers.length===HEADERS.length&&HEADERS.every((header,index)=>headers[index]===header);
  const legacyFormat=headers.length===OLD_HEADERS.length&&OLD_HEADERS.every((header,index)=>headers[index]===header);
  if(!currentFormat&&!legacyFormat){
    const known = new Set(HEADERS as readonly string[]);
    if (!headers.includes('recordId') || headers.some(header => !known.has(header))) {
      throw new Error('Định dạng Excel cũ hoặc không được hỗ trợ. Hãy tải mẫu Excel hiện tại rồi nhập dữ liệu vào mẫu đó.');
    }
    throw new Error('Tiêu đề cột không khớp mẫu Excel hiện tại. Hãy dùng tệp được tải từ ứng dụng.');
  }
  const activeHeaders=currentFormat?HEADERS:OLD_HEADERS;
  const dataRows = rows.slice(1).filter(row => row.some(value => value !== null && value !== ''));
  if (dataRows.length > MAX_ROWS) throw new Error('Tệp Excel không được vượt quá 1.000 dòng.');
  const ids = new Set<string>();
  const codes = new Set<string>();
  const items = dataRows.map((row, rowIndex) => {
    const values = Object.fromEntries(activeHeaders.map((key, index) => [key, row[index]])) as Record<string, unknown>;
    for (const key of REQUIRED) if (values[key] === null || values[key] === '') throw rowError(rowIndex, `${key} không được để trống.`);
    const recordId = values.recordId;
    const displayCode = values.displayCode;
    const stt = values.stt;
    const documentKind = values.documentKind;
    if (typeof recordId !== 'string' || !SAFE_ID.test(recordId)) throw rowError(rowIndex, 'recordId không hợp lệ.');
    if (ids.has(recordId)) throw rowError(rowIndex, `recordId bị trùng: ${recordId}`);
    if (typeof displayCode !== 'string' || !displayCode.trim()) throw rowError(rowIndex, 'displayCode không hợp lệ.');
    if (codes.has(displayCode)) throw rowError(rowIndex, `displayCode bị trùng: ${displayCode}`);
    if (typeof stt !== 'number' || !Number.isSafeInteger(stt) || stt < 1) throw rowError(rowIndex, 'stt phải là số nguyên dương.');
    if (documentKind !== 'NQ' && documentKind !== 'BC' && documentKind !== 'UNCLASSIFIED') throw rowError(rowIndex, 'documentKind không hợp lệ.');
    if (values.isDropped !== true && values.isDropped !== false) throw rowError(rowIndex, 'isDropped phải là TRUE hoặc FALSE.');
    const archivedAt = values.archivedAt;
    if (archivedAt !== null && archivedAt !== '' && typeof archivedAt !== 'string') throw rowError(rowIndex, 'archivedAt phải là chuỗi hoặc để trống.');
    const text: Record<string, string> = {};
    for (const field of TEXT_FIELDS) {
      const value = values[field.key];
      if (typeof value !== 'string') throw rowError(rowIndex, `${field.key} phải là văn bản.`);
      text[field.key] = value;
    }
    if (!(text.content ?? '').trim()) throw rowError(rowIndex, 'content không được để trống.');
    ids.add(recordId);
    codes.add(displayCode);
    const extra=(key:'partyMeeting'|'examined')=>{
      const value=values[key];
      if(value==null||value==='')return '';
      if(typeof value!=='string')throw rowError(rowIndex,`${key} phải là văn bản.`);
      return value;
    };
    return {recordId,displayCode,stt,documentKind,...text,partyMeeting:extra('partyMeeting'),
      examined:extra('examined'),isDropped:values.isDropped,
      archivedAt:archivedAt===null||archivedAt===''?null:archivedAt,revision:1} as Item;
  });
  return { items, warnings: [] };
}

function validateItem(item: Item): void {
  if (!item || typeof item.recordId !== 'string' || !SAFE_ID.test(item.recordId)) throw new Error('recordId không hợp lệ.');
  if (typeof item.displayCode !== 'string' || !item.displayCode.trim()) throw new Error('displayCode không hợp lệ.');
  if (!Number.isSafeInteger(item.stt) || item.stt < 1) throw new Error('stt phải là số nguyên dương.');
  if (!['NQ', 'BC', 'UNCLASSIFIED'].includes(item.documentKind)) throw new Error('documentKind không hợp lệ.');
  if (typeof item.isDropped !== 'boolean' || (item.archivedAt !== null && typeof item.archivedAt !== 'string')) throw new Error('Trạng thái Excel không hợp lệ.');
  for (const field of TEXT_FIELDS) if (typeof item[field.key] !== 'string') throw new Error(`${field.key} phải là văn bản.`);
  for (const key of ['partyMeeting','examined'] as const)
    if(item[key]!==undefined && typeof item[key]!=='string')throw new Error(`${key} phải là văn bản.`);
  if (!item.content.trim()) throw new Error('content không được để trống.');
}

function rowError(index: number, message: string): Error {
  return new Error(`Dòng Excel ${index + 2}: ${message}`);
}
