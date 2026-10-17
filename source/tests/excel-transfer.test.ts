import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { Item } from '../shared/types';
import { createExcel, readExcel } from '../src/data/excel-transfer';

const item = (recordId: string, displayCode: string, isDropped = false): Item => ({
  recordId, displayCode, stt: 1, documentKind: 'NQ', content: 'Nội dung tiếng Việt', department: 'Sở Tài chính',
  type: 'Nghị quyết', partyLevel: '', progressParty: '', progressBuild: '', progressCouncil: '', specialist: 'Nguyễn An',
  room: '', vpLeader: '', ubndLeader: '', specificProgress: 'Đã hoàn thành', note: '=SUM(A1:A2)',
  isDropped, archivedAt: null, revision: 9,
});

describe('Excel transfer', () => {
  it('round-trips canonical rows, Unicode, checkbox and string-looking formula text', () => {
    const source = [item('row_1', 'NQ01'), item('row_2', 'BC02', true), item('row-3', 'NQ03')];
    const result = readExcel(createExcel(source));
    expect(result.warnings).toEqual([]);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ recordId: 'row_1', content: 'Nội dung tiếng Việt', department: 'Sở Tài chính', revision: 1 });
    expect(result.items[1].isDropped).toBe(true);
    expect(result.items[0].note).toBe('=SUM(A1:A2)');
  });

  it('preserves the newly imported P/Q values through a full XLSX export and re-import',()=>{
    const source=item('row_4','NQ04');
    source.partyMeeting='Đã xin ý kiến Thành ủy';
    source.examined='Đã thẩm tra';
    const output=readExcel(createExcel([source]));
    expect(output.items[0]).toMatchObject({
      partyMeeting:'Đã xin ý kiến Thành ủy',examined:'Đã thẩm tra',note:'=SUM(A1:A2)',
    });
    const book=XLSX.read(createExcel([source]),{type:'array'});
    const heads=(XLSX.utils.sheet_to_json<unknown[]>(book.Sheets.Data,{header:1})[0]??[]);
    expect(heads).toContain('partyMeeting');
    expect(heads).toContain('examined');
  });

  it('still reads the prior 16-field app export without P/Q and defaults those to empty',()=>{
    const headers=['recordId','displayCode','stt','documentKind','content','department','type',
      'partyLevel','progressParty','progressBuild','progressCouncil','specialist','room',
      'vpLeader','ubndLeader','specificProgress','note','isDropped','archivedAt'];
    const row=['row_old','NQ09',1,'NQ','MẪU: Nghị quyết','','','','','','','','','','','','Ghi chú cũ',false,null];
    const book=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([headers,row]),'Data');
    const bytes=XLSX.write(book,{type:'array',bookType:'xlsx'}) as Uint8Array;
    expect(readExcel(bytes).items[0]).toMatchObject({partyMeeting:'',examined:'',note:'Ghi chú cũ'});
  });
  it('rejects duplicate record IDs', () => {
    expect(() => createExcel([item('same', 'NQ01'), item('same', 'NQ02')])).toThrow(/recordId bị trùng/);
  });

  it('rejects formula cells on import', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['recordId', 'displayCode', 'stt', 'documentKind', 'content', 'department', 'type', 'partyLevel', 'progressParty', 'progressBuild', 'progressCouncil', 'specialist', 'room', 'vpLeader', 'ubndLeader', 'specificProgress', 'note', 'isDropped', 'archivedAt'],
      ['r1', 'NQ01', 1, 'NQ', 'Nội dung', '', '', '', '', '', '', '', '', '', '', '', '', false, null],
    ]);
    sheet.E2 = { t: 'n', f: '1+1', v: 2 };
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Data');
    const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
    expect(() => readExcel(bytes)).toThrow(/Không chấp nhận ô công thức/);
  });
});
