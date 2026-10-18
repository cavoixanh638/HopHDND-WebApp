import {afterEach,describe,expect,it,vi} from 'vitest';
import {readConfirmedPageWidths,rememberConfirmedPageWidths} from '../src/data/confirmed-page-widths';

afterEach(()=>vi.unstubAllGlobals());
describe('remember only last-confirmed display width for first paint',()=>{
  it('round-trips report and list widths per Sheets source without caching profile data',()=>{
    const state=new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(key:string)=>state.get(key)??null,
      setItem:(key:string,value:string)=>state.set(key,value)});
    rememberConfirmedPageWidths('sheet-a',{report:1320,list:940});
    expect(readConfirmedPageWidths('sheet-a')).toEqual({report:1320,list:940});
    expect(readConfirmedPageWidths('sheet-b')).toBeNull();
    const encoded=[...state.values()][0];
    expect(encoded).not.toContain('email');
    expect(encoded).not.toContain('permissions');
    expect(JSON.parse(encoded).source).toBe('sheet-a');
  });
  it('rejects invalid or corrupt cached widths and tolerates private browsing storage failures',()=>{
    const state=new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(key:string)=>state.get(key)??null,
      setItem:(key:string,value:string)=>state.set(key,value)});
    rememberConfirmedPageWidths('sheet-a',{report:1350,list:'auto'});
    expect(readConfirmedPageWidths('sheet-a')).toEqual({report:1350,list:'auto'});
    rememberConfirmedPageWidths('sheet-a',{report:150,list:900});
    expect(readConfirmedPageWidths('sheet-a')).toEqual({report:1350,list:'auto'});
    for(const raw of ['{invalid','{"schema":1,"source":"sheet-a","report":0,"list":99999}']){
      state.set('hdnd.confirmed-widths.v1:sheet-a',raw);
      expect(readConfirmedPageWidths('sheet-a')).toBeNull();
    }
    vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');},
      setItem:()=>{throw new Error('blocked');}});
    expect(readConfirmedPageWidths('sheet-a')).toBeNull();
    expect(()=>rememberConfirmedPageWidths('sheet-a',{report:1200,list:800})).not.toThrow();
  });
});
