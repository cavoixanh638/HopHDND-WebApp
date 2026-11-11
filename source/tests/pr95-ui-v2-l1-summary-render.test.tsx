import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {ItemSummaryCards} from '../src/features/items/ItemSummaryCards';
import {createDemoItems} from '../src/data/demo-items';
import type {Item} from '../shared/types';

const rows:Item[]=createDemoItems(3).map((row,i)=>({
  ...row,documentKind:i===2?'BC':'NQ',
  type:i===0?'QPPL':i===1?'Hành chính':'BC',
  progressParty:i===0?'Đã gửi ĐU':i===1?'Đã họp/xin phiếu, chưa có TBKL':'Sở chưa trình',
  partyLevel:'Ban Chấp hành',isDropped:false,archivedAt:null
}));
describe('V2 L1 real summary chip HTML',()=>{
  it('V3 keeps the three approved kinds as actual buttons, not spans or unknown-kind chips',()=>{
    const html=renderToStaticMarkup(createElement(ItemSummaryCards,{
      items:rows,selection:null,kindSelection:'qppl',visibleCount:1,
      onSelect:()=>{},onSelectKind:()=>{},onClear:()=>{}
    }));
    const kinds=[...html.matchAll(/<button[^>]+data-summary-kind="([^"]+)"/g)]
      .map(match=>match[1]);
    expect(kinds).toEqual(['qppl','hc','bc']);
    expect(html).not.toContain('data-summary-kind="nq-unknown"');
    expect(html).not.toContain('data-summary-kind="unclassified"');
    expect(html).toMatch(/data-summary-kind="qppl"[^>]+aria-pressed="true"/);
    expect(html).toContain('Bấm để lọc NQ QPPL; bấm lại để bỏ lọc');
    expect(html).toContain('NQ HC');
    expect(html).toContain('BC <strong>1</strong>');
    expect(html).toMatch(/class="item-summary-total-count">3<\/strong>/);
  });
  it('reuses the next stage label/aria and preserves 4+4+3 status buttons',()=>{
    const html=renderToStaticMarkup(createElement(ItemSummaryCards,{
      items:rows,selection:{report:'party',stage:'next'},
      kindSelection:null,visibleCount:2,
      onSelect:()=>{},onSelectKind:()=>{},onClear:()=>{}
    }));
    expect((html.match(/class="item-summary-bucket /g)||[])).toHaveLength(11);
    expect(html).toMatch(/data-summary-report="party" data-summary-stage="next"[^>]+aria-pressed="true"/);
    expect(html).toContain('Bấm để lọc Trình Thành ủy — Bước tiếp theo; bấm lại để bỏ lọc');
    expect(html).toContain('2/3 nội dung');
  });
});
