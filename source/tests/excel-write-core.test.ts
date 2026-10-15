import { describe, expect, it } from 'vitest';
import source from '../server/ExcelWriteCore.gs?raw';

type Cell = { value: string; formula: boolean; attrs: string; start: number; end: number; raw: string };
type Core = {
  sharedStrings: (xml: string) => string[];
  cells: (xml: string, strings?: string[]) => Record<string, Cell>;
  worksheetPath: (workbook: string, relationships: string, sheetName: string) => string;
  patchWorksheet: (xml: string, strings: string[], patches: { ref: string; expected: string; next: string }[]) => string;
  recordPatches: (xml: string, strings: string[], records: { code: string; baseValues: Record<string, string | boolean>; changes: Record<string, string | boolean> }[]) => { ref: string; expected: string; next: string }[];
};

const core = new Function(`${source}\n;return HDNDExcelWriteCore;`)() as Core;
const xml = {
  workbook: '<workbook><sheets><sheet name="Input" sheetId="1" r:id="rId1"/></sheets></workbook>',
  relationships: '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>',
  sheet: '<worksheet><sheetData><row r="4">'
    + '<c r="A4" s="1" t="inlineStr"><is><t>ID-4</t></is></c>'
    + '<c r="B4" s="2"><v>7</v></c>'
    + '<c r="C4" s="3" t="inlineStr"><is><t>cũ</t></is></c>'
    + '<c r="D4" s="4"><v>unchanged</v></c>'
    + '<c r="O4" s="15" t="inlineStr"><is><t>ghi chú cũ</t></is></c>'
    + '</row></sheetData></worksheet>',
  records: '<worksheet><sheetData>'
    + '<row r="1"><c r="C1" t="inlineStr"><is><t>Nội dung</t></is></c><c r="D1" t="inlineStr"><is><t>Số phòng</t></is></c></row>'
    + '<row r="4"><c r="A4" t="inlineStr"><is><t>OTHER</t></is></c><c r="C4" t="inlineStr"><is><t>không đổi</t></is></c><c r="O4" t="inlineStr"><is><t>ghi chú khác</t></is></c></row>'
    + '<row r="7"><c r="A7" t="inlineStr"><is><t>LEGACY-7</t></is></c><c r="C7" t="inlineStr"><is><t>Nội dung cũ</t></is></c><c r="D7" t="inlineStr"><is><t>Đơn vị X</t></is></c><c r="O7" t="inlineStr"><is><t>Ghi chú cũ</t></is></c><c r="P7" t="inlineStr"><is><t>X</t></is></c></row>'
    + '</sheetData></worksheet>',
};

