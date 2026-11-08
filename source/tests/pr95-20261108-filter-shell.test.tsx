import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {ActiveListFilters} from '../src/features/items/ActiveListFilters';
import type {ActiveListCondition} from '../src/features/items/pr95-v6-l4-active-filters';

const style=readFileSync(new URL('../src/features/items/list-filter-toolbar.css',import.meta.url),'utf8');
const shell=readFileSync(new URL('../src/qa/pr95-full-preview.css',import.meta.url),'utf8');
const preview=readFileSync(new URL('../src/qa/pr95-full-preview.tsx',import.meta.url),'utf8');

const conditions:ActiveListCondition[]=[
  {id:'department',category:'department',label:'Sở, ngành',value:'Đơn vị mẫu D'},
  {id:'summary',category:'summary',label:'Trình Thành ủy',value:'Sở chưa trình'}
];
const render=(list:ActiveListCondition[])=>
  renderToStaticMarkup(createElement(ActiveListFilters,{
    conditions:list,visibleCount:0,sourceCount:27,onRemove:()=>{},onClearAll:()=>{}
  }));

describe('2026-11-08 centered filter signal and responsive demo shell',()=>{
  it('keeps the actual F filter IDs, clear actions and stable result semantics',()=>{
    const html=render(conditions);
    expect(html).toContain('data-active-filter-count="2"');
    expect(html).toContain('data-active-filter-id="department"');
    expect(html).toContain('data-active-filter-id="summary"');
    expect(html).toContain('Đang lọc ');
    expect(html).toContain('0/27</span>');
    expect(html).toContain('class="list-active-filter-emphasis"');
    expect(html).toContain('class="list-active-filter-inline"');
    expect(html).toContain('class="list-active-filter-chips"');
    expect(html).toContain('class="list-active-filter-noun"> nội dung</span>');
    expect(html).toContain('list-active-filter-signal');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('0');
    expect(html).toContain('27');
    expect(html).toContain('Không có kết quả phù hợp');
    expect(html).toContain('Xóa tất cả');
    expect(html).not.toContain('list-active-filter-chip-label');
    expect(html).toContain('title="Sở, ngành: Đơn vị mẫu D"');
    expect(html).toContain('class="list-active-filter-chip-value">Đơn vị mẫu D</span>');
    const inactive=render([]);
    expect(inactive).not.toContain('list-active-filter-signal');
    expect(inactive).toContain('Hiển thị ');
    expect(inactive).not.toContain('Xóa tất cả');
  });
  it('centers active values, uses persistent red emphasis and loops the red dot safely',()=>{
    expect(style).toMatch(/\.list-active-filter-chips\s*\{[^}]*justify-content:center/s);
    expect(style).toContain('margin-inline:auto');
    expect(style).toMatch(/\.list-active-filter-empty\s*\{[^}]*justify-content:center/s);
    expect(style).toContain('animation:hdnd-filter-red-pulse 1150ms ease-in-out infinite');
    expect(style).toContain('background:#f3273f');
    expect(style).toContain('color:#c72037');
    expect(style).toContain('grid-template-columns:minmax(0,1fr) max-content minmax(0,1fr)');
    expect(style).toContain('border-left:3px solid #e12b43');
    expect(style).toContain('font-size:12px;line-height:1.3');
    expect(style).toContain('height:28px;min-height:28px');
    expect(style).toContain('border:2px solid #285f87;outline:none;box-shadow:none');
    expect(style).toContain('content:"·"');
    expect(style).toContain('flex-wrap:wrap');
    expect(style).toContain('@media(prefers-reduced-motion:reduce)');
    expect(style).toContain('.list-active-filter-signal{animation:none;opacity:1;transform:none}');
    expect(style).not.toContain('hdnd-filter-ack');
  });
  it('removes the exact bottom note, keeps account safety in the menu',()=>{
    expect(preview).not.toContain('<footer className="pr95-preview-footnote">');
    expect(preview).toContain('Không đăng nhập Google · chỉ dữ liệu giả');
    expect(preview).toContain('role='); // simulated role still explicit
  });
  it('centers max-2200 layout instead of leaving fixed 16px left margin and a huge right gutter',()=>{
    expect(shell).toContain('width:calc(100% - 32px);max-width:2200px;box-sizing:border-box;margin:0 auto');
    expect(shell).not.toContain('max-width:1720px');
    expect(shell).toMatch(/\.pr95-full-preview\[data-role="guest"\] \.pr95-preview-header\s*\{\s*height:0;min-height:0/);
    expect(shell).toContain('opacity:.53');
    expect(shell).toContain('.pr95-preview-gear:hover');
  });
});
