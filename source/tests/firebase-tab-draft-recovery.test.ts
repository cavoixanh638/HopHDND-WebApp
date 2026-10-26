import {afterEach,describe,expect,it,vi} from 'vitest';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import type {User} from 'firebase/auth';
import type {Database} from 'firebase/database';

const fakeStorage=():Storage=>{
  const values=new Map<string,string>();
  return {
    getItem:(key:string)=>values.get(key)??null,
    setItem:(key:string,value:string)=>{values.set(key,String(value));},
    removeItem:(key:string)=>{values.delete(key);},
    clear:()=>values.clear(),
    key:(index:number)=>[...values.keys()][index]??null,
    get length(){return values.size;}
  } as Storage;
};
afterEach(()=>vi.unstubAllGlobals());
describe('anonymous unsaved-cell local recovery despite rotating Firebase UID',()=>{
  it('recovers an unacknowledged draft after reload creates a new anonymous UID',async()=>{
    const sharedSession=fakeStorage(),sharedLocal=fakeStorage();
    vi.stubGlobal('sessionStorage',sharedSession);
    vi.stubGlobal('localStorage',sharedLocal);
    const manager=(uid:string,isAnonymous:boolean)=>new CellEditSessionManager({} as Database,
      ()=>({uid,isAnonymous} as User));
    const first=manager('old-anonymous-uid',true);
    expect(first.preserveDraft('r1','note','Chưa lưu, phải giữ nháp')).toBe(true);
    const reloaded=manager('new-anonymous-uid',true);
    expect(reloaded.recoverDraft('r1','note')).toBe('Chưa lưu, phải giữ nháp');
    expect(sharedLocal.length).toBe(0);
    await reloaded.finish('r1','note');
    expect(first.recoverDraft('r1','note')).toBeNull();
  });
  it('does not copy anonymous drafts across independent browser tab storage',()=>{
    const firstTab=fakeStorage(),secondTab=fakeStorage();
    vi.stubGlobal('sessionStorage',firstTab);
    const a=new CellEditSessionManager({} as Database,
      ()=>({uid:'A',isAnonymous:true} as User));
    expect(a.preserveDraft('r1','note','Tab A only')).toBe(true);
    vi.stubGlobal('sessionStorage',secondTab);
    const b=new CellEditSessionManager({} as Database,
      ()=>({uid:'B',isAnonymous:true} as User));
    expect(b.recoverDraft('r1','note')).toBeNull();
  });
  it('keeps signed-in administrator drafts keyed to persistent user identity',()=>{
    vi.stubGlobal('localStorage',fakeStorage());
    const admin=(uid:string)=>new CellEditSessionManager({} as Database,
      ()=>({uid,isAnonymous:false} as User));
    expect(admin('adminA').preserveDraft('r1','note','Admin A draft')).toBe(true);
    expect(admin('adminA').recoverDraft('r1','note')).toBe('Admin A draft');
    expect(admin('adminB').recoverDraft('r1','note')).toBeNull();
  });
});
