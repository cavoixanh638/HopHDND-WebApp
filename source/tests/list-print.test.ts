import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {LIST_A4_PRINT_CSS,printStageTone,fitPrintStageColumn,fitPrintGroupColumns} from '../src/features/items/list-print';
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
  it('prints regular content and a three-stage list with horizontal-only separators',()=>{
    expect(LIST_A4_PRINT_CSS).toMatch(/\.hdnd-print-document-main\{\s*font-weight:400!important/);
    expect(LIST_A4_PRINT_CSS).not.toContain('data-marker');
    expect(LIST_A4_PRINT_CSS).toContain(`min-height:${printLayout.minHeightMm}mm`);
    const stageRow=LIST_A4_PRINT_CSS.match(/\.hdnd-print-stage-row\{([^}]+)\}/)?.[1];
    expect(stageRow).toBeDefined();
    expect(stageRow).toContain('margin:0;border:0;border-radius:0');
    expect(stageRow).not.toMatch(/border-(?:top|right|bottom|left|style|width):/);
    const label=LIST_A4_PRINT_CSS.match(/\.hdnd-print-stage-label\{([^}]+)\}/)?.[1];
    expect(label).toBeDefined();
    expect(label).toContain('border:0;');
    expect(label).not.toMatch(/border-(?:top|right|bottom|left|style|width):/);
    const state=LIST_A4_PRINT_CSS.match(/\.hdnd-print-stage-state\{([^}]+)\}/)?.[1];
    expect(state).toBeDefined();
    expect(state).toContain('justify-content:flex-start');
    expect(state).toContain('background:transparent;text-align:left');
    expect(state).not.toContain('text-align:center');
    expect(LIST_A4_PRINT_CSS).toContain('align-items:stretch;gap:0');
    expect(LIST_A4_PRINT_CSS).not.toMatch(/(?:^|[;{])\s*border[^:;{}]*:[^;{}]*\bdashed\b/);
    expect(LIST_A4_PRINT_CSS).not.toMatch(/\.hdnd-print-stage-row\[data-tone=/);
    expect(state).toContain('border:0;');
    expect(state).not.toMatch(/border-(?:top|right|bottom|left|style|width):/);
    const source=readFileSync(new URL('../src/features/items/list-print.ts',import.meta.url),'utf8');
    expect(source).toContain('line.dataset.tone=tone;');
    expect(LIST_A4_PRINT_CSS).not.toContain(`margin-top:${printLayout.gapMm}mm;`);
    expect(LIST_A4_PRINT_CSS).toMatch(/\.hdnd-print-stage-row \+ \.hdnd-print-stage-row\{\s*border-top:\.35pt solid #aaa;\s*\}/);
    expect(LIST_A4_PRINT_CSS).not.toMatch(/\.hdnd-print-stage-row \+ \.hdnd-print-stage-row\s*>/);
    expect(LIST_A4_PRINT_CSS).toMatch(/data-tone="not-submitted"\]\{\s*color:#[0-9a-f]+;font-weight:700/);
    expect(LIST_A4_PRINT_CSS).toMatch(/data-tone="not-required"\]\{\s*color:#[0-9a-f]+;font-style:italic/);
    expect(LIST_A4_PRINT_CSS).toContain(`minmax(0,var(--hdnd-print-stage-label-width,${printLayout.leftPercent}%)) minmax(0,1fr)`);
    expect(LIST_A4_PRINT_CSS).toContain('max-width:281mm');
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

describe('Print-only stage column autofit',()=>{
  it('reserves only measured label+status tracks and transfers spare width to the other columns',()=>{
    const initial=[5.338,36.662,30,10,18];
    const fitted=fitPrintStageColumn(initial,2,0,92,116);
    expect(fitted.shares[0]).toBe(initial[0]);
    expect(fitted.shares[2]).toBeLessThan(initial[2]);
    expect(fitted.shares[1]).toBeGreaterThan(initial[1]);
    expect(fitted.shares[3]/fitted.shares[4]).toBeCloseTo(initial[3]/initial[4]);
    expect(fitted.shares.reduce((a,b)=>a+b,0)).toBeCloseTo(100,8);
    expect(fitted.labelWidthPx).toBeGreaterThan(92);
    expect(fitted.labelWidthPx).toBeLessThan(103);
    expect(initial[2]).toBe(30);
  });
  it('widens too-narrow screen projection and safely wraps exceptionally long values',()=>{
    const small=fitPrintStageColumn([5,80,15],2,0,112,140);
    expect(small.shares[2]).toBeGreaterThan(15);
    expect(small.labelWidthPx).toBeDefined();
    const huge=fitPrintStageColumn([5,80,15],2,0,4000,6000);
    expect(huge.labelWidthPx).toBeUndefined();
    expect(huge.shares[1]).toBeGreaterThan(0);
    expect(huge.shares.reduce((a,b)=>a+b,0)).toBeCloseTo(100);
  });
  it('does not invent extra columns or consume a fixed ID',()=>{
    expect(fitPrintStageColumn([5,95],1,0,92,116).shares).toEqual([5,95]);
    expect(fitPrintStageColumn([5,95],-1,0,92,116).shares).toEqual([5,95]);
  });
});

describe('Print personnel fit and regular typography',()=>{
  it('uses regular ID, staff tag and staff value, leaving all table headings bold',()=>{
    for(const selector of ['td[data-print-kind="displayCode"]','.hdnd-print-staff-tag','.hdnd-print-staff-value']){
      const start=LIST_A4_PRINT_CSS.indexOf(selector+'{');
      expect(start).toBeGreaterThan(-1);
      const rule=LIST_A4_PRINT_CSS.slice(start,LIST_A4_PRINT_CSS.indexOf('}',start));
      expect(rule).toContain('font-weight:400');
      expect(rule).not.toContain('font-weight:700');
    }
    expect(LIST_A4_PRINT_CSS).toContain('var(--hdnd-print-staff-label-width,35%)');
    expect(LIST_A4_PRINT_CSS).not.toContain('grid-template-columns:12mm');
  });
  it('fits long staff names and stage text together even when saved staff width is tiny',()=>{
    const initial=[5.338,60,19,12,3.662];
    const stage={index:2,kind:'stage' as const,labelPx:92,valuePx:116};
    const staff={index:4,kind:'staff' as const,labelPx:26,valuePx:215};
    const fit=fitPrintGroupColumns(initial,0,[stage,staff]);
    expect(fit.shares[0]).toBe(initial[0]);
    expect(fit.shares[2]).toBeCloseTo(fitPrintStageColumn(initial,2,0,92,116).shares[2],8);
    expect(fit.shares[4]).toBeGreaterThan(23);
    expect(fit.shares[1]).toBeLessThan(initial[1]);
    expect(fit.shares.reduce((a,b)=>a+b,0)).toBeCloseTo(100,8);
    expect(fit.labelWidths[4]).toBeGreaterThan(staff.labelPx);
    expect(fit.labelWidths[4]).toBeLessThan(staff.labelPx+6);
  });
  it('supports multiple partial staff columns and staff without a stage group',()=>{
    const fit=fitPrintGroupColumns([5,75,10,10],0,[
      {index:2,kind:'staff',labelPx:22,valuePx:130},
      {index:3,kind:'staff',labelPx:24,valuePx:90}]);
    expect(Object.keys(fit.labelWidths)).toEqual(['2','3']);
    expect(fit.shares[2]).toBeGreaterThan(fit.shares[3]);
    expect(fit.shares.reduce((a,b)=>a+b,0)).toBeCloseTo(100,8);
  });
  it('keeps the ID and other columns when exceptionally long values require safe wrapping',()=>{
    const fit=fitPrintGroupColumns([5,50,20,25],0,[
      {index:2,kind:'stage',labelPx:100,valuePx:120},
      {index:3,kind:'staff',labelPx:35,valuePx:10000}]);
    expect(fit.shares[0]).toBe(5);expect(fit.shares[1]).toBeGreaterThan(0);
    expect(fit.labelWidths[3]).toBeUndefined();
    expect(fit.shares.reduce((a,b)=>a+b,0)).toBeCloseTo(100,8);
  });
});