describe('experimental Excel write core (inline XML fixtures only)', () => {
  it('reads shared strings and exposes cell values, formulas, attrs, offsets and raw XML', () => {
    const strings = core.sharedStrings('<sst><si><t>Xin chào</t></si><si><r><t>nhiều </t></r><r><t>đoạn</t></r></si></sst>');
    expect(strings).toEqual(['Xin chào', 'nhiều đoạn']);
    const parsed = core.cells('<row r="1"><c r="A1" s="2" t="s"><v>0</v></c><c r="B1"><f>1+2</f><v>3</v></c></row>', strings);
    expect(parsed.A1).toMatchObject({ value: 'Xin chào', formula: false, attrs: ' r="A1" s="2" t="s"', raw: '<c r="A1" s="2" t="s"><v>0</v></c>' });
    expect(parsed.B1).toMatchObject({ value: '3', formula: true, raw: '<c r="B1"><f>1+2</f><v>3</v></c>' });
    expect(parsed.A1.start).toBeGreaterThanOrEqual(0);
    expect(parsed.A1.end).toBe(parsed.A1.start + parsed.A1.raw.length);
  });

  it('patches C4 and O4 while retaining other cell XML and cell styles', () => {
    const result = core.patchWorksheet(xml.sheet, [], [
      { ref: 'C4', expected: 'cũ', next: 'mới' },
      { ref: 'O4', expected: 'ghi chú cũ', next: 'ghi chú mới' },
    ]);
    const parsed = core.cells(result);
    expect(parsed.C4.value).toBe('mới');
    expect(parsed.O4.value).toBe('ghi chú mới');
    expect(parsed.C4.attrs).toContain('s="3"');
    expect(parsed.O4.attrs).toContain('s="15"');
    expect(parsed.A4.raw).toBe(core.cells(xml.sheet).A4.raw);
    expect(parsed.B4.raw).toBe(core.cells(xml.sheet).B4.raw);
    expect(parsed.D4.raw).toBe(core.cells(xml.sheet).D4.raw);
  });

  it.each(['A4', 'B4'])('rejects writes to read-only ID/STT cell %s', ref => {
    expect(() => core.patchWorksheet(xml.sheet, [], [{ ref, expected: ref === 'A4' ? 'ID-4' : '7', next: 'x' }])).toThrow(/read-only/);
  });

  it('rejects formula cells, stale expected values, and duplicate patch targets', () => {
    const formulaSheet = '<worksheet><sheetData><row r="4"><c r="C4"><f>1+2</f><v>3</v></c></row></sheetData></worksheet>';
    expect(() => core.patchWorksheet(formulaSheet, [], [{ ref: 'C4', expected: '3', next: 'x' }])).toThrow(/Formula/);
    expect(() => core.patchWorksheet(xml.sheet, [], [{ ref: 'C4', expected: 'different', next: 'x' }])).toThrow(/conflict/);
    expect(() => core.patchWorksheet(xml.sheet, [], [
      { ref: 'C4', expected: 'cũ', next: 'first' },
      { ref: 'C4', expected: 'cũ', next: 'second' },
    ])).toThrow(/Duplicate patch/);
  });

  it('inserts new O4 and P4 cells in ascending column order', () => {
    const blankRow = '<worksheet><sheetData><row r="4"><c r="C4"><v>1</v></c><c r="N4"><v>2</v></c></row></sheetData></worksheet>';
    const result = core.patchWorksheet(blankRow, [], [
      { ref: 'P4', expected: '', next: 'P' },
      { ref: 'O4', expected: '', next: 'O' },
    ]);
    const row = result.match(/<row\b[^>]*>([\s\S]*?)<\/row>/)?.[1] ?? '';
    expect([...row.matchAll(/<c\b[^>]*\br="([A-Z]+4)"/g)].map(match => match[1])).toEqual(['C4', 'N4', 'O4', 'P4']);
    expect(core.cells(result).O4.value).toBe('O');
    expect(core.cells(result).P4.value).toBe('P');
  });

  it('inserts a blank O4 in row 4 without consuming preceding self-closing rows', () => {
    const withEmptyRows = '<worksheet><sheetData><row r="1"/><row r="2"/><row r="3"/><row r="4"><c r="A4"><v>42</v></c><c r="C4" t="inlineStr"><is><t>row four</t></is></c></row></sheetData></worksheet>';
    const result = core.patchWorksheet(withEmptyRows, [], [{ ref: 'O4', expected: '', next: 'new note' }]);
    expect(result).toContain('<row r="1"/><row r="2"/><row r="3"/>');
    expect(result.match(/<row r="2"\/>/g)).toHaveLength(1);
    expect(result.match(/<row r="3"\/>/g)).toHaveLength(1);
    const row4 = result.match(/<row r="4">([\s\S]*?)<\/row>/)?.[1] ?? '';
    expect(row4).toContain('<c r="O4" t="inlineStr"><is><t xml:space="preserve">new note</t></is></c>');
    expect(core.cells(result).O4.value).toBe('new note');
  });

  it('escapes XML text and keeps Vietnamese, emoji and leading equals literal', () => {
    const result = core.patchWorksheet(xml.sheet, [], [{ ref: 'C4', expected: 'cũ', next: 'Tiếng Việt 😀 < & =1+1' }]);
    expect(result).toContain('Tiếng Việt 😀 &lt; &amp; =1+1');
    expect(core.cells(result).C4).toMatchObject({ value: 'Tiếng Việt 😀 < & =1+1', formula: false });
  });

  it('stores a leading equals value as literal text and preserves carriage returns',()=>{const value='=1+1\r\nNội dung';const result=core.patchWorksheet(xml.sheet,[],[{ref:'C4',expected:'cũ',next:value}]);expect(result).toContain('&#13;');expect(core.cells(result).C4).toMatchObject({value,formula:false});});
  it('rejects illegal XML characters and malformed Unicode before emitting a patch',()=>{for(const next of ['bad\u0000','bad\ud800','bad\uffff'])expect(()=>core.patchWorksheet(xml.sheet,[],[{ref:'C4',expected:'cũ',next}])).toThrow();expect(()=>core.sharedStrings('<sst><si><t>&#0;</t></si></sst>')).toThrow();});

  it('rejects editing a non-anchor cell inside a merged range', () => {
    const merged = '<worksheet><sheetData><row r="4"><c r="C4"><v>anchor</v></c><c r="D4"><v>covered</v></c></row></sheetData><mergeCells><mergeCell ref="C4:D4"/></mergeCells></worksheet>';
    expect(() => core.patchWorksheet(merged, [], [{ ref: 'D4', expected: 'covered', next: 'x' }])).toThrow(/Merged non-anchor/);
  });

  it('resolves the worksheet relationship and rejects missing sheets or unsafe paths', () => {
    expect(core.worksheetPath(xml.workbook, xml.relationships, 'Input')).toBe('xl/worksheets/sheet1.xml');
    expect(() => core.worksheetPath(xml.workbook, xml.relationships, 'Missing')).toThrow(/unique/);
    const prefixed = '<Relationships xmlns:ns0="http://schemas.openxmlformats.org/package/2006/relationships"><ns0:Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>';
    expect(core.worksheetPath(xml.workbook, prefixed, 'Input')).toBe('xl/worksheets/sheet1.xml');
    const styles = '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"/></Relationships>';
    expect(() => core.worksheetPath(xml.workbook, styles, 'Input')).toThrow(/Invalid worksheet relationship/);
    const traversal = '<Relationships><Relationship Id="rId1" Target="../outside.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>';
    expect(() => core.worksheetPath(xml.workbook, traversal, 'Input')).toThrow(/Unsafe/);
  });

  it('locates a record by its unique legacy code after the header, independent of row position', () => {
    const patches = core.recordPatches(xml.records, [], [{ code: 'LEGACY-7', baseValues: { content: 'Nội dung cũ' }, changes: { content: 'Nội dung mới' } }]);
    expect(patches).toEqual([{ ref: 'C7', expected: 'Nội dung cũ', next: 'Nội dung mới' }]);
    const patched = core.patchWorksheet(xml.records, [], patches);
    expect(core.cells(patched).C7.value).toBe('Nội dung mới');
    expect(core.cells(patched).C4.raw).toBe(core.cells(xml.records).C4.raw);
  });

  it('updates only changed fields and rejects a stale semantic baseline', () => {
    const patches = core.recordPatches(xml.records, [], [{ code: 'LEGACY-7', baseValues: { note: 'Ghi chú cũ' }, changes: { note: 'Ghi chú mới' } }]);
    const result = core.patchWorksheet(xml.records, [], patches);
    expect(patches[0]).toMatchObject({ ref: 'O7', expected: 'Ghi chú cũ', next: 'Ghi chú mới' });
    expect(core.cells(result).C7.raw).toBe(core.cells(xml.records).C7.raw);
    expect(core.cells(result).D7.raw).toBe(core.cells(xml.records).D7.raw);
    expect(() => core.recordPatches(xml.records, [], [{ code: 'LEGACY-7', baseValues: { note: 'old value' }, changes: { note: 'new value' } }])).toThrow(/Record conflict/);
  });

  it('rejects missing or duplicate codes and ID, STT, or computed fields', () => {
    expect(() => core.recordPatches(xml.records, [], [{ code: 'MISSING', baseValues: { content: 'x' }, changes: { content: 'y' } }])).toThrow(/missing or duplicated/);
    expect(() => core.recordPatches(xml.records, [], [{ code: 'Nội dung', baseValues: { content: 'x' }, changes: { content: 'y' } }])).toThrow(/missing or duplicated/);
    const duplicateCode = xml.records.replace('</sheetData>', '<row r="8"><c r="A8" t="inlineStr"><is><t>LEGACY-7</t></is></c></row></sheetData>');
    expect(() => core.recordPatches(duplicateCode, [], [{ code: 'LEGACY-7', baseValues: { note: 'Ghi chú cũ' }, changes: { note: 'x' } }])).toThrow(/missing or duplicated/);
    for (const field of ['id', 'serialNumber', 'displayId']) {
      expect(() => core.recordPatches(xml.records, [], [{ code: 'LEGACY-7', baseValues: { [field]: 'x' }, changes: { [field]: 'y' } }])).toThrow(/not editable/);
    }
  });

  it('maps blank defaults and drop state semantically while retaining raw expected values', () => {
    const blankFields = xml.records
      .replace('<c r="C7" t="inlineStr"><is><t>Nội dung cũ</t></is></c>', '<c r="C7" t="inlineStr"><is><t></t></is></c>')
      .replace('<c r="D7" t="inlineStr"><is><t>Đơn vị X</t></is></c>', '<c r="D7" t="inlineStr"><is><t></t></is></c>')
      .replace('</row></sheetData>', '<c r="E7" t="inlineStr"><is><t> </t></is></c></row></sheetData>');
    const patches = core.recordPatches(blankFields, [], [{
      code: 'LEGACY-7',
      baseValues: { department: 'Chưa phân công', specialist: 'Chưa phân công', room: 'Chưa phân công', vpLeader: 'Chưa phân công', ubndLeader: 'Chưa phân công', content: '(Chưa có nội dung)', isDropped: true },
      changes: { department: 'Phòng mới', specialist: 'Người mới', room: 'Phòng mới', vpLeader: 'Lãnh đạo VP', ubndLeader: 'Lãnh đạo UBND', content: 'Nội dung bổ sung', isDropped: false },
    }]);
    expect(patches).toEqual([
      { ref: 'D7', expected: '', next: 'Phòng mới' },
      { ref: 'J7', expected: '', next: 'Người mới' },
      { ref: 'K7', expected: '', next: 'Phòng mới' },
      { ref: 'L7', expected: '', next: 'Lãnh đạo VP' },
      { ref: 'M7', expected: '', next: 'Lãnh đạo UBND' },
      { ref: 'C7', expected: '', next: 'Nội dung bổ sung' },
      { ref: 'P7', expected: 'X', next: '' },
    ]);
    expect(() => core.recordPatches(blankFields, [], [{ code: 'LEGACY-7', baseValues: {}, changes: { content: 'x' } }])).toThrow(/baseline missing/);
    expect(() => core.recordPatches(blankFields, [], [{ code: 'LEGACY-7', baseValues: { content: '(Chưa có nội dung)' }, changes: { content: '  ' } }])).toThrow(/Content is required/);
  });
});

