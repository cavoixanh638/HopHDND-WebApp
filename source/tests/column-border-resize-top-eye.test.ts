import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const source=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
const resizeCss=source('../src/components/inline-g07-resize.css');
const listCss=source('../src/features/items/inline-g01-list.css');
const reportCss=source('../src/features/reports/inline-g02-report.css');
const handle=source('../src/components/ColumnResizeHandle.tsx');
const list=source('../src/features/items/ItemList.tsx');
const reports=source('../src/features/reports/ReportTable.tsx');
const detail=source('../src/features/reports/ReportDetailGrid.tsx');

describe('Excel/Word-like column separator resizing',()=>{
  it('uses a transparent hit area centered at the column border, never a persistent grip',()=>{
    expect(resizeCss).toContain('right:-6px;width:12px;min-width:12px');
    expect(resizeCss).toContain('border:0;background:transparent;box-shadow:none');
    expect(resizeCss).toContain('cursor:col-resize');
    expect(resizeCss).not.toContain("content:'↔'");
    expect(resizeCss).toContain('content:none;display:none!important;');
    expect(resizeCss).toContain('opacity:0;');
    expect(resizeCss).toContain(':is(:hover,:focus-visible,:active)::before');
    expect(resizeCss).toContain('opacity:1;');
  });
  it('covers list, statistics and drilldown table headers without expanding to data cells',()=>{
    expect(resizeCss).toContain('.item-data-table,.report-table,.report-grid-modal .report-detail-grid');
    expect(resizeCss).toContain('thead th .column-resizer.inline-g07-resizer');
    expect(resizeCss).not.toContain('tbody td .column-resizer');
    expect(list).toContain('<ColumnResizeHandle windowDragFallback columnIndex={index}');
    expect(reports).toContain('<ColumnResizeHandle columnIndex={index}');
    expect(detail).toContain('<ColumnResizeHandle columnIndex={index}');
  });
  it('preserves keyboard/touch resizing and commits only on release',()=>{
    expect(handle).toContain('role="separator"');
    expect(handle).toContain('aria-valuenow={width}');
    expect(handle).toContain("event.currentTarget.setPointerCapture(event.pointerId)");
    expect(handle).toContain('onCommit(session.currentWidth)');
    expect(handle).toContain("event.key==='ArrowRight'");
    expect(resizeCss).toContain('@media (pointer:coarse)');
    expect(resizeCss).toContain('right:-6px;width:24px;min-width:24px');
  });
});
describe('Eye belongs in the top-right corner, NOT in centered heading content',()=>{
  it('anchors the eye and resize hit-zone to the actual table th, not the relatively positioned label',()=>{
    const legacyFrame=source('../src/features/items/item-frame.css');
    expect(legacyFrame).toContain('justify-content:center;text-align:center;position:relative;box-sizing:border-box;');
    expect(listCss).toContain('th:has(.inline-g01-column-tools)>.column-heading-content');
    expect(listCss).toContain('position:static;');
    expect(listCss).toContain('.report-grid-heading-row th:has(.inline-g01-column-tools)>.column-heading-content');
    expect(listCss).toContain('position:absolute;top:1px;right:0');
    expect(resizeCss).toContain('left:calc(50% - 1px)');
  });
  it('separates the sort affordance from the eye and the Excel border pointer',()=>{
    expect(listCss).toContain('position:absolute;right:0;top:auto;bottom:1px;transform:none;');
    expect(listCss).toContain('.column-sort-button:not(.active)');
    expect(listCss).toContain('.column-heading-label:hover + .column-sort-button');
    expect(listCss).toContain('.column-sort-button:is(:hover,:focus-visible)');
    expect(resizeCss).toContain('cursor:col-resize;');
  });
  it('pins the eye button independently from its full-height menu anchor',()=>{
    expect(listCss).toContain('top:0;right:10px;bottom:0;z-index:8');
    expect(listCss).toContain('position:absolute;top:1px;right:0');
    expect(reportCss).toContain('position:absolute;top:0;right:10px;bottom:0;z-index:8');
    expect(reportCss).toContain('position:absolute;top:1px;right:0');
    expect(reportCss).toContain('position:absolute;top:1px;right:10px;z-index:8');
    expect(listCss).toContain('width:18px;min-width:18px;height:18px;min-height:18px');
    expect(reportCss).toContain('width:18px;min-width:18px;height:18px;min-height:18px');
  });
  it('does not overlap the separator and remains accessible on hover, focus and touch',()=>{
    for(const css of [listCss,reportCss]){
      expect(css).toContain('@media (hover:hover) and (pointer:fine)');
      expect(css).toContain('@media (hover:none)');
      expect(css).toContain(':is(:hover,:focus-within)');
      expect(css).toContain('pointer-events:auto');
      expect(css).toContain('@media print');
    }
    expect(listCss).toContain(':has(.inline-g01-column-menu)');
    expect(reportCss).toContain(':has(.inline-excel-status-menu)');
    expect(resizeCss).toContain('@media print');
  });
});
