import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const list=read('../src/features/items/ItemList.tsx');
const panel=read('../src/features/items/ItemColumnPanel.tsx');
const header=read('../src/features/items/ColumnHeader.tsx');
const borderCss=read('../src/components/inline-g07-resize.css');

describe('G00 direct Admin header editing in Customize mode',()=>{
  it('offers the eye in Customize mode, not only View mode',()=>{
    expect(list).toContain('const canDraftEditHeaders=customizing&&adminControls&&!locked&&allowLayout;');
    expect(list).toContain('inlineEditing={headerInlineEditing} quickVisibility={headerQuickVisibility}');
    expect(header).toContain('const visibilityEnabled=inlineEditing||quickVisibility');
  });
  it('keeps Customize changes in recoverable draft, never calls viewer CAS',()=>{
    expect(list).toContain('if(canDraftEditHeaders){\n      if(key');
    expect(list).toContain('setLayout(previous=>setInlineColumnVisibility(previous,key,visible))');
    expect(list).toContain('const next=renameInlineColumn(activeLayout,key,label)');
    expect(list).toContain('setLayout(next)');
    expect(list).toContain('changeInlineColumnVisibility(key,visible)');
    expect(list).toContain('return changeInlineColumnName(key,label)');
  });
  it('opens the selected field when launched from the column header',()=>{
    expect(list).toContain('setRequestedColumnFocus(key)');
    expect(panel).toContain('if(focusColumnKey){setSelected(focusColumnKey);setAdvancedOpen(true);}');
  });
  it('leaves drag at the real separator and does not restore a floating grip',()=>{
    expect(borderCss).toContain('right:-7px;width:14px;min-width:14px');
    expect(borderCss).toContain('cursor:col-resize');
    expect(borderCss).toContain('content:none;display:none!important;');
  });
});
