import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {checkPointerSwap,createDatasetManifest,verifyCandidateReadback,
  type ActiveDatasetPointer} from '../src/data/dataset-replacement-integrity';

const operation='import_20261030_0001';
const rows=()=>createDemoItems(3).map(item=>({...item,revision:1,archivedAt:null,isDropped:false}));
const oldPointer:ActiveDatasetPointer={
  generationId:'gen_previous_safe',operationId:'previous_safe_0001',
  revision:8,rowCount:3,digest:'a'.repeat(64)
};

describe('read-only generation integrity preflight',()=>{
  it('gets identical SHA-256 for reordered rows, never mutates either input',async()=>{
    const list=rows(),snapshot=JSON.stringify(list);
    const original=await createDatasetManifest(list,operation);
    const reordered=await createDatasetManifest([...list].reverse(),operation);
    expect(original).toEqual(reordered);
    expect(original.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(list)).toBe(snapshot);
    await expect(verifyCandidateReadback([...list].reverse(),original)).resolves.toBeUndefined();
  });
  it('rejects changed fields, truncated readback, duplicate code and duplicate ID',async()=>{
    const list=rows(),manifest=await createDatasetManifest(list,operation);
    await expect(verifyCandidateReadback(list.slice(0,2),manifest)).rejects.toThrow('checksum');
    await expect(verifyCandidateReadback(list.map((r,i)=>i===1?{...r,note:'tampered'}:r),manifest))
      .rejects.toThrow('checksum');
    await expect(createDatasetManifest([list[0],{...list[1],displayCode:list[0].displayCode}],operation))
      .rejects.toThrow('trùng');
    await expect(createDatasetManifest([list[0],{...list[1],recordId:list[0].recordId}],operation))
      .rejects.toThrow('trùng');
  });
  it('rejects absent or invalid operation ID and unsafe revision/archive',async()=>{
    await expect(createDatasetManifest(rows(),'short')).rejects.toThrow('Mã thao tác');
    await expect(createDatasetManifest([],'import_123456789')).rejects.toThrow('1.000');
    await expect(createDatasetManifest([{...rows()[0],revision:2}],operation))
      .rejects.toThrow('revision=1');
    await expect(createDatasetManifest([{...rows()[0],isDropped:true}],operation))
      .rejects.toThrow('revision=1');
  });
  it('models one winning CAS, one stale tab and idempotent status check',async()=>{
    const manifest=await createDatasetManifest(rows(),operation);
    expect(checkPointerSwap(oldPointer,oldPointer,manifest)).toBe('ready');
    const committed:ActiveDatasetPointer={
      generationId:manifest.generationId,operationId:manifest.operationId,
      digest:manifest.digest,rowCount:manifest.rowCount,revision:oldPointer.revision+1
    };
    expect(checkPointerSwap(committed,oldPointer,manifest)).toBe('already-committed');
    expect(()=>checkPointerSwap({...oldPointer,revision:9},oldPointer,manifest))
      .toThrow('Con trỏ đã thay đổi');
    expect(()=>checkPointerSwap(null,oldPointer,manifest)).toThrow('Không tìm thấy');
    expect(()=>checkPointerSwap({...committed,digest:'b'.repeat(64)},oldPointer,manifest))
      .toThrow('Generation ID');
    expect(()=>checkPointerSwap({...committed,operationId:'another_op_0001'},oldPointer,manifest))
      .toThrow('Generation ID');
  });
});
