import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
const variants = ['classic', 'signal', 'compact'] as const;
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

describe('Bảng màu và cỡ chữ bảng báo cáo', () => {
  it('font size adjusts heading, group column and numbers consistently', () => {
    // Inherited table font size alone is insufficient: the older rule pins
    // every <th> to 12px, ignoring the selected 11-20px size.
    expect(css).toMatch(/table\.data-table,table\.report-table\s*\{font-size:var\(--table-font-size,13px\);\}/);
    expect(css).toMatch(/table\.data-table th,table\.report-table th\s*\{font-size:inherit;\}/);
    expect(css).toMatch(/table\.data-table.*table\.report-table.*font-family:var\(--table-font-family/s);
  });

  it('uses a single stage palette on header, body, footer and summary', () => {
    expect(css).toMatch(/\.report-surface \.report-table :is\(th,td\)\[class\*="report-stage-"\]/);
    expect(css).toMatch(/\.report-surface \.report-flow-summary \.report-stage-summary\[class\*="report-stage-"\]/);
    expect(css).toMatch(/background:var\(--stage-bg\);color:var\(--stage-ink\);border-color:var\(--stage-stroke\)/);
  });

  it('keeps all three variants color-only and readable at AA normal-text contrast', () => {
    const stagePalettes = variants.map(variant => {
      const escaped = new RegExp('\\.report-surface\\.report-style-' + variant + '\\s*\\{([^}]+)\\}');
      const block = css.match(escaped)?.[1];
      expect(block, 'Thiếu phương án màu ' + variant).toBeDefined();
      expect(block).not.toMatch(/(?:^|;)\s*(?:font-size|padding|margin|width|height|display|gap|border-radius|line-height)\s*:/);
      for (const stage of stages) {
        const background = declaration(block!, stage + '-bg');
        const foreground = declaration(block!, stage + '-ink');
        expect(contrast(background, foreground), variant + ' / ' + stage).toBeGreaterThanOrEqual(4.5);
      }
      return stages.map(stage => declaration(block!, stage + '-bg')).join('|');
    });
    expect(new Set(stagePalettes).size).toBe(3);
  });
});
