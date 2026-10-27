import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {assertTransitionBaseline,planTransitionImport,readTransitionalExcel} from '../src/data/transition-import';
import {createExcel} from '../src/data/excel-transfer';

const base=()=>createDemoItems(3).map((row,i)=>({...row,revision:i+1}));
describe('Manual Sheets and Excel transition import preview',()=>{
  it('matches displayCode, never transient Sheet position ID, no Firebase mutation',()=>{
    const firebase=base(),before=JSON.stringify(firebase);
    const sheet=firebase.map((row,i)=>({...row,recordId:'sheet:gid:row:'+(i+10)}));
    sheet[0].note='Dữ liệu cập nhật';
    const plan=planTransitionImport(sheet,firebase);
    expect(plan.matches).toBe(3);expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0].recordId).toBe(firebase[0].recordId);
    expect(plan.changes[0].fields).toEqual(['note']);expect(JSON.stringify(firebase)).toBe(before);
  });
  it('rejects duplicated source code or missing display code',()=>{
    const current=base();
    expect(()=>planTransitionImport([{...current[0],recordId:'s1'},{...current[0],recordId:'s2'}],current)).toThrow(/trùng mã/);
    expect(()=>planTransitionImport([{...current[0],displayCode:'Dòng 7 (thiếu mã)'}],current)).toThrow(/thiếu mã/);
    expect(()=>planTransitionImport(current,[])).toThrow(/chưa có hồ sơ/);
  });
  it('does not clear existing values when Sheet source has blanks',()=>{
    const current=base().map((row,i)=>({...row,note:i===0?'Ghi chú Firebase':row.note}));
    const source=[{...current[0],recordId:'s1',note:'',content:'Bản nội dung mới'}];
    const plan=planTransitionImport(source,current);
    expect(plan.changes[0].fields).toEqual(['content']);
    expect(plan.skippedBlankCells).toBeGreaterThan(0);
  });
  it('refuses stale baseline if any other edit was server-ACKed',()=>{
    const rows=base();
    const plan=planTransitionImport([{...rows[0],note:'Mới'}],rows);
    expect(()=>assertTransitionBaseline(plan.changes[0],{...rows[0],revision:rows[0].revision+1})).toThrow(/đã thay đổi/);
    expect(()=>assertTransitionBaseline(plan.changes[0],rows[0])).not.toThrow();
  });
  it('never creates unknown rows or deletes rows missing from source',()=>{
    const rows=base();
    const plan=planTransitionImport([{...rows[0],note:'Đổi'},{...rows[1],recordId:'unknown',displayCode:'NEW-100'}],rows);
    expect(plan.matches).toBe(1);expect(plan.unmatchedCodes).toEqual(['NEW-100']);expect(plan.changes).toHaveLength(1);
  });
  it('accepts the original WebApp .xlsx export format',()=>{
    const rows=base(),file=createExcel(rows);
    const parsed=readTransitionalExcel(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength) as ArrayBuffer);
    expect(parsed.items.map(row=>row.recordId)).toEqual(rows.map(row=>row.recordId));
    expect(planTransitionImport(parsed.items,rows).changes).toHaveLength(0);
  });
});
