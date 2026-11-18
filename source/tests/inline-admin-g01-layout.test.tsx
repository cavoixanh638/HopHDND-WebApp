import {describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {canHideInlineColumn,renameInlineColumn,setInlineColumnVisibility,setInlineSummaryVisibility} from '../src/features/items/inline-g01-layout';
import {ItemSummaryCards} from '../src/features/items/ItemSummaryCards';
import {ColumnHeader} from '../src/features/items/ColumnHeader';
import {createDemoItems} from '../src/data/demo-items';

describe('G01 safe shared-layout transitions (synthetic data only)',()=>{
 it('preserves Excel schema, values, width and column order through rename/hide/restore',()=>{
   const before=defaultItemLayout();
   const renamed=renameInlineColumn(before,'content','Tên nội dung mới');
   expect(renamed.columns.find(c=>c.key==='content')).toMatchObject({
     label:'Tên nội dung mới',renamed:true,width:440,visible:true
   });
   const hidden=setInlineColumnVisibility(renamed,'content',false);
   expect(hidden.columns.find(c=>c.key==='content')).toMatchObject({label:'Tên nội dung mới',visible:false});
   expect(hidden.columns.map(c=>c.key)).toEqual(before.columns.map(c=>c.key));
   expect(hidden.columns.find(c=>c.key==='content')?.removed).toBeUndefined();
   const restored=setInlineColumnVisibility(hidden,'content',true);
   expect(restored.columns.find(c=>c.key==='content')?.visible).toBe(true);
   expect(validateItemLayout(restored).columns).toEqual(restored.columns);
   expect(before.columns.find(c=>c.key==='content')?.label).toBe('Nội dung trình');
 });
 it('cannot hide ID, the final visible column, or a missing column; rejects bad titles',()=>{
   const base=defaultItemLayout();
   expect(canHideInlineColumn(base,'displayCode')).toBe(false);
   expect(()=>setInlineColumnVisibility(base,'displayCode',false)).toThrow(/Không được ẩn/);
   const one={...base,columns:base.columns.map(c=>({...c,visible:c.key==='displayCode'}))};
   expect(canHideInlineColumn(one,'displayCode')).toBe(false);
   expect(()=>setInlineColumnVisibility(one,'displayCode',false)).toThrow();
   expect(()=>setInlineColumnVisibility(base,'missing',false)).toThrow();
   expect(()=>renameInlineColumn(base,'content','  ')).toThrow();
   expect(()=>renameInlineColumn(base,'content','<script>')).toThrow();
 });
 it('changes only allowed C01–C03 visibility and always leaves C00 intact',()=>{
   const base=defaultItemLayout();
   const next=setInlineSummaryVisibility(base,'party',false);
   expect(next.summaryCards).toEqual({party:false,build:true,nq:true});
   expect(base.summaryCards).toEqual({party:true,build:true,nq:true});
   expect(()=>setInlineSummaryVisibility(base,'total' as never,false)).toThrow();
   expect(validateItemLayout(next).summaryCards?.party).toBe(false);
 });
});
describe('G01 visible role affordances (SSR fixture)',()=>{
 const summary=(editing:boolean)=>
   renderToStaticMarkup(createElement(ItemSummaryCards,{
     items:createDemoItems(3),selection:null,visibleCount:3,onSelect:vi.fn(),onClear:vi.fn(),
     inlineEditing:editing,onHideStage:vi.fn()
   }));
 it('guest sees original C00+3 stage cards with no hide controls; admin edit sees 3 only',()=>{
   const guest=summary(false),admin=summary(true);
   expect(guest).toContain('data-summary-card="total"');
   expect(guest).not.toContain('inline-g01-card-hide');
   expect(admin).toContain('data-summary-card="total"');
   expect((admin.match(/class="inline-g01-card-hide"/g)??[]).toHaveLength(3);
   expect(admin).not.toContain('Ẩn thẻ Tổng số');
   expect((guest.match(/data-summary-card="/g)??[]).toHaveLength(4);
 });
 const heading=(editing:boolean)=>renderToStaticMarkup(createElement(ColumnHeader,{
   columnKey:'content',disabled:false,onMove:vi.fn(),onSort:vi.fn(),
   sortLabel:'Nội dung trình',children:'Nội dung trình',inlineEditing:editing,
   canHide:true,onHide:vi.fn(),onRename:vi.fn()
 }));
 it('column tools only appear in edit mode, sort remains independent',()=>{
   const guest=heading(false),admin=heading(true);
   expect(guest).not.toContain('inline-g01-column-menu-trigger');
   expect(admin).toContain('Tùy chọn cột Nội dung trình');
   expect(admin).toContain('Sắp xếp cột Nội dung trình');
   expect(admin).toContain('data-column-key="content"');
   expect(admin).toContain('column-movable');
 });
});
