import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {DEFAULT_SHEET_URL,parseSheetConfig} from '../src/data/sheet-config';
import {loadSessionMirror,storeSessionMirror,clearSessionMirrors} from '../src/data/firebase-snapshot-cache';
const source=parseSheetConfig(DEFAULT_SHEET_URL);
const uid='viewer-validated-1';
const row={...createDemoItems(1)[0],recordId:source.spreadsheetId+':'+source.gid+':row:7'};
const valid={schemaVersion:1 as const,source:source.spreadsheetId+':'+source.gid,
  syncedAt:'2026-10-23T03:00:00Z',sourceModifiedAt:'2026-10-23T02:00:00Z',
  sha256:'a'.repeat(64),rows:[row]};
function memorySessionStorage(){
 const data=new Map<string,string>();
 return {getItem:(k:string)=>data.get(k)??null,
   setItem:(k:string,v:string)=>{data.set(k,v);},
   removeItem:(k:string)=>{data.delete(k);},
   get length(){return data.size;},
   key:(index:number)=>[...data.keys()][index]??null};
}
beforeEach(()=>vi.stubGlobal('sessionStorage',memorySessionStorage()));
afterEach(()=>vi.unstubAllGlobals());
describe('authenticated user session mirror',()=>{
 it('uses cached 55-ish rows only after a matching UID and source is available',()=>{
   expect(storeSessionMirror(uid,source,valid,1000)).toBe(true);
   expect(loadSessionMirror('',source,1200)).toBeNull();
   expect(loadSessionMirror('other-uid',source,1200)).toBeNull();
   expect(loadSessionMirror(uid,{...source,gid:'1'},1200)).toBeNull();
   expect(loadSessionMirror(uid,source,1200)?.rows).toEqual([row]);
 });
 it('expires after 15 minutes even when data has not been updated by the source',()=>{
   storeSessionMirror(uid,source,valid,1000);
   expect(loadSessionMirror(uid,source,1000+15*60*1000+1)).toBeNull();
   expect(loadSessionMirror(uid,source,1000+500)).toBeNull();
 });
 it('rejects malformed snapshots and clears all session mirrors on logout',()=>{
   expect(storeSessionMirror(uid,source,{...valid,rows:[]})).toBe(false);
   expect(storeSessionMirror(uid,source,valid,6000)).toBe(true);
   clearSessionMirrors();
   expect(loadSessionMirror(uid,source,6001)).toBeNull();
 });
});
