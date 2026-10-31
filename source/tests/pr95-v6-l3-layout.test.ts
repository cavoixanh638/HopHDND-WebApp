import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {previewCanOpenPage} from '../src/qa/pr95-full-preview';

const item=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
const demo=readFileSync(new URL('../src/qa/pr95-full-preview.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/items/pr95-v6-l3-page-layout.css',import.meta.url),'utf8');

describe('PR95 UI V6 L3 — owner-only layout changes',()=>{
  it('starts real App on List and uses verified admin gate for both nav tiles',()=>{
    expect(app).toContain("const [page, setPage] = useState<Page>('items')");
    expect(app).toContain("{adminTools&&<nav className=\"nav-tabs primary-section-switcher\"");
    expect(app).toContain("if(page!=='items')");
    expect(app).toContain('const adminTools=canCustomize&&');
    expect(app).toContain('gearLoginBusy');
    expect(app).toContain('onClick={()=>void loginFromGear()}');
  });
  it('does not expose preview admin pages or navigation to guests',()=>{
    expect(previewCanOpenPage('guest','items')).toBe(true);
    expect(previewCanOpenPage('guest','excel')).toBe(false);
    expect(previewCanOpenPage('admin','excel')).toBe(true);
    expect(demo).toContain('{admin&&<nav className="nav-tabs primary-section-switcher pr95-preview-nav"');
    expect(demo).toContain("if(next==='guest'){");
    expect(demo).toContain("setPage('items');");
    expect(demo).not.toContain("'Đã chuyển sang '+(next==='admin'?'quản trị':'khách')");
  });
  it('keeps ONE summary call with the original toolbarBase scope and positions it before one heading and F toolbar',()=>{
    expect((item.match(/<ItemSummaryCards /g)||[])).toHaveLength(1);
    const summary=item.indexOf('<ItemSummaryCards items={toolbarBase}');
    const title=item.indexOf('<h2 className="item-list-page-title">');
    const adminControls=item.indexOf('{adminControls&&<div className="card-header">');
    const toolbar=item.indexOf('<div className="list-filter-toolbar"');
    const table=item.indexOf('className="table-wrap item-table-scroll"');
    expect(summary).toBeGreaterThan(0);
    expect(summary).toBeLessThan(title);
    expect(title).toBeLessThan(adminControls);
    expect(adminControls).toBeLessThan(toolbar);
    expect(toolbar).toBeLessThan(table);
    expect(item.slice(summary,title)).toContain('selection={summarySelection}');
    expect(item.slice(summary,title)).toContain('kindSelection={kindSelection}');
    expect(item.slice(summary,title)).toContain('visibleCount={filtered.length}');
    expect(demo).not.toContain(":'Danh sách các ND trình HĐND'</h2>");
    expect(css).toContain('.item-list-page-title');
  });
  it('does not modify filter predicates, source items or default width persistence',()=>{
    expect(item).toContain('const toolbarBase=useMemo(');
    expect(item).toContain('const filtered=useMemo(');
    expect(item).toContain('onPersistViewerLayout');
    expect(css).not.toMatch(/\.item-summary-bucket\s*\{/);
    expect(css).not.toContain('display:none!important');
    expect(css).not.toContain('min-width:920px');
  });
});
