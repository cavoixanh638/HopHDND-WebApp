import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout,validateListTitle,validateSummaryCards,DEFAULT_LIST_TITLE,overlayPersonalLayout} from '../../../../../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../../../../../src/data/item-layout-merge';
import {sortItems} from '../../../../../src/domain/sort-items';
import {ColumnHeader} from '../../../../../src/features/items/ColumnHeader';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
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
 it('keeps equal display IDs stable and never mutates the source rows',()=>{
   const rows=[row('ID02'),row('ID2'),row('ID10'),row('ID1','BC'),row('ID2','BC'),row('ID2','UNCLASSIFIED'),row('Dòng 1 (thiếu mã)')];
   const snapshot=[...rows];
   expect(sortItems(rows,{key:'displayCode',direction:'asc'})).toEqual([rows[0],rows[1],rows[2],rows[3],rows[4],rows[5],rows[6]]);
   expect(sortItems(rows,{key:'displayCode',direction:'desc'})).toEqual([rows[2],rows[0],rows[1],rows[4],rows[3],rows[5],rows[6]]);
   expect(rows).toEqual(snapshot);
 });
 it('applies legacy defaults, and personal column presets cannot replace shared title/cards',()=>{
   const legacy=defaultItemLayout();
   delete legacy.listTitle;
   delete legacy.summaryCards;
   expect(validateItemLayout(legacy)).toMatchObject({
     listTitle:DEFAULT_LIST_TITLE,summaryCards:{party:true,build:true,nq:true}
   });
   const shared={...defaultItemLayout(),listTitle:'Nội dung kỳ họp tháng 11',
     summaryCards:{party:false,build:true,nq:false}};
   const personal={...defaultItemLayout(),columns:[...defaultItemLayout().columns].reverse()};
   const combined=overlayPersonalLayout(shared,personal);
   expect(combined.listTitle).toBe(shared.listTitle);
   expect(combined.summaryCards).toEqual(shared.summaryCards);
   expect(combined.columns[0].key).toBe(personal.columns[0].key);
 });
 it('keeps independent card flags during CAS and supports immediately undoing a toggle',()=>{
   const base=validateItemLayout(defaultItemLayout());
   const first=mergeItemLayout(base,{...base,summaryCards:{party:false,build:true,nq:true}},base);
   const local={...first,summaryCards:{party:false,build:false,nq:true}};
   const remote={...first,listTitle:'Tên mới từ tab khác'};
   const next=mergeItemLayout(first,local,remote);
   expect(next.summaryCards).toEqual({party:false,build:false,nq:true});
   expect(next.listTitle).toBe('Tên mới từ tab khác');
   const undo=mergeItemLayout(first,{...first,summaryCards:{party:true,build:true,nq:true}},first);
   expect(undo.summaryCards).toEqual({party:true,build:true,nq:true});
 });
 it('does not expose sort control, focus or aria-sort to guest headers',()=>{
   const guest=renderToStaticMarkup(createElement(ColumnHeader,{
     columnKey:'displayCode',disabled:true,onMove:()=>{},children:'ID'
   }));
   expect(guest).not.toContain('column-sort-button');
   expect(guest).not.toContain('aria-sort');
   expect(guest).not.toContain('tabindex');
   const admin=renderToStaticMarkup(createElement(ColumnHeader,{
     columnKey:'displayCode',disabled:true,onMove:()=>{},onSort:()=>{},children:'ID'
   }));
   expect(admin).toContain('column-sort-button');
   expect(admin).toContain('aria-sort="none"');
   expect(admin).toContain('tabindex="0"');
 });

});
