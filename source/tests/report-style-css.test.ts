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
  it('makes only three Party middle columns extremely pale and keeps VP/source/completed prominent',()=>{
    const palette=[...css.matchAll(/\.report-surface\s*\{([^}]*)\}/g)]
      .map(match=>match[1]).find(block=>block.includes('--office-bg'));
    expect(palette).toBeDefined();
    const quietBlock=css.match(/\.report-surface \.report-stage-intermediate\s*\{([^}]*)\}/)?.[1];
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
