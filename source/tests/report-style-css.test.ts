import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
const frameCss = readFileSync(new URL('../src/features/items/item-frame.css', import.meta.url), 'utf8');
const variants = ['classic', 'signal', 'compact', 'bars', 'band'] as const;
const stages = ['source', 'office', 'next', 'completed', 'withdrawn', 'other'] as const;

function luminance(hex: string): number {
  const channels = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
function declaration(source: string, property: string): string {
  const match = source.match(new RegExp('--' + property + ':(?:#|var\\([^,]+,#)([0-9a-fA-F]{6})'));
  if (!match) throw new Error('Thiếu màu ' + property);
  return match[1];
}

describe('Năm phong cách tô màu báo cáo', () => {
  it('loads only the administrator-selected web font without blocking first paint', () => {
    const loader=readFileSync(new URL('../src/data/on-demand-fonts.ts',import.meta.url),'utf8');
    expect(css).not.toContain('@import url(');
    for(const font of ['IBM Plex Sans','Inter','Lato','Noto Sans','Open Sans','Roboto']){
      expect(loader).toContain(font);
    }
    expect(loader).toContain('if(!name||requested.has(name)');
    expect(loader).toContain('document.head.appendChild(link)');
    expect(loader).toContain('display=swap');
    expect(css).not.toContain('@font-face');
  });
  it('keeps Party middle and excluded build columns pale but VP/source/completed prominent',()=>{
    const palette=[...css.matchAll(/\.report-surface\s*\{([^}]*)\}/g)]
      .map(match=>match[1]).find(block=>block.includes('--office-bg'));
    expect(palette).toBeDefined();
    const quietBlock=css.match(/\.report-surface \.report-stage-intermediate,\s*\.report-surface \.report-stage-excluded\s*\{([^}]*)\}/)?.[1];
    expect(quietBlock).toBeDefined();
    const softBg=declaration(quietBlock!,'stage-bg');
    expect(luminance(softBg)).toBeGreaterThan(0.96);
    expect(contrast(softBg,declaration(quietBlock!,'stage-ink'))).toBeGreaterThanOrEqual(4.5);
    for(const stage of ['source','office','completed']){
      const vividBg=declaration(palette!,stage+'-bg');
      expect(luminance(vividBg),stage+' must stand out against Party middle columns')
        .toBeLessThan(luminance(softBg)-(stage==='office'?0.02:0.10));
    }
    expect(css).toContain('report-style-band .report-table thead th.report-stage-intermediate');
    expect(css).toContain('report-style-compact .report-table :is(tbody,tfoot) td.report-stage-intermediate');
    expect(css).toContain('body.is-printing #print-target.report-surface.report-style-band .report-table thead th.report-stage-intermediate');
  });
  it('renders Không phải trình exactly as faintly as Đã trình HĐND, chưa có QĐ',()=>{
    const muted=css.match(/\.report-surface \.report-stage-intermediate,\s*\.report-surface \.report-stage-excluded\s*\{([^}]*)\}/)?.[1];
    expect(muted).toBeDefined();
    expect(luminance(declaration(muted!,'stage-bg'))).toBeGreaterThan(0.96);
    expect(contrast(declaration(muted!,'stage-bg'),declaration(muted!,'stage-ink'))).toBeGreaterThanOrEqual(4.5);
    // No later excluded override can restore its old, stronger background.
    expect(css).not.toContain('--stage-bg:#f0f3f6;--stage-ink:#4b6170');
    const component=readFileSync(new URL('../src/features/reports/ReportTable.tsx',import.meta.url),'utf8');
    expect(component).toContain("normalizeSearch('Không phải trình')].includes(normalizeSearch(status))");
    for(const style of ['classic','signal','compact','bars','band']){
      expect(css).toContain('.report-surface.report-style-'+style+' .report-table');
    }
  });

  it('applies the chosen font size to table header, group cells and numeric cells', () => {
    expect(css).toMatch(/table\.data-table,table\.report-table\s*\{font-size:var\(--table-font-size,13px\);\}/);
    expect(css).toMatch(/table\.data-table th,table\.report-table th\s*\{font-size:inherit;\}/);
    expect(css).toMatch(/table\.data-table.*table\.report-table.*font-family:var\(--table-font-family/s);
    expect(css).toMatch(/\.report-surface > \.card-header h3\s*\{[\s\S]*?font-family:var\(--table-font-family/);
    expect(css).toMatch(/\.report-surface > \.card-header h3\s*\{[\s\S]*?font-size:calc\(var\(--table-font-size,13px\) \* 1\.30\)/);
  });

  it('uses a single stable semantic palette for all styles with readable stage text', () => {
    const palette = [...css.matchAll(/\.report-surface\s*\{([^}]*)\}/g)]
      .map(match => match[1]).find(block => block.includes('--source-bg'));
    expect(palette).toBeDefined();
    for (const stage of stages) {
      expect(contrast(declaration(palette!, stage + '-bg'), declaration(palette!, stage + '-ink')),
        'nền/chữ ' + stage).toBeGreaterThanOrEqual(4.5);
      expect(contrast(declaration(palette!, stage + '-solid'), 'FFFFFF'),
        'dải tiêu đề ' + stage).toBeGreaterThanOrEqual(4.5);
      expect(css).toContain('.report-surface .report-stage-' + stage);
    }
    expect(css).toContain('print-color-adjust:exact');
  });

  it('implements five different COLOR APPLICATION techniques, not five shades', () => {
    for (const id of variants) {
      expect(css).toContain('.report-surface.report-style-' + id + ' .report-table');
      expect(css).toContain('.report-visual-option.report-style-' + id + ' .report-example-cell');
    }
    expect(css).toMatch(/report-style-classic .report-table :is\(th,td\)[\s\S]*?background:var\(--stage-bg\)/);
    expect(css).toMatch(/report-style-signal .report-table tbody[\s\S]*?report-count-mark/);
    expect(css).toMatch(/report-style-compact .report-table :is\(tbody,tfoot\)[\s\S]*?box-shadow:inset 4px 0/);
    expect(css).toMatch(/report-style-bars .report-table tbody[\s\S]*?background:linear-gradient\(to right/);
    expect(css).toMatch(/report-style-band .report-table thead[\s\S]*?background:var\(--stage-bg\)/);
    expect(new Set(variants).size).toBe(5);
  });

  it('keeps all five styles in print including stage classes and inline font variables', () => {
    const component = readFileSync(new URL('../src/features/reports/ReportTable.tsx', import.meta.url), 'utf8');
    expect(component).toContain('element.className = ref.current.className;');
    expect(component).toContain('element.style.cssText = ref.current.style.cssText;');
    expect(css).toMatch(/\.report-surface \.report-table \[class\*="report-stage-"\]/);
  });
});


describe('Data list and detail popup alignment',()=>{
  it('styles by column key and preserves top-left layout of content and notes',()=>{
    expect(css).toContain('td[data-col-key]:not([data-col-key="content"]):not([data-col-key="note"])');
    expect(css).toContain('vertical-align:middle');
    expect(css).toContain('td:is([data-col-key="content"],[data-col-key="note"])');
  });
});


describe('Editable dropdown and shared immediate tooltip presentation',()=>{
  it('outlines picker triggers, keeps the arrow, and avoids layout-intensive selectors',()=>{
    expect(css).toContain('.cell-picker-trigger::after');
    expect(css).toContain('.edit-shared-tooltip[popover]:popover-open');
    expect(css).not.toContain('body:has(.report-surface .report-table button.count-drill');
  });
});


describe('Data list workflow palette is synchronized with the actual report stage palette',()=>{
  it('uses identical report-stage fills for all three main statuses including completion',()=>{
    const palette=css.match(/\.report-surface\s*\{([^}]*)\}/g)?.find(block=>block.includes('--source-bg'));
    expect(palette).toContain('--source-bg:var(--hdnd-status-not-submitted-bg,#FFE0E4)');
    expect(palette).toContain('--source-ink:var(--hdnd-status-not-submitted-text,#7F1D30)');
    expect(palette).toContain('--office-bg:var(--hdnd-status-office-bg,#FEF9C3)');
    expect(palette).toContain('--office-ink:var(--hdnd-status-office-text,#854D0E)');
    expect(palette).toContain('--completed-bg:var(--hdnd-status-done-bg,#D5F0DE)');
    expect(palette).toContain('--completed-ink:var(--hdnd-status-done-text,#125B35)');
    expect(css).toContain('--workflow-bg:#FFE0E4;--workflow-border:#E7A1AD;--workflow-fg:#7F1D30');
    expect(css).toContain('--workflow-bg:#FEF9C3;--workflow-border:#E5CD70;--workflow-fg:#854D0E');
    expect(css).toContain('--workflow-bg:#D5F0DE;--workflow-border:#91CFA8;--workflow-fg:#2B7450');
    expect(contrast('D5F0DE','2B7450')).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain('td[data-progress-tone="done"] .workflow-status-value::before');
    expect(css).toContain('background:#125B35;');
  });
  it('keeps edit fields subtly slate-blue and completed lettering softer in list and popup',()=>{
    expect(css).toContain('border:1.5px solid #b7cbd6');
    expect(css).toContain('background:#f2f6f9');
    expect(css).toContain('color:#426274');
    expect(css).toContain('font-weight:550');
    expect(css).toContain('td.editable-cell:not([data-progress-tone]) .cell-picker-trigger::after');
    expect(css).toContain('td.editable-cell[data-progress-tone="done"] :is(.cell-picker-trigger,.custom-cell-input)');
    expect(css).toContain('font-weight:650');
    expect(contrast('F2F6F9','426274')).toBeGreaterThanOrEqual(4.5);
    expect(luminance('F2F6F9')).toBeGreaterThan(luminance('D5F0DE'));
  });
  it('preserves image-matched colored status dropdowns in editing mode, list and popup',()=>{
    const pairedRule=/\.item-data-table tbody td\.editable-cell\[data-progress-tone\] \.cell-picker-trigger,\s*\.report-detail-grid tbody td\.editable-cell\[data-progress-tone\] \.cell-picker-trigger\s*\{([^}]*)\}/;
    const control=css.match(pairedRule)?.[1];
    expect(control).toBeDefined();
    expect(control).toContain('background-color:var(--workflow-bg)');
    expect(control).toContain('border-color:var(--workflow-border)');
    for(const grid of ['item-data-table','report-detail-grid']){
      expect(css).toContain('.'+grid+' tbody td.editable-cell[data-progress-tone] .cell-picker-trigger:hover,');
      expect(css).toContain('.'+grid+' tbody td.editable-cell[data-progress-tone] .cell-picker-trigger:focus-visible');
    }
    expect(css).toContain('background-color:var(--workflow-bg);');
    expect(css).toContain('border-color:var(--workflow-border);');
    expect(css).toContain('color:var(--workflow-fg);');
    // PR #13 mistakenly removed the semantic fill, hid idle history, and
    // altered completed ink. Those regressions must remain rolled back.
    expect(css).not.toContain('td.editable-cell[data-progress-tone] .cell-picker-trigger::before');
    expect(css).toContain('opacity:.42;');
    expect(css).toContain('--workflow-bg:#D5F0DE;--workflow-border:#91CFA8;--workflow-fg:#2B7450');
    expect(css).not.toContain('--workflow-fg:#307651');
  });
  it('never paints a yellow/orange entire row solely because it has a pending edit',()=>{
    expect(css).not.toMatch(/\\.data-table\\s+tr\\.dirty-row\\s*\\{/);
    expect(css).not.toMatch(/\\.report-detail-grid\\s+tbody\\s+\\.report-grid-row-dirty\\s*\\{/);
    expect(css).toContain('.item-data-table tr.color-row td');
    // Manually configured row-highlights and status pills still work.
    expect(css).toContain('.color-amber, .color-amber td');
    expect(css).toContain('background-color:var(--workflow-bg)');
    expect(css).toContain('opacity:.42;');
  });
  it('keeps V5 saturated status ink at weight 600 without changing fills or history',()=>{
    // Foreground is intentionally separate from the checkpoint's semantic fill,
    // border and status-dot variable (--workflow-fg).
    for(const [tone,ink,fill,minimum] of [
      ['not-submitted','D00025','FFE0E4',4.5],
      ['office','854D0E','FEF9C3',4.5],
      ['done','007A18','D5F0DE',4.5],
    ] as const){
      const selector='tbody td[data-progress-tone="'+tone+'"]';
      expect(css).toContain(selector);
      expect(css).toContain('--workflow-text:#'+ink);
      expect(contrast(fill,ink)).toBeGreaterThanOrEqual(minimum);
    }
    expect(css).toContain('color:var(--workflow-text);\n  font-weight:600;');
    expect(css).toContain('.item-data-table tbody td[data-progress-tone] .workflow-status-value,');
    expect(css).toContain('.report-detail-grid tbody td.editable-cell[data-progress-tone] :is(.cell-picker-trigger,.custom-cell-input)');
    expect(css).toContain('--workflow-bg:#FFE0E4;--workflow-border:#E7A1AD;--workflow-fg:#7F1D30');
    expect(css).toContain('--workflow-bg:#FEF9C3;--workflow-border:#E5CD70;--workflow-fg:#854D0E');
    expect(css).toContain('--workflow-bg:#D5F0DE;--workflow-border:#91CFA8;--workflow-fg:#2B7450');
    expect(css).toContain('opacity:.42;');
    // V5 is text-only: do not change weight, background or dot colors.
    expect(css).toContain('--workflow-text:#D00025;');
    expect(css).toContain('--workflow-text:#854D0E;');
    expect(css).toContain('--workflow-text:#007A18;');
    expect(css).toContain('font-weight:600;');
  });
});

describe('List border resize and room/CV filter controls',()=>{
  it('uses a centered invisible 14px hit-zone on the existing separator, not another colored handle',()=>{
    expect(frameCss).toContain('/* 23/10: no separate resizing icon');
    expect(frameCss).toMatch(/\.item-data-table \.item-heading-row th \.column-resizer\s*\{[^}]*right:-7px;[^}]*width:14px;[^}]*border:0;[^}]*background:transparent;/s);
    expect(frameCss).toContain('cursor:col-resize;');
    // Only the same line is accented when hovered; not a new icon.
    expect(frameCss).toContain('.column-resizer:is(:hover,:focus-visible)::after');
  });
  it('keeps stacked room/CV search controls equally readable at 15px',()=>{
    expect(frameCss).toContain('.room-specialist-filter-stack input,');
    expect(frameCss).toMatch(/\.room-specialist-filter-stack select,\s*\n\.item-data-table \.room-specialist-filter-stack input\[type="search"\] \{[\s\S]*?font-size:15px;/);
    expect(frameCss).toContain('height:96px;');
  });
});
