import {describe,it,expect,vi,beforeEach} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {FirebaseRepository,sameDatasetEpoch} from '../src/data/firebase-repository';
import type {ActiveDatasetPointer} from '../src/data/dataset-replacement-integrity';
import type {Database} from 'firebase/database';
const io=vi.hoisted(()=>({get:vi.fn(),transaction:vi.fn(),listeners:new Map<string,{next:(s:any)=>void;fail:(e:Error)=>void}>()}));
vi.mock('firebase/database',()=>({
  ref:(_db:any,path:string)=>path,get:io.get,runTransaction:io.transaction,
  onValue:(path:string,next:(s:any)=>void,fail:(e:Error)=>void)=>{
    io.listeners.set(path,{next,fail});return()=>{io.listeners.delete(path);};
  },serverTimestamp:()=>Date.now(),update:vi.fn()
}));
const pointer:ActiveDatasetPointer={
  generationId:'gen_operation_test_a001',operationId:'operation_test_a001',
  revision:4,rowCount:1,digest:'a'.repeat(64)
};
const row=createDemoItems(1)[0];
const path='hdnd/datasetV2/generations/'+pointer.generationId+'/items';
const db={} as Database;
const make=()=>new FirebaseRepository(db,()=>null,()=>({columns:{}}),path,pointer);
const emit=(path:string,value:unknown)=>io.listeners.get(path)!.next({val:()=>value});
beforeEach(()=>{
  io.get.mockReset();io.transaction.mockReset();io.listeners.clear();
  io.get.mockImplementation(async (path:string)=>({
    val:()=>path==='hdnd/datasetV2/active'?pointer:path.endsWith('/history')?{}:{[row.recordId]:row}
  }));
});
describe('PR95 L2 active Firebase generation fencing',()=>{
  it('compares every active-pointer field, including reused generation IDs',()=>{
    expect(sameDatasetEpoch({...pointer},pointer)).toBe(true);
    for(const key of ['generationId','operationId','revision','rowCount','digest'] as const)
      expect(sameDatasetEpoch({...pointer,[key]:key==='revision'?5:'other'},pointer)).toBe(false);
    expect(sameDatasetEpoch(null,pointer)).toBe(false);
  });
  it('reads only active-generation rows after verifying the pointer twice',async()=>{
    expect(await make().list()).toEqual([row]);
    expect(io.get.mock.calls.map(call=>call[0])).toEqual([
      'hdnd/datasetV2/active',path,'hdnd/datasetV2/active']);
  });
  it('fails closed if pointer changes during the row read',async()=>{
    let pointerReads=0;
    io.get.mockImplementation(async (at:string)=>({
      val:()=>at==='hdnd/datasetV2/active'
        ?(++pointerReads===1?pointer:{...pointer,revision:5}):{[row.recordId]:row}
    }));
    await expect(make().list()).rejects.toThrow('Thế hệ Firebase đã thay đổi');
  });
  it('blocks stale history and save without contacting the row transaction',async()=>{
    io.get.mockImplementation(async()=>({val:()=>({...pointer,digest:'b'.repeat(64)})}));
    await expect(make().history(row.recordId)).rejects.toThrow('Thế hệ Firebase');
    const result=await make().save([{recordId:row.recordId,sourceCode:row.displayCode,
      baseRevision:row.revision,baseValues:{note:row.note},changes:{note:'Nháp mới'},operationId:'test-operation'}]);
    expect(result[0].ok).toBe(false);
    expect(io.transaction).not.toHaveBeenCalled();
  });
  it('never emits rows until pointer is confirmed, and rejects old subscription on swap',()=>{
    const next=vi.fn(),error=vi.fn(),stop=make().subscribe(next,error);
    emit(path,{[row.recordId]:row});
    expect(next).not.toHaveBeenCalled();
    emit('hdnd/datasetV2/active',pointer);
    emit(path,{[row.recordId]:row});
    expect(next).toHaveBeenCalledOnce();
    emit('hdnd/datasetV2/active',{...pointer,operationId:'operation_test_other'});
    expect(error).toHaveBeenCalledOnce();
    emit(path,{[row.recordId]:row});
    expect(next).toHaveBeenCalledOnce();
    stop();
    expect(io.listeners.size).toBe(0);
  });
});
