import type { Item } from '../../shared/types';
import { normalizeSearch } from '../domain/search';

export interface SheetSnapshot { items: Item[]; warnings: string[]; ignoredRows: number }
type Cell = { v?: unknown; f?: unknown } | null;
const text = (cell: Cell | undefined): string => {
  const value = cell?.v ?? cell?.f;
  return value == null ? '' : String(value).trim();
};
export function parseGvizPayload(payload: unknown, source: string): SheetSnapshot {
  if (!payload || typeof payload !== 'object') throw new Error('Nguồn không trả về dữ liệu Sheets hợp lệ.');
  const response = payload as { status?: string; errors?: { reason?: string; message?: string }[]; table?: { cols?: unknown[]; rows?: { c?: Cell[] }[] } };
  if (response.status !== 'ok') throw new Error(`Không đọc được Sheets: ${response.errors?.[0]?.message ?? response.errors?.[0]?.reason ?? 'kiểm tra quyền đọc và gid.'}`);
  const rows = response.table?.rows;
  if (!Array.isArray(rows) || !Array.isArray(response.table?.cols) || response.table.cols.length < 15) {
    throw new Error('Trang tính cần có ít nhất 15 cột theo cấu trúc A–O của Dashboard.');
  }
  const headerIndex = rows.slice(0, 10).findIndex(row => {
    const cells = row.c;
    return Array.isArray(cells) && normalizeSearch(text(cells[2])).includes('noi dung') && normalizeSearch(text(cells[3])).includes('so');
  });
  if (headerIndex < 0) throw new Error('Không nhận diện được tiêu đề Nội dung trình / Sở, ngành ở cột C/D. Hãy kiểm tra đúng trang tính và cấu trúc A–O.');
  // The live spreadsheet changed on 17/10/2026: A–O only, O=Ghi chú.
  // Older snapshots had A–R (O=Rút, P=Họp TU, Q=Thẩm tra, R=Ghi chú)
  // or a 16-column O=Ghi chú/P=Trình-Rút legacy export.
  // Detect the version by header values, not by range width alone.
  const headerCells=rows[headerIndex].c ?? [];
  const header=(index:number)=>normalizeSearch(text(headerCells[index]));
  const modernSource=(header(14).includes('rut') && header(17).includes('ghi chu')) ||
    (header(17).includes('ghi chu') && header(15).includes('hop'));
  const current15=header(14).includes('ghi chu')&&!header(15);
  const legacySource=(header(14).includes('ghi chu')&&!!header(15)) ||
    (header(15).includes('rut')&&!header(17).includes('ghi chu'));
  if(!modernSource&&!legacySource&&!current15)
    throw new Error('Chưa xác định được cột Ghi chú của Excel. Trang hiện tại phải có cột O = Ghi chú.');
  // Prevent a wrong gid / shifted Excel sheet from silently producing blank
  // E, F, G or N while showing a seemingly successful data load.
  if(modernSource||current15){
    const mandatory:[number,string,string][]=[
      [4,'Loại văn bản','loai vb'],
      [5,'Cấp Thành ủy cho ý kiến','cap'],
      [6,'Tiến độ xin ý kiến Thành ủy','tien do xin y kien'],
      [7,'Tiến độ trình HĐND xây dựng NQ','trinh hdnd'],
      [8,'Tiến độ trình HĐND ban hành NQ','trinh hdnd'],
      [13,'Tiến độ hiện tại','tien do hien tai'],
    ];
    for(const [index,label,keyword] of mandatory){
      if(!header(index).includes(keyword)||(index===5&&!header(index).includes('y kien')))
        throw new Error(`Trang Excel không khớp: cột ${String.fromCharCode(65+index)} phải là "${label}". Hãy kiểm tra đúng trang tính (gid) và hàng tiêu đề.`);
    }
  }
  const sourceColumns=modernSource?18:current15?15:16;
  const items: Item[] = [], warnings: string[] = [];
  const usedCodes = new Set<string>();
  let ignoredRows = headerIndex + 1;
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    if (!Array.isArray(row.c)) throw new Error('Có dòng dữ liệu không hợp lệ; giữ nguyên bản đọc trước.');
    const rowNumber = headerIndex + offset + 2;
    const cells = row.c;
    const values = Array.from({ length: sourceColumns }, (_, index) => text(cells[index]));
    const [code, ordinal, content] = values;
    const subheader = !code && !ordinal && !content && values.slice(5, 9).some(v => /cap cho y kien|tien do xin y kien|trinh xay dung|trinh ban hanh/.test(normalizeSearch(v)));
    const blank = values.every(value => !value);
    const group = !code && /^[IVXLCDM]+\.?$/i.test(ordinal) && !!content;
    if (blank || subheader || group) { ignoredRows++; return; }
    if (!code && !ordinal && !content) { ignoredRows++; warnings.push(`Dòng ${rowNumber}: có ghi chú nhưng không có nội dung/mã; chưa đưa vào danh mục.`); return; }
    if (!code) warnings.push(`Dòng ${rowNumber}: thiếu mã nội dung; chỉ đọc theo vị trí, cần mã ổn định trước khi hỗ trợ ghi.`);
    if (code && usedCodes.has(code)) warnings.push(`Dòng ${rowNumber}: trùng mã ${code}; vẫn giữ cả hai dòng.`);
    usedCodes.add(code);
    if (!content) warnings.push(`Dòng ${rowNumber}: chưa có nội dung trình.`);
    const rawType = normalizeSearch(values[4]);
    const bcType = rawType === 'bc' || rawType.includes('bao cao');
    const nqType = rawType === 'hc' || rawType === 'hanh chinh' || rawType === 'qppl' || rawType === 'nq';
    const codeBc = /^BC/i.test(code), codeNq = /^(ID|NQ)/i.test(code);
    let kind: Item['documentKind'] = 'UNCLASSIFIED';
    if ((bcType && codeNq) || (nqType && codeBc)) warnings.push(`Dòng ${rowNumber}: mã và loại văn bản mâu thuẫn; chưa phân loại NQ/BC.`);
    else if (bcType || codeBc) kind = 'BC';
    else if (nqType || codeNq) kind = 'NQ';
    else warnings.push(`Dòng ${rowNumber}: chưa nhận diện loại nội dung NQ/BC.`);
    const drop = current15?'':normalizeSearch(values[modernSource?14:15]);
    const note = values[modernSource?17:14];
    const isDropped=!current15&&['rut','da rut','x','true','1','co','khong trinh nua'].includes(drop);
    items.push({
      recordId: `${source}:row:${rowNumber}`, displayCode: code || `Dòng ${rowNumber} (thiếu mã)`,
      stt: Number(ordinal) || rowNumber - headerIndex - 1, documentKind: kind,
      content, department: values[3], type: values[4],
      partyLevel: values[5], progressParty: values[6], progressBuild: values[7], progressCouncil: values[8],
      specialist: values[9], room: values[10],
      vpLeader: values[11], ubndLeader: values[12],
      specificProgress: values[13], note,
      partyMeeting: modernSource?values[15]:'',
      examined: modernSource?values[16]:'',
      isDropped, archivedAt: null, revision: 0,
    });
  });
  return { items, warnings, ignoredRows };
}
