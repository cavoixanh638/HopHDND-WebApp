import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {composeColumnRightsDraft} from '../src/features/items/ItemColumnPanel';
import type {CellPermissions} from '../src/data/firebase-repository';

const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('../src/features/items/ItemColumnPanel.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/items/item-frame.css',import.meta.url),'utf8');

describe('G00 consolidated admin tools across recent UI requests',()=>{
  it('has just one column-search selector, outside layout tools',()=>{
    expect(list).toContain('className="inline-g01-search-popover"');
    expect(list).toContain('className="inline-g01-search-choices"');
    expect(list).toContain('{adminControls&&<button ref={searchTriggerRef}');
    expect(list).toContain('adminControls&&searchScopeOpen&&searchPlacement');
    expect(list).toContain('placeCompactMenu(anchor.getBoundingClientRect()');
    expect(list).toContain("adminControls?toolbar:{...toolbar,field:'all'}");
    expect(list).toContain('adminControls&&denseChrome?selectedSearchColumns:undefined');
    expect(list).toContain('if(!adminControls||!denseChrome||typeof window');
    expect(list).not.toContain('className="admin-search-scope"');
    expect(list).not.toContain('previewOptionsOpen');
    expect(list).not.toContain('admin-preview-options-toggle');
    expect(list).toContain('Lọc nâng cao');
    expect(list).not.toContain('<summary>Lọc khác ');
    expect(list).not.toContain('<label>Chọn trường tìm kiếm\n              <select aria-label="Chọn trường tìm kiếm"');
  });
  it('keeps summary/L03 behind editing but column options visible in the ordinary List',()=>{
    expect(list).toContain('inlineMode&&adminControls&&(onPersistViewerLayout||isRamAdminList)');
    expect(list).toContain('aria-label="Thiết lập hiển thị khi chỉnh giao diện"');
    expect(list).toContain('stageInlineLayout(base=>setInlineSummaryVisibility(base,key,checked))');
    expect(list).toContain('stageInlineLayout(base=>({...base,partyTrackWidths:widths}))');
    // The single column shortcut handles visibility and group choices via the existing draft.
    expect(list).toContain('aria-label="Tùy chọn cột"');
    expect(list).toContain('className="column-options-checklist"');
    expect(list).toContain('<strong className="column-options-name-heading">Viết tắt tên</strong>');
    expect(list).toContain('data-compact-choice={option.key}');
    expect(list).not.toContain('<details className="compact-more-options">');
    expect(list).toContain('data-column-choice={column.key}');
    expect(list).toContain('onChange={event=>changeInlineColumnVisibility(column.key,event.currentTarget.checked)}');
    expect(list).toContain('const compactMenu=adminControls&&compactOn&&!customizing');
    // Regression: the production CSS hides the old .card-header when
    // data-preview-options=closed. A DOM existence check alone missed it.
    const heading=list.slice(list.indexOf('{columnMenuInHeading?<div className="admin-list-heading">'),
      list.indexOf('</div>:<h2 className="item-list-page-title">'));
    expect(heading).toContain('{compactMenu}');
    const hiddenHeader=list.slice(list.indexOf('{adminControls&&<div className="card-header">'),
      list.indexOf('{!customizing&&(onPersistViewerLayout||isRamAdminList)&&(saveFeedback||layoutError)'));
    expect(hiddenHeader).not.toContain('{compactMenu}');
    expect(list).toContain('{!columnMenuInHeading&&compactMenu}');
    const productionCss=readFileSync(new URL('../src/features/items/real-list-visual-parity.css',import.meta.url),'utf8');
    expect(productionCss).toContain('[data-preview-options="closed"] > .card-header');
    expect(productionCss).toContain('display:none!important');
    expect(list).toContain('stageInlineLayout(previous=>({...previous,compactDisplay:next}))');
    expect(list).toContain('if(inlineMode){\n      // Group titles belong');
    expect(list).toContain('className="button ghost admin-bulk-paste-trigger"');
    expect(list).toContain('disabled={locked||!rows.length||inlineMode}');
    expect(list).toContain('Lưu bố cục');
    expect(list).toContain('Hủy thay đổi');
  });
  it('exposes inline name and kind controls, keeping complex editor available',()=>{
    expect(panel).toContain('className="column-manager-rename-button"');
    expect(panel).toContain('className="column-manager-rename-input"');
    expect(panel).toContain("event.key==='Enter'");
    expect(panel).toContain("event.key==='Escape'");
    expect(panel).toContain('className="column-manager-type column-manager-type-select"');
    expect(panel).toContain('disabled={!kindCanChange(column)}');
    expect(panel).toContain("selected===column.key?'Thu gọn':'Nâng cao'");
    expect(panel).toContain('G05ChoiceEditor');
    expect(panel).toContain('column-specialist-relations');
    expect(panel).toContain('Xác nhận xóa');
    expect(panel).not.toContain('<label className="field">Tên cột<input');
    expect(panel).not.toContain('<label className="field">Kiểu dữ liệu');
    expect(css).toContain('.column-manager-label:hover .column-manager-rename-button');
    expect(css).toContain('.column-manager-rename-button:focus-visible');
    expect(css).toContain('@media (hover:none),(pointer:coarse)');
  });
  it('column updates preserve historical row/cell values without showing legacy controls',()=>{
    const saved:CellPermissions={columns:{content:false,room:true},
      rows:{'sheet:row:12':false},cells:{'sheet:row:12':{content:true}}};
    const next=composeColumnRightsDraft(saved,{content:true,room:true});
    expect(next).toEqual({columns:{content:true,room:true},
      rows:{'sheet:row:12':false},cells:{'sheet:row:12':{content:true}}});
    next.cells!['sheet:row:12'].content=false;
    expect(saved.cells!['sheet:row:12'].content).toBe(true);
    expect(saved.columns.content).toBe(false);
    expect(panel).not.toContain('clearExceptions');
    expect(panel).not.toContain('column-rights-warning');
    expect(panel).toContain('Cho phép sửa toàn bộ các ô thuộc cột này.');
  });

});
