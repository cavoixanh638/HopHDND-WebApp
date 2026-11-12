import {describe,it,expect} from 'vitest';
import {
  DEFAULT_PARTY_GROUP_WIDTHS,PARTY_GROUP_WIDTH_LIMITS,defaultItemLayout,
  partyGroupPhysicalWidth,validateItemLayout,validatePartyGroupWidths
} from '../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';

describe('L03 shared 2/3-track physical widths',()=>{
  it('preserves narrow administrator widths instead of restoring oversized minimums',()=>{
    const widths={readonly:180,editable:260};
    const saved=validateItemLayout({...defaultItemLayout(),partyGroupWidths:widths});
    expect(saved.partyGroupWidths).toEqual(widths);
    expect(partyGroupPhysicalWidth(saved.partyGroupWidths!,false)).toBe(180);
    expect(partyGroupPhysicalWidth(saved.partyGroupWidths!,true)).toBe(260);
  });
  it('migrates old layouts without changing column order, source widths or visibility',()=>{
    const old=defaultItemLayout();
    delete old.partyGroupWidths;
    old.columns=old.columns.map(c=>c.key==='partyLevel'?{...c,width:777}:c);
    const migrated=validateItemLayout(old);
    expect(migrated.partyGroupWidths).toEqual(DEFAULT_PARTY_GROUP_WIDTHS);
    expect(migrated.columns.map(c=>c.key)).toEqual(old.columns.map(c=>c.key));
    expect(migrated.columns.find(c=>c.key==='partyLevel')?.width).toBe(777);
  });
  it('uses exactly one physical width for all readonly rows and the max mode for mixed grants',()=>{
    const widths={readonly:390,editable:600};
    expect(partyGroupPhysicalWidth(widths,false)).toBe(390);
    expect(partyGroupPhysicalWidth(widths,true)).toBe(600);
    expect(partyGroupPhysicalWidth({readonly:650,editable:600},true)).toBe(650);
  });
  it('validates both widths atomically within explicit limits',()=>{
    expect(validatePartyGroupWidths({readonly:420,editable:570})).toEqual({readonly:420,editable:570});
    for(const key of ['readonly','editable'] as const){
      const limits=PARTY_GROUP_WIDTH_LIMITS[key];
      for(const value of [limits.min-1,limits.max+1,100.5,NaN,Infinity,'600',null]){
        const input={readonly:420,editable:570,[key]:value};
        expect(()=>validatePartyGroupWidths(input)).toThrow(/Độ rộng L03/);
      }
      expect(validatePartyGroupWidths({readonly:420,editable:570,[key]:limits.min})[key]).toBe(limits.min);
      expect(validatePartyGroupWidths({readonly:420,editable:570,[key]:limits.max})[key]).toBe(limits.max);
    }
    expect(()=>validatePartyGroupWidths({readonly:420})).toThrow();
    expect(()=>validatePartyGroupWidths({readonly:420,editable:570,other:1})).toThrow();
  });
  it('merges disjoint concurrent mode changes and unrelated column resizing',()=>{
    const base=defaultItemLayout();
    const local={...base,partyGroupWidths:{readonly:400,editable:570}};
    const remote={...base,partyGroupWidths:{readonly:420,editable:650},
      columns:base.columns.map(c=>c.key==='note'?{...c,width:320}:c)};
    const result=mergeItemLayout(base,local,remote);
    expect(result.partyGroupWidths).toEqual({readonly:400,editable:650});
    expect(result.columns.find(c=>c.key==='note')?.width).toBe(320);
  });
  it('does not lose widths when older profiles concurrently change title',()=>{
    const base=validateItemLayout({...defaultItemLayout(),partyGroupWidths:undefined});
    const local={...base,partyGroupWidths:{readonly:410,editable:630}};
    const remote={...base,listTitle:'Tiêu đề mới'};
    const merged=mergeItemLayout(base,local,remote);
    expect(merged.partyGroupWidths).toEqual(local.partyGroupWidths);
    expect(merged.listTitle).toBe('Tiêu đề mới');
  });
  it('fails closed for same-mode conflicting edits and accepts explicit remote/local resolution',()=>{
    const base=defaultItemLayout();
    const local={...base,partyGroupWidths:{readonly:480,editable:570}};
    const remote={...base,partyGroupWidths:{readonly:510,editable:570}};
    let failure:unknown;
    try{mergeItemLayout(base,local,remote);}catch(e){failure=e;}
    expect(failure).toBeInstanceOf(LayoutConflictError);
    expect((failure as LayoutConflictError).conflicts).toEqual([
      expect.objectContaining({id:'partyGroupWidths.readonly',original:'420 px',
        local:'480 px',remote:'510 px'})
    ]);
    expect(mergeItemLayout(base,local,remote,{'partyGroupWidths.readonly':'local'}).partyGroupWidths?.readonly).toBe(480);
    expect(mergeItemLayout(base,local,remote,{'partyGroupWidths.readonly':'remote'}).partyGroupWidths?.readonly).toBe(510);
  });
});
