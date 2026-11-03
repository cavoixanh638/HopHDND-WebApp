import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout,validateListTitle,validateSummaryCards,DEFAULT_LIST_TITLE} from '../../../../../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../../../../../src/data/item-layout-merge';
import {sortItems} from '../../../../../src/domain/sort-items';
import type {Item} from '../../../../../shared/types';
const row=(displayCode:string,documentKind='NQ')=>({displayCode,documentKind}) as Item;
describe('Stream B shared admin controls',()=>{
 it('sorts displayed IDs naturally, NQ then BC in both directions; blanks last',()=>{
 const rows=[row('ID10'),row('ID2','BC'),row('ID2'),row('ID10','BC'),row('Dòng 9 (thiếu mã)')];
 expect(sortItems(rows,{key:'displayCode',direction:'asc'})).toEqual([rows[2],rows[0],rows[1],rows[3],rows[4]]);
 expect(sortItems(rows,{key:'displayCode',direction:'desc'})).toEqual([rows[0],rows[2],rows[3],rows[1],rows[4]]);
 expect(sortItems(rows,null)).toEqual(rows);
 });
 it('validates title and card preferences, migrates old layout',()=>{
 expect(validateListTitle(undefined)).toBe(DEFAULT_LIST_TITLE);
 expect(validateListTitle('  Kỳ họp cuối năm  ')).toBe('Kỳ họp cuối năm');
 for(const value of ['', '  ', '<script>', 'a\nb', 'x'.repeat(101),null,42])expect(()=>validateListTitle(value)).toThrow();
 expect(validateItemLayout(defaultItemLayout()).summaryCards).toEqual({party:true,build:true,nq:true});
 for(const value of [null,[],{party:false},{party:true,build:true,nq:'false'},{party:true,build:true,nq:true,total:false}])expect(()=>validateSummaryCards(value)).toThrow();
 });
 it('merges separate title/card edits and rejects conflicts without silent loss',()=>{
 const base=validateItemLayout(defaultItemLayout());
 const local={...base,listTitle:'Danh sách kỳ họp',summaryCards:{party:false,build:true,nq:true}};
 const remote={...base,summaryCards:{party:true,build:false,nq:true}};
 const merged=mergeItemLayout(base,local,remote);
 expect(merged.listTitle).toBe(local.listTitle);
 expect(merged.summaryCards).toEqual({party:false,build:false,nq:true});
 expect(()=>mergeItemLayout(base,local,{...remote,listTitle:'Tên khác'})).toThrow(LayoutConflictError);
 expect(mergeItemLayout(base,local,{...remote,listTitle:'Tên khác'},{listTitle:'remote'}).listTitle).toBe('Tên khác');
 expect(validateItemLayout(JSON.parse(JSON.stringify(merged)))).toEqual(merged);
 });
});
