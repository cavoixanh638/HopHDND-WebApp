import {afterEach,describe,expect,it,vi} from 'vitest';
import {defaultDetailGridPreferences} from '../src/data/report-detail-preferences';
import {loadDetailColors,loadDetailPresets,saveDetailColors,saveDetailPresets,validateDetailPreset} from '../src/data/report-detail-presets';

const memory=()=>{
 const data=new Map<string,string>();
 return {data,getItem:(k:string)=>data.get(k)??null,
   setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
};
afterEach(()=>vi.unstubAllGlobals());
describe('Mẫu hiển thị và màu popup độc lập',()=>{
 it('stores column presets, filters and conditional colors without changing main-list keys',()=>{
   const storage=memory();vi.stubGlobal('localStorage',storage);
   vi.stubGlobal('location',{pathname:'/preview/detail-grid-parity/'});
   const layout=defaultDetailGridPreferences();
   const view={id:'preset_001',name:'Tiến độ nghị quyết',layout,filters:{progressCouncil:'VP'},
     colors:[{id:'color001',field:'progressCouncil',value:'Sở chưa trình',color:'rose' as const}]};
   expect(saveDetailPresets('source-a',[view])).toBe(true);
   expect(loadDetailPresets('source-a')).toEqual([view]);
   expect(loadDetailPresets('source-b')).toEqual([]);
   expect(saveDetailColors('source-a',view.colors)).toBe(true);
   expect(loadDetailColors('source-a')).toEqual(view.colors);
   expect([...storage.data.keys()].every(k=>k.includes('preview:detail-grid-parity:source-a'))).toBe(true);
   expect([...storage.data.keys()].some(k=>k.includes('hdnd.list-views')||k.includes('hdnd.item-layout'))).toBe(false);
 });
 it('rejects unknown sheet columns, malformed preset values and too many views',()=>{
   const v={id:'preset_001',name:'Mẫu',layout:defaultDetailGridPreferences(),filters:{content:'NQ'},colors:[]};
   expect(validateDetailPreset(v)).toEqual(v);
   expect(()=>validateDetailPreset({...v,filters:{'TU đã cho ý kiến':'Không hợp lệ'}})).toThrow();
   expect(()=>validateDetailPreset({...v,name:'   '})).toThrow();
   expect(()=>validateDetailPreset({...v,layout:{...v.layout,columns:[]}})).toThrow();
   const storage=memory();vi.stubGlobal('localStorage',storage);
   expect(saveDetailPresets('s',Array(13).fill(v))).toBe(false);
   storage.setItem('hdnd.report-detail-presets.v1:s','[{bad json]');
   expect(loadDetailPresets('s')).toEqual([]);
 });
});
