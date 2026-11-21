import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const css=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const listCss=css('../src/features/items/inline-g01-list.css');
const reportCss=css('../src/features/reports/inline-g02-report.css');
const popupCss=css('../src/features/reports/inline-g04-popup.css');
const listTsx=css('../src/features/items/ItemList.tsx');
const headerTsx=css('../src/features/items/ColumnHeader.tsx');
const reportTsx=css('../src/features/reports/ReportTable.tsx');

describe('Admin hover-eye column controls (presentation only)',()=>{
  it('uses a small eye glyph via CSS mask, never text in column labels',()=>{
    expect(listCss).toContain('.inline-g01-column-menu-trigger::before');
    expect(reportCss).toContain('.inline-excel-report-trigger::before');
    expect(listCss).toContain("content:''");
    expect(reportCss).toContain("content:''");
    expect(listCss).toContain("viewBox='0 0 24 24'");
    expect(reportCss).toContain("viewBox='0 0 24 24'");
    expect(listCss).toMatch(/width:13px;height:13px/);
    expect(reportCss).toMatch(/width:13px;height:13px/);
    expect(listCss).not.toContain("content:'⋯'");
    expect(reportCss).not.toContain("content:'⋯'");
    // The existing controls must keep descriptive labels and menu callbacks.
    expect(headerTsx).toContain("aria-label={'Tùy chọn cột '");
    expect(reportTsx).toContain('aria-label={`Tùy chọn ẩn hiện cột ${column}`}');
  });

  it('places the control in the upper-right corner, separately for every heading',()=>{
    expect(listCss).toContain('th .inline-g01-column-tools');
    expect(listCss).toContain('top:0;right:10px;bottom:0');
    expect(reportCss).toContain('th[data-quick-report-menu] .inline-excel-report-tools');
    expect(reportCss).toContain('top:0;right:10px;bottom:0');
    // The dropdown is measured from the full header height, not from its 18px eye.
    expect(listCss).toContain('width:18px;height:auto;margin:0;flex:none');
    expect(reportCss).toContain('width:18px;height:auto;margin:0');
    expect(listCss).toContain('.report-grid-modal .report-detail-grid thead th');
    expect(popupCss).toContain('.inline-g04-heading-action.inline-g04-hide');
    expect(popupCss).toMatch(/\.inline-g04-heading-action\.inline-g04-hide\s*\{\s*display:none;/);
    expect(listCss).toContain('padding-right:30px');
    expect(reportCss).toContain('padding-right:32px');
  });

  it('is hidden until hovering the exact cell, while preserving keyboard and touch access',()=>{
    for(const sheet of [listCss,reportCss]){
      expect(sheet).toContain('@media (hover:hover) and (pointer:fine)');
      expect(sheet).toContain('opacity:0;pointer-events:none');
      expect(sheet).toContain(':is(:hover,:focus-within)');
      expect(sheet).toContain('opacity:1;pointer-events:auto');
      expect(sheet).toContain('@media (hover:none)');
      expect(sheet).toContain('@media print');
    }
    expect(listCss).toContain(':has(.inline-g01-column-menu)');
    expect(reportCss).toContain(':has(.inline-excel-status-menu)');
  });

  it('retains Admin-only access and a restore choice but removes persistent instruction clutter',()=>{
    expect(headerTsx).toContain('const visibilityEnabled=inlineEditing||quickVisibility');
    expect(reportTsx).toContain('const quickAllowed = quickVisibility');
    expect(listTsx).toContain('hiddenQuickColumns.length>0&&<div className="inline-excel-hidden-bar"');
    expect(listTsx).not.toContain('Admin: nhấp chuột phải hoặc bấm ⋯');
    expect(listTsx).toContain('Hiện tất cả');
    expect(reportTsx).toContain('Hiện cột ẩn');
    expect(reportTsx).toContain("type:'status-visible'");
  });
});
