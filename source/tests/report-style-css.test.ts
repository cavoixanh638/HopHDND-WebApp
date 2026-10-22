import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
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
  const match = source.match(new RegExp('--' + property + ':#([0-9a-fA-F]{6})'));
  if (!match) throw new Error('Thiếu màu ' + property);
  return match[1];
}

describe('Năm phong cách tô màu báo cáo', () => {
  it('loads the six open-license font families from the web instead of requiring local installation', () => {
    expect(css).toMatch(/^\/\* Six open-license web-font choices[\s\S]*?@import url\('https:\/\/fonts\.googleapis\.com\/css2\?/);
    for(const font of ['IBM+Plex+Sans','Inter','Lato','Noto+Sans','Open+Sans','Roboto']){
      expect(css).toContain('family='+font);
    }
    // System fonts are still local-only; CSS has no embedded proprietary font assets.
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
        .toBeLessThan(luminance(softBg)-0.10);
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
    expect(css).toMatch(/report-style-band .report-table thead[\s\S]*?background:var\(--stage-solid\)/);
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
    expect(palette).toContain('--source-bg:#FFE0E4');
    expect(palette).toContain('--office-bg:#FFE8B8');
    expect(palette).toContain('--completed-bg:#D5F0DE');
    expect(css).toContain('--workflow-bg:#FFE0E4;--workflow-border:#E7A1AD;--workflow-fg:#7F1D30');
    expect(css).toContain('--workflow-bg:#FFE8B8;--workflow-border:#DCB76A;--workflow-fg:#704500');
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
});
