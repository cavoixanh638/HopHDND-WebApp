import {afterEach,describe,expect,it,vi} from 'vitest';
import {EXCEL_SOURCE_COLUMNS,loadItemLayout} from '../src/data/item-preferences';
import {defaultDetailGridPreferences,loadDetailGridPreferences,saveDetailGridPreferences,
  validateDetailGridPreferences} from '../src/data/report-detail-preferences';

afterEach(()=>vi.unstubAllGlobals());
const mockStorage=()=>{
 const entries=new Map<string,string>();
 return {entries,getItem:(key:string)=>entries.get(key)??null,
   setItem:(key:string,value:string)=>{entries.set(key,value);},
   removeItem:(key:string)=>{entries.delete(key);}};
};
describe('Bảng chi tiết báo cáo — cấu hình cột riêng',()=>{
 it('defaults to the 15 exact source A–O columns with useful first-view subset',()=>{
   const v=defaultDetailGridPreferences();
   expect(v.version).toBe(1);
   expect(v.columns.map(c=>c.key)).toEqual(EXCEL_SOURCE_COLUMNS.map(c=>c.key));
   expect(v.columns.filter(c=>c.visible).map(c=>c.key)).toContain('content');
   expect(v.columns.filter(c=>c.visible).map(c=>c.key)).toContain('progressCouncil');
   expect(v.columns.some(c=>String(c.key)==='history')).toBe(false);
 });
 it('allows reorder, hide and resize without mutating ItemList or report preferences',()=>{
   const storage=mockStorage();
   vi.stubGlobal('localStorage',storage);
   vi.stubGlobal('location',{pathname:'/HopHDND-WebApp/preview/custom-column-check/'});
   const original=defaultDetailGridPreferences();
   const columns=[original.columns[2],...original.columns.slice(0,2),...original.columns.slice(3)];
   columns[0]={...columns[0],width:520};
   columns[1]={...columns[1],visible:false};
   const selected={...original,columns};
   expect(saveDetailGridPreferences('source-a',selected)).toBe(true);
   expect(loadDetailGridPreferences('source-a')).toEqual(selected);
   expect(loadDetailGridPreferences('source-b')).toEqual(original);
   expect(loadItemLayout('source-a').columns.filter(c=>c.visible)).toHaveLength(15);
   expect([...storage.entries.keys()][0]).toContain('preview:custom-column-check:source-a');
   expect([...storage.entries.keys()][0]).not.toContain('item-layout');
 });
 it('refuses duplicate, unknown, all hidden and invalid widths / broken saved data',()=>{
   const base=defaultDetailGridPreferences();
   expect(()=>validateDetailGridPreferences({...base,columns:base.columns.map(c=>({...c,visible:false}))})).toThrow('ít nhất một');
   expect(()=>validateDetailGridPreferences({...base,columns:base.columns.map((c,i)=>i===1?{...c,key:base.columns[0].key}:c)})).toThrow();
   expect(()=>validateDetailGridPreferences({...base,columns:base.columns.map((c,i)=>i===1?{...c,key:'TU đã cho ý kiến'}:c)})).toThrow();
   expect(()=>validateDetailGridPreferences({...base,columns:base.columns.map((c,i)=>i===0?{...c,width:10000}:c)})).toThrow();
   const storage=mockStorage();vi.stubGlobal('localStorage',storage);
   storage.setItem('hdnd.report-detail-grid.v1:source-x','{"version":1,"columns":[]}');
   expect(loadDetailGridPreferences('source-x')).toEqual(base);
 });
});
