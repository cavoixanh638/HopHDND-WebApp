import { describe, expect, it } from 'vitest';
import { parseGvizPayload } from '../src/data/gviz-parser';

type Cell = { v?: unknown; f?: unknown } | null;
type Row = { c: Cell[] };

const cols = Array.from({ length: 16 }, (_, index) => ({ id: String.fromCharCode(65 + index), label: '' }));
const header = (): Row => ({ c: [null, null, { v: 'Nội dung trình' }, { v: 'Sở, ngành' }, ...Array<Cell>(12).fill(null)] });
const row = (values: unknown[], formats: Record<number, unknown> = {}): Row => ({
  c: values.map((value, index) => value === null && !(index in formats) ? null : {
    ...(index in formats ? { v: value, f: formats[index] } : { v: value }),
  }),
});
const payload = (rows: Row[], status = 'ok', columns: unknown[] = cols) => ({
  status,
  table: { cols: columns, rows },
});
const values = (code: string, ordinal: number, content: string, department: string, type: string, dropped = '') => [
  code, ordinal, content, department, type, 'BTV', 'Đã báo cáo TU', 'Trình xây dựng NQ', 'Sở chưa trình',
  'Chuyên viên giả', 'Phòng giả', 'Lãnh đạo giả VP', 'Lãnh đạo giả UBND', 'MẪU: bước 1', 'MẪU: ghi chú', dropped,
];

describe('parseGvizPayload', () => {
  it('skips a merged two-row header and status subheader, then maps NQ and BC rows', () => {
    const mergedHeader = header();
    const subheader = row(['', '', '', '', '', 'Cấp cho ý kiến', 'Tiến độ xin ý kiến', 'Trình xây dựng', 'Trình ban hành']);
    const result = parseGvizPayload(payload([
      mergedHeader,
      subheader,
      row(values('NQ-001', 1, 'MẪU: Nghị quyết chính sách.', 'Sở giả A', 'QPPL')),
      row(values('BC-002', 2, 'MẪU: Báo cáo kết quả.', 'Sở giả B', 'Báo cáo', 'Không trình nữa')),
    ]), 'test-sheet');

    expect(result.items).toHaveLength(2);
    expect(result.ignoredRows).toBe(2);
    expect(result.items.map(item => item.documentKind)).toEqual(['NQ', 'BC']);
    expect(result.items[1]).toMatchObject({
      content: 'MẪU: Báo cáo kết quả.',
      department: 'Sở giả B',
      type: 'Báo cáo',
      isDropped: true,
    });
  });

  it('keeps missing and duplicate codes with unique source row IDs and warns', () => {
    const result = parseGvizPayload(payload([
      header(),
      row(values('', 1, 'MẪU: thiếu mã.', 'Sở giả A', 'HC')),
      row(values('NQ-003', 2, 'MẪU: bản thứ nhất.', 'Sở giả A', 'QPPL')),
      row(values('NQ-003', 3, 'MẪU: bản thứ hai.', 'Sở giả A', 'QPPL')),
    ]), 'sheet-x');

    expect(result.items).toHaveLength(3);
    expect(result.items.map(item => item.recordId)).toEqual(['sheet-x:row:2', 'sheet-x:row:3', 'sheet-x:row:4']);
    expect(new Set(result.items.map(item => item.recordId)).size).toBe(3);
    expect(result.items[0].displayCode).toContain('thiếu mã');
    expect(result.warnings.join('\n')).toContain('thiếu mã nội dung');
    expect(result.warnings.join('\n')).toContain('trùng mã NQ-003');
  });

  it('uses UNCLASSIFIED and warns when the document type conflicts with the code', () => {
    const result = parseGvizPayload(payload([
      header(),
      row(values('BC-004', 4, 'MẪU: loại văn bản không khớp.', 'Sở giả C', 'HC')),
      row(values('ID-005', 5, 'MẪU: mã ID nhưng khai báo báo cáo.', 'Sở giả D', 'Báo cáo')),
    ]), 'sheet-y');

    expect(result.items.map(item => item.documentKind)).toEqual(['UNCLASSIFIED', 'UNCLASSIFIED']);
    expect(result.warnings.filter(warning => warning.includes('mã và loại văn bản mâu thuẫn'))).toHaveLength(2);
  });

  it('uses formatted cell text when value is null and pads short row arrays', () => {
    const result = parseGvizPayload(payload([
      header(),
      row(['NQ-005', 5, 'MẪU: đọc theo định dạng.', null], { 3: 'Sở giả D' }),
    ]), 'sheet-z');
    expect(result.items[0].department).toBe('Sở giả D');
    expect(result.items[0].documentKind).toBe('NQ');
    expect(result.items[0].note).toBe('');
    expect(result.items[0].isDropped).toBe(false);
  });

  it('preserves truly blank Sheet cells without inventing assignment or content text', () => {
    const input=values('', 9, '', '', 'QPPL');
    input[9]='';input[10]='';input[11]='';input[12]='';input[14]='';
    const result=parseGvizPayload(payload([header(),row(input)]),'blank-sheet');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({content:'',department:'',specialist:'',room:'',vpLeader:'',ubndLeader:'',note:''});
    expect(result.items[0].displayCode).toContain('thiếu mã');
    expect(result.warnings.join(' ')).toContain('thiếu mã');
  });

  it('returns no items when the sheet contains a header and no data rows', () => {
    expect(parseGvizPayload(payload([header()]), 'empty-sheet').items).toEqual([]);
  });

  it('does not mistake a data content beginning with NỘI DUNG for a header', () => {
    const result = parseGvizPayload(payload([
      header(),
      row(values('', 7, 'NỘI DUNG MẪU: dòng dữ liệu không có mã.', 'Sở giả E', 'QPPL')),
    ]), 'content-sheet');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].content).toBe('NỘI DUNG MẪU: dòng dữ liệu không có mã.');
  });

  it('rejects a bad header, too few columns, or an error status', () => {
    expect(() => parseGvizPayload(payload([row(['', '', 'Tên nội dung', 'Cơ quan'])]), 'bad-header')).toThrow(/không nhận diện/i);
    expect(() => parseGvizPayload(payload([header()], 'ok', cols.slice(0, 15)), 'short-sheet')).toThrow(/16 cột/i);
    expect(() => parseGvizPayload(payload([], 'error'), 'denied')).toThrow(/Không đọc được Sheets/i);
  });
});
