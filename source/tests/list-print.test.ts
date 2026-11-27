import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {LIST_A4_PRINT_CSS,printStageTone} from '../src/features/items/list-print';
import printLayout from '../src/presentation/print-layout.json';
describe('A4 print content contract',()=>{
  it('uses landscape A4 and only heading + copied visible table, no extra labels',()=>{
    expect(LIST_A4_PRINT_CSS).toContain('size:A4 landscape;');
    expect(LIST_A4_PRINT_CSS).toContain('margin:13mm 8mm 8mm;');
    expect(LIST_A4_PRINT_CSS).toContain('content:counter(page);');
    expect(LIST_A4_PRINT_CSS).toContain('@page:first{@top-center{content:none}}');
    expect(LIST_A4_PRINT_CSS).toContain('td[data-print-kind="displayCode"]');
    expect(LIST_A4_PRINT_CSS).toContain('white-space:nowrap!important');
    expect(LIST_A4_PRINT_CSS).toContain('.hdnd-print-stage-row');
    expect(LIST_A4_PRINT_CSS).toContain('.hdnd-print-staff-row');
    expect(LIST_A4_PRINT_CSS).toContain('thead{display:table-header-group}');
    expect(LIST_A4_PRINT_CSS).toContain('break-inside:avoid');
    expect(LIST_A4_PRINT_CSS).toContain('body[data-hdnd-a4-print="true"]>*:not(#hdnd-a4-print-root){display:none!important}');
    expect(LIST_A4_PRINT_CSS).not.toContain('Ngày in');
    expect(LIST_A4_PRINT_CSS).not.toContain('Trang số');
    expect(LIST_A4_PRINT_CSS).not.toContain('Ngày in');
    expect(LIST_A4_PRINT_CSS).not.toContain('Báo cáo');
    expect(LIST_A4_PRINT_CSS).toContain('thead{display:table-header-group}');
  });
  it('never prints an editable placeholder as business content',()=>{
    const source=readFileSync(new URL('../src/features/items/list-print.ts',import.meta.url),'utf8');
    expect(source).toContain("value.classList.contains('inline-note-empty')?'—':displayText(value)");
  });
});

describe('Readable print status and normal content typography',()=>{
  it('prints regular content and monochrome stages with only a solid vertical divider',()=>{
    expect(LIST_A4_PRINT_CSS).toMatch(/\.hdnd-print-document-main\{\s*font-weight:400!important/);
    expect(LIST_A4_PRINT_CSS).not.toContain('data-marker');
    expect(LIST_A4_PRINT_CSS).toContain(`min-height:${printLayout.minHeightMm}mm`);
    const stageRow=LIST_A4_PRINT_CSS.match(/\.hdnd-print-stage-row\{([^}]+)\}/)?.[1];
    expect(stageRow).toBeDefined();
    expect(stageRow).toContain('border:0;border-radius:0');
    expect(stageRow).not.toMatch(/border-(?:top|right|bottom|left|style|width):/);
    expect(LIST_A4_PRINT_CSS).toContain(`border-left:${printLayout.dividerPt}pt solid #888`);
    expect(LIST_A4_PRINT_CSS).toContain('background:transparent;text-align:center');
    expect(LIST_A4_PRINT_CSS).toContain('align-items:stretch;gap:0');
    expect(LIST_A4_PRINT_CSS).not.toMatch(/(?:^|[;{])\s*border[^:;{}]*:[^;{}]*\bdashed\b/);
    expect(LIST_A4_PRINT_CSS).not.toMatch(/\.hdnd-print-stage-row\[data-tone=/);
    expect(LIST_A4_PRINT_CSS).toContain(`border:0;border-left:${printLayout.dividerPt}pt solid #888`);
    const source=readFileSync(new URL('../src/features/items/list-print.ts',import.meta.url),'utf8');
    expect(source).toContain('line.dataset.tone=tone;');
    expect(LIST_A4_PRINT_CSS).toContain(`margin-top:${printLayout.gapMm}mm;`);
    expect(LIST_A4_PRINT_CSS).not.toContain('border-top:.35pt solid #aaa');
    expect(LIST_A4_PRINT_CSS).toMatch(/data-tone="not-submitted"\]\{\s*color:#[0-9a-f]+;font-weight:700/);
    expect(LIST_A4_PRINT_CSS).toMatch(/data-tone="not-required"\]\{\s*color:#[0-9a-f]+;font-style:italic/);
    expect(LIST_A4_PRINT_CSS).toContain(`minmax(0,${printLayout.leftPercent}fr) minmax(0,${100-printLayout.leftPercent}fr)`);
    for(const tone of ['not-submitted','not-required'])
      expect(LIST_A4_PRINT_CSS).toContain('data-tone="'+tone+'"');
    // All literal colors must have equal RGB channels (including shorthand).
    for(const match of LIST_A4_PRINT_CSS.matchAll(/#[0-9a-f]{3,6}(?![0-9a-z-])/gi)){
      const hex=match[0].slice(1);const rgb=hex.length===3?[...hex]:hex.match(/../g)!;
      expect(new Set(rgb).size,match[0]).toBe(1);
    }
    expect(LIST_A4_PRINT_CSS).toContain('background:#fff!important');
  });
  it('classifies each known milestone within its own stage and preserves neutral unknowns',()=>{
    for(const field of ['progressParty','progressBuild','progressCouncil']){
      expect(printStageTone(field,'Sở chưa trình')).toBe('not-submitted');
      expect(printStageTone(field,'VP đang xử lý')).toBe('processing');
      expect(printStageTone(field,'VP đang thực hiện')).toBe('processing');
      expect(printStageTone(field,'Chưa xác minh')).toBe('neutral');
    }
    for(const text of ['Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL'])
      expect(printStageTone('progressParty',text)).toBe('waiting');
    expect(printStageTone('progressBuild','Đã trình, chờ QĐ')).toBe('waiting');
    expect(printStageTone('progressParty','Đã có TBKL')).toBe('completed');
    expect(printStageTone('progressBuild','Đã có QĐ')).toBe('completed');
    expect(printStageTone('progressCouncil','Hoàn thành')).toBe('completed');
    expect(printStageTone('progressParty','Không phải trình')).toBe('not-required');
    expect(printStageTone('progressBuild','Không phải trình')).toBe('not-required');
    expect(printStageTone('progressBuild','Đã có TBKL')).toBe('neutral');
    expect(printStageTone('progressParty','Hoàn thành')).toBe('neutral');
    expect(printStageTone('progressCouncil','Không phải trình')).toBe('neutral');
  });
});
