import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';

const css=readFileSync(new URL('../src/features/items/executive-layout.css',import.meta.url),'utf8');
const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');

describe('Danh sách chi tiết V2: readability and scroll regression',()=>{
  it('has a bounded two-axis scrolling detail viewport with visible scrollbar',()=>{
    const rule=css.match(/\.executive-table-scroll\s*\{([^}]+)\}/)?.[1]??'';
    expect(rule).toContain('overflow-x:auto');
    expect(rule).toContain('overflow-y:auto');
    expect(rule).toMatch(/max-height:min\(70vh,800px\)/);
    expect(rule).toContain('scrollbar-width:auto');
    expect(css).toMatch(/\.executive-table \.executive-clusters th\{[^}]*top:0/);
    expect(css).toMatch(/\.executive-table \.executive-column-headings th\{[^}]*top:48px/);
  });
  it('uses legible card labels and table text rather than tiny 9-11px text',()=>{
    expect(css).toMatch(/\.executive-status span\{font-size:12\.5px/);
    expect(css).toMatch(/\.executive-table\{[^}]*font-size:13\.5px/);
    expect(css).toMatch(/\.executive-table thead th\{font-size:12\.5px/);
    expect(css).toMatch(/\.executive-content-title\{font-size:14px/);
    expect(css).not.toContain('.executive-status span{font-size:9px');
  });
  it('removes personal display-template UI and silent old personal preset application',()=>{
    expect(list).not.toContain('<ListViewTools');
    expect(list).not.toContain("from './ListViewTools'");
    expect(list).not.toContain('loadActiveListView');
    expect(list).not.toContain('overlayPersonalLayout');
    expect(list).toContain('source-column-visibility');
    expect(list).toContain('Tùy chọn từng cột');
    expect(list).toContain('Hiện đủ cột Excel');
    expect(list).toContain('<ExecutiveDetailTable');
    expect(list).toContain('<ExecutiveProgressCards');
  });
  it('keeps intermediate stage visually secondary and official colors unchanged',()=>{
    expect(css).toContain('.executive-progress-source{background:#dc2626');
    expect(css).toContain('.executive-progress-office{background:#d97706');
    expect(css).toContain('.executive-progress-next{background:#bfdbfe');
    expect(css).toContain('.executive-progress-completed{background:#059669');
    expect(css).toContain('.executive-status-next{background:#eff6ff');
  });
});
