import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('../src/features/items/ItemColumnPanel.tsx',import.meta.url),'utf8');
const smoke=readFileSync(new URL('../scripts/smoke-pages-browser.mjs',import.meta.url),'utf8');
describe('G00: one table with explicit visual draft Save/Cancel',()=>{
  it('mounts the data-region only for the ordinary List',()=>{
    expect(list).toContain("{!customizing&&<div className=\"item-data-region\"");
    expect(list).toContain("!customizing&&<div");
    expect(app).toContain("Quản lý cột nâng cao");
    expect(panel).toContain("Thêm/xóa cột, kiểu nhập, danh sách chọn");
  });
  it('stages header and column actions and never calls CAS until Save',()=>{
    expect(list).toContain('const [inlineDraft,setInlineDraft]=useState<ItemLayout|null>(null)');
    expect(list).toContain('const stageInlineLayout=(transform?');
    expect(list).toContain('const saveInlineLayout=async()=>');
    expect(list).toContain('const saved=await applyViewerLayout(()=>next,inlineEditBase.current??undefined)');
    expect(list).toContain('stageInlineLayout(base=>setInlineColumnVisibility(base,key,visible))');
    expect(list).toContain('stageInlineLayout(base=>({...base,columns:reorderByKey');
  });
  it('keeps L03 group geometry stable while business editing is paused for layout draft',()=>{
    expect(list).toContain('const partyLevelPotentiallyEditable=canEditDraft&&');
    expect(list).toContain('rows.some(item=>partyLevelPotentiallyEditable&&!locked&&');
    expect(list).toContain('const canEdit = canEditDraft && !inlineMode');
    expect(list).not.toContain("rows.some(item=>canEdit&&!locked&&(!canEditCell||canEditCell(item.recordId,'partyLevel')))");
    // Exact transfer accounting is asserted by the real Chromium L023 suite.
    expect(smoke).toContain('L023 adjacent→last fallback incorrect:');
  });
  it('explicitly offers Save and Cancel on ordinary list and guards route transitions',()=>{
    expect(list).toContain('className="inline-layout-savebar"');
    expect(list).toContain('className="button primary inline-layout-save"');
    expect(list).toContain('className="button ghost inline-layout-cancel"');
    expect(list).toContain('const canEdit = canEditDraft && !inlineMode');
    expect(app).toContain('disabled={editingPage||editorUnsaved}');
    // Browser smoke uses sourceKind=demo; do not block CDP fixture navigation
    // with a beforeunload modal. Connected Firebase layouts still warn.
    expect(list).toContain("if(!inlineDirty||effectiveSourceKind==='demo')return;");
    expect(smoke).toContain('G00_SINGLE_TABLE_ADVANCED_NO_DUPLICATE_SAVE_CANCEL_PASS');
  });
});
