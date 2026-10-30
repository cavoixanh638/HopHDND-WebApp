import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {checkPointerSwap,createDatasetManifest,verifyCandidateServerReadback,
  type ActiveDatasetPointer} from '../src/data/dataset-replacement-integrity';
import {previewDatasetReplacement} from '../src/data/dataset-replacement-preview';

const OP='pr95_l3_manifest_001';
const rows=()=>createDemoItems(2).map((row,i)=>({...row,
  recordId:'l3-'+(i+1),displayCode:'NQ'+(i+41),revision:1,archivedAt:null,isDropped:false}));
const pointer=(digest:string):ActiveDatasetPointer=>({
  generationId:'gen_previous_l3_0001',operationId:'previous_l3_0001',
  revision:7,rowCount:2,digest
});

describe('PR95 L3 generation preflight is not RTDB authorization',()=>{
  it('hashes row content independent of row order; detects one-cell mutation',async()=>{
    const list=rows(), original=JSON.stringify(list);
    const a=await createDatasetManifest(list,OP);
    const b=await createDatasetManifest([...list].reverse(),OP);
    expect(a).toEqual(b);
    expect(JSON.stringify(list)).toBe(original);
    await expect(verifyCandidateServerReadback(
      Object.fromEntries(list.map(x=>[x.recordId,x])),a)).resolves.toBeUndefined();
    await expect(verifyCandidateServerReadback(
      Object.fromEntries(list.map((x,i)=>[x.recordId,i?{...x,note:'altered'}:x])),a))
      .rejects.toThrow('checksum');
  });
  it('rejects forged RTDB keys, missing rows and inherited history/lease identity',async()=>{
    const list=rows(), manifest=await createDatasetManifest(list,OP);
    await expect(verifyCandidateServerReadback(
      {'wrong-record-id':list[0],[list[1].recordId]:list[1]},manifest))
      .rejects.toThrow('recordId');
    await expect(verifyCandidateServerReadback({[list[0].recordId]:list[0]},manifest))
      .rejects.toThrow('Số hồ sơ');
    for(const poisoned of [
      {...list[0],history:{0:{actor:'previous'}}},
      {...list[0],editProofs:{note:'previous'}},
      {...list[0],permissions:{columns:{note:true}}},
      {...list[0],updatedBy:'previous'}
    ]){
      await expect(createDatasetManifest([poisoned,...list.slice(1)],OP))
        .rejects.toThrow('quyền/khóa/lịch sử');
    }
  });
  it('does not authorize pointer swap when any expected pointer field is stale',async()=>{
    const manifest=await createDatasetManifest(rows(),OP);
    const expected=pointer('a'.repeat(64));
    expect(checkPointerSwap(expected,expected,manifest)).toBe('ready');
    for(const stale of [
      {...expected,revision:expected.revision+1},
      {...expected,digest:'b'.repeat(64)},
      {...expected,rowCount:1},
      {...expected,operationId:'changed_operation_001'}
    ]){
      expect(()=>checkPointerSwap(stale,expected,manifest)).toThrow('Con trỏ đã thay đổi');
    }
    const committed:ActiveDatasetPointer={
      generationId:manifest.generationId,operationId:OP,
      revision:expected.revision+1,rowCount:manifest.rowCount,digest:manifest.digest
    };
    expect(checkPointerSwap(committed,expected,manifest)).toBe('already-committed');
    expect(()=>checkPointerSwap({...committed,digest:'b'.repeat(64)},expected,manifest))
      .toThrow('Generation ID');
  });
  it('keeps removed rows removed and reused display codes explicitly CHANGED',()=>{
    const existing=rows();
    const incoming=[
      {...existing[0],recordId:'l3-new-record',content:'Nội dung mới'},
      {...existing[1],recordId:'l3-new-two',displayCode:'NQ99'}
    ];
    const preview=previewDatasetReplacement(existing,incoming);
    expect(preview.difference.changed).toContain(existing[0].displayCode);
    expect(preview.difference.removed).toContain(existing[1].displayCode);
    expect(preview.difference.added).toContain('NQ99');
  });
});
