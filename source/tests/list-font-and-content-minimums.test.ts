import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout,saveNewLayoutPreset,applyLayoutPreset,updateActiveLayoutPreset,DEFAULT_PARTY_TRACK_WIDTHS} from '../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';
import {emptyListContentMinimums,withPartyContentMinimums} from '../src/features/items/list-nowrap-widths';
import {l03ResizeBoundary} from '../src/features/items/L03InlineWidthControl';
import {projectedPhysicalLimits} from '../src/data/resize-last-column';

describe('List font and protected content widths',()=>{
  it('keeps legacy layout inheritance and stores explicit sizes in separate shared presets',()=>{
    const base=defaultItemLayout();
    expect(validateItemLayout(base).tableFontSize).toBeUndefined();
    const legacy=saveNewLayoutPreset(base,'preset_legacy','Cũ');
    const a=saveNewLayoutPreset({...legacy,tableFontSize:16},'preset_font_a','16px');
    const b=saveNewLayoutPreset({...a,tableFontSize:20},'preset_font_b','20px');
    const loaded=validateItemLayout(JSON.parse(JSON.stringify(b)));
    expect(loaded.tableFontSize).toBe(20);
    expect(applyLayoutPreset(loaded,'preset_font_a').tableFontSize).toBe(16);
    expect(applyLayoutPreset(loaded,'preset_legacy').tableFontSize).toBeUndefined();
    const updated=updateActiveLayoutPreset({...applyLayoutPreset(loaded,'preset_font_a'),tableFontSize:18});
    expect(applyLayoutPreset(updated,'preset_font_a').tableFontSize).toBe(18);
    expect(applyLayoutPreset(updated,'preset_font_b').tableFontSize).toBe(20);
    for(const size of [10,21,13.5,NaN,'16'])
      expect(()=>validateItemLayout({...base,tableFontSize:size})).toThrow(/Cỡ chữ/);
  });
  it('merges font edits via existing shared CAS and rejects a conflicting edit',()=>{
    const base=defaultItemLayout();
    expect(mergeItemLayout(base,{...base,tableFontSize:18},{...base,listTitle:'Báo cáo'})).toMatchObject({tableFontSize:18,listTitle:'Báo cáo'});
    expect(()=>mergeItemLayout(base,{...base,tableFontSize:16},{...base,tableFontSize:20})).toThrow(LayoutConflictError);
  });
  it('projects measured rails without changing saved pixels; guards drag minima',()=>{
    const saved=structuredClone(DEFAULT_PARTY_TRACK_WIDTHS);
    const floor=emptyListContentMinimums().party;
    floor.readonly={label:160,status:195};
    floor.editable={label:160,level:90,status:220};
    const effective=withPartyContentMinimums(saved,floor);
    expect(effective).toEqual(floor);
    expect(saved).toEqual(DEFAULT_PARTY_TRACK_WIDTHS);
    expect(l03ResizeBoundary(effective,'readonly',0,-50,floor)).toBe(effective);
    expect(l03ResizeBoundary(effective,'readonly',0,50,floor)).toBe(effective);
    expect(projectedPhysicalLimits('room',{room:70},true,{room:280}).min).toBe(280);
    expect(withPartyContentMinimums(saved,emptyListContentMinimums().party)).toEqual(saved);
  });
});


describe('Save As preserves the original named layout',()=>{
  it('copies the entire edited presentation, leaving the original unchanged after CAS and JSON reload',()=>{
    const original=saveNewLayoutPreset({...defaultItemLayout(),tableFontSize:13},'preset_orig1','Gốc 1');
    const snapshot=structuredClone(original.savedLayouts![0]);
    const edited={...original,tableFontSize:20,listTitle:'Bản mới',columns:original.columns.map(c=>c.key==='content'?{...c,width:c.width+40}:c),compactDisplay:{...original.compactDisplay!,mergeTypeIntoContent:false}};
    const copy=saveNewLayoutPreset(edited,'preset_copy2','Gốc 2');
    const saved=validateItemLayout(JSON.parse(JSON.stringify(mergeItemLayout(original,copy,original))));
    expect(saved.savedLayouts![0]).toEqual(snapshot);
    expect(saved.activeLayoutId).toBe('preset_copy2');
    expect(applyLayoutPreset(saved,'preset_orig1').tableFontSize).toBe(13);
    const reopened=applyLayoutPreset(saved,'preset_copy2');
    expect(reopened.tableFontSize).toBe(20);
    expect(reopened.listTitle).toBe('Bản mới');
    expect(reopened.compactDisplay?.mergeTypeIntoContent).toBe(false);
    expect(reopened.columns.find(c=>c.key==='content')?.width).toBe(edited.columns.find(c=>c.key==='content')?.width);
  });
});
