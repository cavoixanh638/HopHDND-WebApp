import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {prepareCandidate,captureOldSnapshot,datasetSignature,planAtomicSwap,
  prepareRestoreCandidate,type DatasetStage} from '../src/data/atomic-dataset-replacement';
const old=createDemoItems(2).map((x,i)=>({...x,recordId:'legacy_'+i,revision:2}));
const rows=Object.fromEntries(old.map(x=>[x.recordId,x]));
const build=(op='operation_tab_a')=>{
  const original={items:rows,permissions:{columns:{note:true},
    rows:{legacy_0:true},cells:{legacy_0:{content:true}}},
    editLocks:{legacy_0:{note:{uid:'someone',token:'stale'}}},
    profile:{revision:5,layout:'never remove'},editors:{administrator:true},
    control:{revision:2,editingLocked:false}};
  const candidate=prepareCandidate(createDemoItems(1),op,'administrator');
  const stage:DatasetStage={operationId:op,candidate,
    backup:captureOldSnapshot(original),baselineSignature:datasetSignature(original),
    candidateSignature:'test',createdAt:1,owner:'administrator',count:1,
    fileName:'test.xlsx',candidateCodes:['NQ01']};
  return {original:{...original,importVault:{[op]:stage}},stage};
};
describe('atomic complete dataset replacement plan (pure server-CAS model)',()=>{
  it('swaps the entire item set atomically, preserving system config but clearing row grants and locks',()=>{
    const {original,stage}=build();
    const next=planAtomicSwap(original,stage);
    expect(Object.keys(next.items as object)).toEqual(Object.keys(stage.candidate));
    expect(next.items).not.toHaveProperty('legacy_0');
    expect(next.items).not.toHaveProperty('legacy_1');
    expect((next.permissions as any).columns).toEqual({note:true});
    expect((next.permissions as any).rows).toEqual({});
    expect((next.permissions as any).cells).toEqual({});
    expect(next.editLocks).toBeNull();
    expect(next.profile).toEqual(original.profile);
    expect(next.editors).toEqual(original.editors);
    expect((next.importState as any).operationId).toBe(stage.operationId);
  });
  it('blocks source update after preview, including a permission or lock change',()=>{
    const {original,stage}=build();
    expect(()=>planAtomicSwap({...original,items:{...rows,new_record:old[0]}},stage)).toThrow(/thay đổi/);
    expect(()=>planAtomicSwap({...original,permissions:{columns:{note:false}}},stage)).toThrow(/thay đổi/);
    expect(()=>planAtomicSwap({...original,editLocks:{new_id:{note:{}}}},stage)).toThrow(/thay đổi/);
  });
  it('does not replay the same operation if ACK is lost and status is already committed',()=>{
    const {original,stage}=build();
    const first=planAtomicSwap(original,stage);
    expect(planAtomicSwap(first,stage)).toBe(first);
  });
  it('cannot reuse old IDs even for identical business codes or restored backup',()=>{
    const {original,stage}=build();
    const changed=prepareCandidate(old,'operation_tab_b','administrator');
    expect(Object.keys(changed)).not.toContain('legacy_0');
    expect(Object.keys(changed)).not.toEqual(Object.keys(stage.candidate));
    const restore=prepareRestoreCandidate(stage.backup,'operation_restore','administrator');
    expect(Object.keys(restore).every(x=>x.startsWith('g_operation_restore_'))).toBe(true);
    expect(Object.keys(restore).some(x=>x in original.items)).toBe(false);
  });
  it('rejects empty candidate, duplicate codes and repeated staging identity',()=>{
    expect(()=>prepareCandidate([],'operation_empty','administrator')).toThrow(/rỗng/);
    const candidate=createDemoItems(2);
    candidate[1]={...candidate[1],displayCode:candidate[0].displayCode};
    expect(()=>prepareCandidate(candidate,'operation_dup','administrator')).toThrow(/trùng/);
    const {original,stage}=build();
    expect(()=>planAtomicSwap({...original,importVault:{[stage.operationId]:{...stage,owner:'other'}}},stage))
      .toThrow(/đổi|thay đổi/);
  });
});
