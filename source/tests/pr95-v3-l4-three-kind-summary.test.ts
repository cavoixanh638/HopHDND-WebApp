import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Item} from '../shared/types';
import {ItemSummaryCards} from '../src/features/items/ItemSummaryCards';
import {createDemoItems} from '../src/data/demo-items';
import {filterByKind,kindOf,type ListKind} from '../src/features/items/list-toolbar-filters';
import {summarizeListItems} from '../src/domain/item-summary';
import {isActive} from '../src/domain/reporting';

const seed=createDemoItems(1)[0];
const row=(id:string,patch:Partial<Item>={}):Item=>({
  ...seed,recordId:id,displayCode:id,stt:1,documentKind:'NQ',type:'QPPL',
  isDropped:false,archivedAt:null,...patch,
});
const items:Item[]=[
  row('nq-qppl-1'),row('nq-qppl-2',{type:' QpPl '}),
  row('nq-hc-1',{type:'HC'}),row('nq-hc-2',{type:'Hành  chính'}),
  row('bc',{documentKind:'BC',type:'HC'}),
  row('nq-unknown',{type:'Khác chưa xác định'}),
  row('other-kind',{documentKind:'UNCLASSIFIED',type:'QPPL'}),
  row('dropped',{isDropped:true,type:'HC'}),
  row('archived',{archivedAt:'2026-10-01T00:00:00.000Z',documentKind:'BC'}),
];
const render=(rows:Item[],selected:ListKind|null=null)=>
  renderToStaticMarkup(createElement(ItemSummaryCards,{
    items:rows,selection:null,visibleCount:rows.filter(isActive).length,
    onSelect:()=>{},onClear:()=>{},onSelectKind:()=>{},kindSelection:selected,
  }));
const readChips=(html:string)=>[...html.matchAll(/<button\b[^>]*data-summary-kind="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)]
  .map((match)=>({
    kind:match[1],label:match[2].replace(/<strong>[\s\S]*?<\/strong>/,'').replace(/<[^>]*>/g,'').trim(),
    count:Number(match[2].match(/<strong>(\d+)<\/strong>/)?.[1]??NaN),
    pressed:match[0].includes('aria-pressed="true"'),
    hasTooltip:/title="Bấm để lọc/.test(match[0]),
    hasAria:/aria-label="Bấm để lọc/.test(match[0]),
    hasButtonType:match[0].includes('type="button"'),
  }));

describe('PR95 UI V3 L4 — Tổng số nội dung is precisely three optional kind filters',()=>{
  it('shows only NQ QPPL / NQ HC / BC in that order, with real active counts and button semantics',()=>{
    const chips=readChips(render(items));
    expect(chips).toEqual([
      {kind:'qppl',label:'NQ QPPL',count:2,pressed:false,hasTooltip:true,hasAria:true,hasButtonType:true},
      {kind:'hc',label:'NQ HC',count:2,pressed:false,hasTooltip:true,hasAria:true,hasButtonType:true},
      {kind:'bc',label:'BC',count:1,pressed:false,hasTooltip:true,hasAria:true,hasButtonType:true},
    ]);
    expect(chips).toHaveLength(3);
  });

  it('keeps true total independent from visible classified chip subtotals, including unknown entries',()=>{
    const summary=summarizeListItems(items);
    expect(summary.total).toMatchObject({total:7,qppl:2,hc:2,bc:1,nqUnclassified:1,unclassified:1});
    const html=render(items),chips=readChips(html);
    const totalIndex=html.indexOf('Tổng số nội dung');
    const countIndex=html.indexOf('item-summary-total-count');
    expect(totalIndex).toBeGreaterThanOrEqual(0);
    expect(countIndex).toBeGreaterThan(totalIndex);
    expect(html).toMatch(/class="item-summary-total-count">7<\/strong>/);
    expect(chips.reduce((count,chip)=>count+chip.count,0)).toBe(5);
    expect(html).not.toContain('data-summary-kind="nq-unknown"');
    expect(html).not.toContain('data-summary-kind="unclassified"');
    expect(items.filter(isActive).map(item=>item.recordId)).toContain('nq-unknown');
    expect(items.filter(isActive).map(item=>item.recordId)).toContain('other-kind');
  });

  it('preserves 3 chips at zero and never invents missing categories',()=>{
    const chips=readChips(render([]));
    expect(chips.map(chip=>[chip.kind,chip.count])).toEqual([
      ['qppl',0],['hc',0],['bc',0],
    ]);
    expect(render([])).toMatch(/class="item-summary-total-count">0<\/strong>/);
    const unknownOnly=[row('unknown-nq',{type:'Chưa xác định'}),row('other',{documentKind:'UNCLASSIFIED'})];
    expect(readChips(render(unknownOnly)).map(chip=>chip.count)).toEqual([0,0,0]);
    expect(render(unknownOnly)).toMatch(/class="item-summary-total-count">2<\/strong>/);
  });

  it('keeps all existing kind predicates and exact filtered IDs (no coercion of unknowns)',()=>{
    expect(kindOf(items[4])).toBe('bc');
    expect(kindOf(items[5])).toBe('nq-unknown');
    expect(kindOf(items[6])).toBe('unclassified');
    expect(filterByKind(items,null).map(item=>item.recordId)).toEqual(items.map(item=>item.recordId));
    expect(filterByKind(items,'qppl').map(item=>item.recordId)).toEqual(['nq-qppl-1','nq-qppl-2']);
    expect(filterByKind(items,'hc').map(item=>item.recordId)).toEqual(['nq-hc-1','nq-hc-2']);
    expect(filterByKind(items,'bc').map(item=>item.recordId)).toEqual(['bc']);
    expect(filterByKind(items,'nq-unknown').map(item=>item.recordId)).toEqual(['nq-unknown']);
    expect(filterByKind(items,'unclassified').map(item=>item.recordId)).toEqual(['other-kind']);
  });

  it.each(['qppl','hc','bc'] as const)('preserves selection semantics, aria-pressed and clear-filter affordance for %s',selected=>{
    const html=render(items,selected),chips=readChips(html);
    expect(chips.filter(c=>c.pressed).map(c=>c.kind)).toEqual([selected]);
    expect(html).toContain('Đang lọc loại văn bản:');
    expect(html).toContain('Bỏ lọc loại');
    expect(html).toContain({qppl:'NQ QPPL',hc:'NQ HC',bc:'BC'}[selected]);
    expect(chips.every(chip=>chip.hasTooltip&&chip.hasAria)).toBe(true);
  });
});
