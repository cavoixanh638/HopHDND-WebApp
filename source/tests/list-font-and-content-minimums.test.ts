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
