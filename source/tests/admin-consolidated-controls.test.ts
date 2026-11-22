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
    expect(list).not.toContain('className="admin-search-scope"');
    expect(list).not.toContain('previewOptionsOpen');
    expect(list).not.toContain('admin-preview-options-toggle');
    expect(list).toContain('Lọc nâng cao');
    expect(list).not.toContain('<summary>Lọc khác ');
    expect(list).not.toContain('<label>Chọn trường tìm kiếm\n              <select aria-label="Chọn trường tìm kiếm"');
  });
  it('puts summary/L03 and compact controls behind editing, Excel paste alongside filter bar',()=>{
    expect(list).toContain('inlineMode&&adminControls&&(onPersistViewerLayout||isRamAdminList)');
    expect(list).toContain('aria-label="Thiết lập hiển thị khi chỉnh giao diện"');
    expect(list).toContain('stageInlineLayout(base=>setInlineSummaryVisibility(base,key,checked))');
    expect(list).toContain('stageInlineLayout(base=>({...base,partyTrackWidths:widths}))');
    // Staff shortcut is a direct entry to the same Save/Cancel visual draft.
    expect(list).toContain('const compactMenu=adminControls&&compactOn&&!customizing');
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
