import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout,saveNewLayoutPreset,applyLayoutPreset,updateActiveLayoutPreset,renameLayoutPreset,deleteLayoutPreset} from '../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';

describe('Database shared named visual presets',()=>{
  it('keeps old document grouping on migration and persists explicit false',()=>{
    const layout=defaultItemLayout();
    delete layout.compactDisplay!.mergeTypeIntoContent;
    delete layout.compactDisplay!.mergeDepartmentIntoContent;
    const migrated=validateItemLayout(layout);
    expect(migrated.compactDisplay?.mergeTypeIntoContent).toBe(true);
    expect(migrated.compactDisplay?.mergeDepartmentIntoContent).toBe(true);
    expect(validateItemLayout({...migrated,compactDisplay:{...migrated.compactDisplay!,mergeTypeIntoContent:false}}).compactDisplay?.mergeTypeIntoContent).toBe(false);
  });
  it('saves, selects, updates, renames and deletes distinct named presets across JSON reload',()=>{
    const base=defaultItemLayout();
    const a=saveNewLayoutPreset(base,'preset_a1','Toàn bộ');
    const b=saveNewLayoutPreset({...a,frameWidth:900,compactDisplay:{...a.compactDisplay!,mergeTypeIntoContent:false}},'preset_b1','Gọn');
    const reloaded=validateItemLayout(JSON.parse(JSON.stringify(b)));
    expect(reloaded.savedLayouts?.length).toBe(2);
    expect(reloaded.activeLayoutId).toBe('preset_b1');
    const renamed=renameLayoutPreset(reloaded,'preset_b1','  Báo cáo nhanh ');
    expect(renamed.savedLayouts?.find(p=>p.id==='preset_b1')?.name).toBe('Báo cáo nhanh');
    expect(renamed.savedLayouts?.find(p=>p.id==='preset_b1')?.layout).toEqual(reloaded.savedLayouts?.find(p=>p.id==='preset_b1')?.layout);
    expect(renamed.activeLayoutId).toBe('preset_b1');
    expect(()=>renameLayoutPreset(renamed,'preset_b1','toàn bộ')).toThrow(/tồn tại/);
    expect(()=>renameLayoutPreset(renamed,'preset_b1',' ')).toThrow();
    const loaded=applyLayoutPreset(renamed,'preset_a1');
    expect(loaded.frameWidth).toBe(base.frameWidth);
    expect(loaded.compactDisplay?.mergeTypeIntoContent).toBe(true);
    const updated=updateActiveLayoutPreset({...loaded,frameWidth:1100});
    expect(applyLayoutPreset(updated,'preset_a1').frameWidth).toBe(1100);
    expect(applyLayoutPreset(updated,'preset_b1').frameWidth).toBe(900);
    const removed=deleteLayoutPreset(updated,'preset_a1');
    expect(removed.activeLayoutId).toBeUndefined();
    expect(removed.frameWidth).toBe(1100);
    expect(removed.savedLayouts?.map(p=>p.id)).toEqual(['preset_b1']);
  });
  it('never copies custom field values/options into a preset or overwrites live values',()=>{
    const base=defaultItemLayout();
    base.columns.push({key:'custom_test0001',label:'Ghi thêm',width:120,visible:true,origin:'custom',kind:'select',options:['A','B'],values:{record1:'A'}});
    const saved=saveNewLayoutPreset(base,'preset_a1','Mẫu A');
    const stored=saved.savedLayouts![0].layout.columns.find(c=>c.origin==='custom')!;
    expect(stored.values).toBeUndefined();expect(stored.options).toBeUndefined();expect(stored.kind).toBeUndefined();
    const live={...saved,columns:saved.columns.map(c=>c.origin==='custom'?{...c,removed:true,values:{record1:'B'}}:c)};
    const applied=applyLayoutPreset(live,'preset_a1');
    expect(applied.columns.find(c=>c.origin==='custom')).toMatchObject({removed:true,values:{record1:'B'},options:['A','B'],kind:'select'});
  });
  it('retains unrelated remote changes via existing CAS merge and detects competing lists',()=>{
    const base=defaultItemLayout();
    const a=saveNewLayoutPreset(base,'preset_a1','Mẫu A');
    const b=saveNewLayoutPreset(base,'preset_b1','Mẫu B');
    const merged=mergeItemLayout(base,a,{...base,listTitle:'Danh sách mới'});
    expect(merged.savedLayouts?.[0].id).toBe('preset_a1');expect(merged.listTitle).toBe('Danh sách mới');
    expect(()=>mergeItemLayout(base,a,b)).toThrow(LayoutConflictError);
    expect(()=>saveNewLayoutPreset(a,'preset_b1','mẫu a')).toThrow(/tồn tại/);
  });
});
