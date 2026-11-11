import {describe,it,expect,vi,afterEach} from 'vitest';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';

function storage():Storage {
  const data=new Map<string,string>();
  return {
    getItem:(key:string)=>data.get(key)??null,
    setItem:(key:string,value:string)=>{data.set(key,value);},
    removeItem:(key:string)=>{data.delete(key);},
    clear:()=>data.clear(),
    key:(index:number)=>[...data.keys()][index]??null,
    get length(){return data.size;}
  } as Storage;
}
const mockDb={} as Database;
const session=(generationId:string)=>new CellEditSessionManager(mockDb,
  ()=>({uid:'anonymous-fixture',isAnonymous:true} as User),generationId);
afterEach(()=>vi.unstubAllGlobals());
describe('PR95 app generation-scoped lease invalidation (synthetic only)',()=>{
  it('never offers a previous generation draft for a reused recordId',async()=>{
    vi.stubGlobal('sessionStorage',storage());
    const old=session('gen_first_20261030');
    expect(old.preserveDraft('r1','note','Older generation')).toBe(true);
    expect(old.recoverDraft('r1','note')).toBe('Older generation');
    const fresh=session('gen_second_20261030');
    expect(fresh.recoverDraft('r1','note')).toBeNull();
    expect(fresh.preserveDraft('r1','note','New generation')).toBe(true);
    expect(fresh.recoverDraft('r1','note')).toBe('New generation');
    await old.dispose();
    await fresh.dispose();
  });
  it('disables all local lease actions and old draft access after dispose',async()=>{
    vi.stubGlobal('sessionStorage',storage());
    const old=session('gen_first_20261030');
    old.preserveDraft('r1','note','Never autoapply');
    await old.dispose();
    expect(old.has('r1','note')).toBe(false);
    expect(old.isPending('r1','note')).toBe(false);
    expect(old.proof('r1','note')).toBeNull();
    expect(old.preserveDraft('r1','note','Overwrite attempt')).toBe(false);
    expect(old.recoverDraft('r1','note')).toBeNull();
    expect(()=>old.markPending('r1','note')).toThrow('Phiên sửa đã hết hiệu lực');
    await expect(old.acquire('r1','note','short')).rejects.toThrow('Phiên sửa đã hết hiệu lực');
  });
});
