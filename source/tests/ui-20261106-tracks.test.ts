import {describe,it,expect} from 'vitest';
import {
  defaultItemLayout,validateItemLayout,validatePartyTrackWidths,
  fallbackPartyTrackWidths,resolvedPartyTrackWidths,partyTrackModeWidth,
  partyTrackPhysicalWidth,PARTY_TRACK_WIDTH_LIMITS,L03_RAIL_GAP_PX,L03_CELL_CHROME_PX
} from '../src/data/item-preferences';
import {LayoutConflictError,mergeItemLayout} from '../src/data/item-layout-merge';

const widths={
  readonly:{label:123,status:211},
  editable:{label:144,level:81,status:273}
};

describe('UI 06/11 TRACKS: five independently persisted L03 rails',()=>{
  it('accepts five asymmetric rails and yields exact rail+gap+chrome physical sums',()=>{
    const rails=validatePartyTrackWidths(widths);
    expect(rails).toEqual(widths);
    expect(partyTrackModeWidth(rails,'readonly')).toBe(123+211+L03_RAIL_GAP_PX+L03_CELL_CHROME_PX);
    expect(partyTrackModeWidth(rails,'editable')).toBe(144+81+273+L03_RAIL_GAP_PX*2+L03_CELL_CHROME_PX);
    expect(partyTrackPhysicalWidth(rails,false)).toBe(365);
    expect(partyTrackPhysicalWidth(rails,true)).toBe(537);
    expect(partyTrackPhysicalWidth({readonly:{label:400,status:500},editable:{label:84,level:76,status:112}},true))
      .toBe(400+500+8+23);
  });
  it('reports exactly which of five rails has invalid data',()=>{
    for(const mode of ['readonly','editable'] as const){
      for(const name of Object.keys(PARTY_TRACK_WIDTH_LIMITS[mode])){
        const lim=(PARTY_TRACK_WIDTH_LIMITS[mode] as Record<string,{min:number;max:number}>)[name];
        for(const value of [lim.min-1,lim.max+1,0.5,'100',null,NaN,Infinity]){
          const entry={...widths,[mode]:{...widths[mode],[name]:value}};
          expect(()=>validatePartyTrackWidths(entry)).toThrow(name==='level'?/Cấp trình TU/:
            name==='status'?/Tiến độ/:/Nhãn/);
        }
        expect(()=>validatePartyTrackWidths({...widths,[mode]:{...widths[mode],[name]:lim.min}})).not.toThrow();
        expect(()=>validatePartyTrackWidths({...widths,[mode]:{...widths[mode],[name]:lim.max}})).not.toThrow();
      }
    }
    expect(()=>validatePartyTrackWidths({...widths,unexpected:9})).toThrow();
    expect(()=>validatePartyTrackWidths({...widths,editable:{label:140,status:200}})).toThrow();
  });
  it('roundtrips five rails while keeping the legacy totals inert',()=>{
    const layout=validateItemLayout({...defaultItemLayout(),partyTrackWidths:widths,
      partyGroupWidths:{readonly:1200,editable:1500}});
    const loaded=validateItemLayout(JSON.parse(JSON.stringify(layout)));
    expect(resolvedPartyTrackWidths(loaded)).toEqual(widths);
    expect(loaded.partyGroupWidths).toEqual({readonly:1200,editable:1500});
    expect(partyTrackModeWidth(resolvedPartyTrackWidths(loaded),'readonly')).toBe(365);
  });
  it('legacy only resolves deterministic RAM fallback with no newly persisted key',()=>{
    const old=defaultItemLayout();delete old.partyTrackWidths;
    old.partyGroupWidths={readonly:420,editable:570};
    const validated=validateItemLayout(old);
    expect(Object.hasOwn(validated,'partyTrackWidths')).toBe(false);
    expect(resolvedPartyTrackWidths(validated)).toEqual(fallbackPartyTrackWidths(old.partyGroupWidths));
    expect(resolvedPartyTrackWidths(validated)).toEqual(resolvedPartyTrackWidths(validated));
    expect(partyTrackModeWidth(resolvedPartyTrackWidths(validated),'readonly')).toBe(420);
    expect(partyTrackModeWidth(resolvedPartyTrackWidths(validated),'editable')).toBe(570);
    const reloaded=validateItemLayout(JSON.parse(JSON.stringify(validated)));
    expect(Object.hasOwn(reloaded,'partyTrackWidths')).toBe(false);
  });
  it('keeps untouched legacy in RAM even when a concurrent title is committed',()=>{
    const base=defaultItemLayout();delete base.partyTrackWidths;
    const local={...base,listTitle:'Đổi tên'};
    const remote={...base,columns:base.columns.map(c=>c.key==='note'?{...c,width:321}:c)};
    const result=mergeItemLayout(base,local,remote);
    expect(Object.hasOwn(result,'partyTrackWidths')).toBe(false);
    expect(result.listTitle).toBe('Đổi tên');
    expect(result.columns.find(c=>c.key==='note')?.width).toBe(321);
  });
  it('merges disjoint rail edits across mode and other columns',()=>{
    const base=defaultItemLayout();
    const local={...base,partyTrackWidths:{...base.partyTrackWidths!,
      readonly:{...base.partyTrackWidths!.readonly,label:131}}};
    const remote={...base,partyTrackWidths:{...base.partyTrackWidths!,
      editable:{...base.partyTrackWidths!.editable,status:309}},
      columns:base.columns.map(c=>c.key==='note'?{...c,width:300}:c)};
    const merged=mergeItemLayout(base,local,remote);
    expect(merged.partyTrackWidths!.readonly.label).toBe(131);
    expect(merged.partyTrackWidths!.editable.status).toBe(309);
    expect(merged.columns.find(c=>c.key==='note')?.width).toBe(300);
  });
  it('conflicts only on the exact same rail field, resolves local or remote',()=>{
    const base=defaultItemLayout();
    const local={...base,partyTrackWidths:{...base.partyTrackWidths!,
      editable:{...base.partyTrackWidths!.editable,level:110}}};
    const remote={...base,partyTrackWidths:{...base.partyTrackWidths!,
      editable:{...base.partyTrackWidths!.editable,level:125}}};
    let failure:unknown;
    try{mergeItemLayout(base,local,remote);}catch(e){failure=e;}
    expect(failure).toBeInstanceOf(LayoutConflictError);
    expect((failure as LayoutConflictError).conflicts).toEqual([
      expect.objectContaining({id:'partyTrackWidths.editable.level',local:'110 px',remote:'125 px'})
    ]);
    expect(mergeItemLayout(base,local,remote,{'partyTrackWidths.editable.level':'local'})
      .partyTrackWidths?.editable.level).toBe(110);
    expect(mergeItemLayout(base,local,remote,{'partyTrackWidths.editable.level':'remote'})
      .partyTrackWidths?.editable.level).toBe(125);
  });
  it('does not let older legacy preference override remotely committed five rails',()=>{
    const base=defaultItemLayout();delete base.partyTrackWidths;
    const local={...base,listTitle:'Nháp cũ'};
    const remote={...base,partyTrackWidths:widths};
    const merged=mergeItemLayout(base,local,remote);
    expect(merged.partyTrackWidths).toEqual(widths);
    expect(merged.listTitle).toBe('Nháp cũ');
  });
});
