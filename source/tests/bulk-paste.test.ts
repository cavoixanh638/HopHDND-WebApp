import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {BULK_PASTE_COLUMNS,parseExcelClipboard,planBulkPaste} from '../src/features/items/bulk-paste';

describe('bulk Excel clipboard import without file upload',()=>{
  it('reads a single column with CRLF and preserves a quoted multiline field',()=>{
    expect(parseExcelClipboard('Tên A\r\n"Tên B\nBổ sung"\r\nTên C\r\n'))
      .toEqual([['Tên A'],['Tên B\nBổ sung'],['Tên C']]);
  });
  it('reads TSV matrices with quotes and embedded delimiters',()=>{
    expect(parseExcelClipboard('"Nội dung\tđặc biệt"\t"Sở ""A"""\r\nViệc B\tSở B'))
      .toEqual([['Nội dung\tđặc biệt','Sở "A"'],['Việc B','Sở B']]);
  });
  it('maps columns C:D and multiple rows, never shifts UI merged cells',()=>{
    const rows=createDemoItems(5);
    const plan=planBulkPaste({rows,startRecordId:rows[1].recordId,startField:'content',
      text:'Nội dung thay thế 1\tSở mẫu A\r\nNội dung thay thế 2\tSở mẫu B'});
    expect(plan.rowsCovered).toBe(2);expect(plan.columnsCovered).toBe(2);
    expect(plan.patches.map(p=>p.recordId)).toEqual([rows[1].recordId,rows[2].recordId]);
    expect(plan.patches[0].changes).toMatchObject({content:'Nội dung thay thế 1',department:'Sở mẫu A'});
    expect(BULK_PASTE_COLUMNS[0].letter).toBe('C');
  });
  it('treats empty copied cells as leave existing source unchanged',()=>{
    const rows=createDemoItems(3);
    const plan=planBulkPaste({rows,startRecordId:rows[0].recordId,startField:'content',
      text:'Nội dung 1\t\r\nNội dung 2\tSở mới'});
    expect(plan.cells.some(c=>c.code===rows[0].displayCode&&c.field==='department')).toBe(false);
    expect(plan.patches).toHaveLength(2);
  });
  it('rejects overflow, forbidden cells, bad status and unauthorized changes atomically',()=>{
    const rows=createDemoItems(2);
    const base={rows,startRecordId:rows[0].recordId};
    expect(()=>planBulkPaste({...base,startField:'content',text:'1\n2\n3'})).toThrow('dài hơn');
    expect(()=>planBulkPaste({...base,startField:'note',text:'ghi chú\tqua cột O'})).toThrow('vượt cột O');
    expect(()=>planBulkPaste({...base,startField:'progressCouncil',text:'Trạng thái bịa'})).toThrow('không nằm');
    expect(()=>planBulkPaste({...base,startField:'content',text:'Tên mới',canEdit:()=>false})).toThrow('Không có quyền');
  });
  it('never evaluates formulas and limits unbounded pastes',()=>{
    const rows=createDemoItems(2);
    expect(()=>planBulkPaste({rows,startRecordId:rows[0].recordId,startField:'content',text:'=SUM(A1:A2)'})).toThrow('công thức');
    expect(()=>parseExcelClipboard('x'.repeat(500001))).toThrow('500.000');
    expect(()=>parseExcelClipboard('"incomplete')).toThrow('chưa đóng');
  });
});
