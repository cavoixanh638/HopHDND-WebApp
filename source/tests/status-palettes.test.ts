import {afterEach,describe,expect,it,vi} from 'vitest';
import {defaultStatusPalette,defaultStatusPaletteStore,loadStatusPaletteStore,
  saveStatusPaletteStore,statusPaletteTone,statusPaletteCssVariables,
  validateStatusPaletteStore,validateStatusPalette,type StatusPaletteStore} from '../src/data/status-palettes';

afterEach(()=>vi.unstubAllGlobals());
function storage(){
  const saved=new Map<string,string>();
  return {saved,getItem:(key:string)=>saved.get(key)??null,
    setItem:(key:string,value:string)=>{saved.set(key,value);},
    removeItem:(key:string)=>{saved.delete(key);}};
}

describe('Bộ màu trạng thái có thể lưu tên và khôi phục',()=>{
  it('keeps the exact accepted V5 palette as default and intermediate statuses uncolored',()=>{
    const colors=defaultStatusPalette();
    expect(colors['not-submitted']).toEqual({text:'#D00025',background:'#FFE0E4'});
    expect(colors.office).toEqual({text:'#B04700',background:'#FFE8B8'});
    expect(colors.done).toEqual({text:'#007A18',background:'#D5F0DE'});
    expect(colors.otherEnabled).toBe(false);
    expect(statusPaletteTone('progressParty','Đang chờ xử lý',false)).toBeNull();
    expect(statusPaletteTone('department','Sở chưa trình',true)).toBeNull();
  });
  it('classifies equivalent completion per status field, with other opt-in only',()=>{
    expect(statusPaletteTone('progressParty','Không phải xin ý kiến',false)).toBe('done');
    expect(statusPaletteTone('progressParty','Đã có TBKL',false)).toBe('done');
    expect(statusPaletteTone('progressBuild','Đã có QĐ chấp thuận',false)).toBe('done');
    expect(statusPaletteTone('progressBuild','Không phải trình',false)).toBe('done');
    expect(statusPaletteTone('progressCouncil','Đã trình HĐND thành phố',false)).toBe('done');
    expect(statusPaletteTone('progressCouncil','Sở chưa trình',false)).toBe('not-submitted');
    expect(statusPaletteTone('specificProgress','Văn phòng đang thực hiện',false)).toBe('office');
    expect(statusPaletteTone('progressCouncil','Đang thẩm định',true)).toBe('other');
    expect(statusPaletteTone('progressCouncil','',true)).toBeNull();
    expect(statusPaletteTone('note','Đang thẩm định',true)).toBeNull();
  });
  it('persists independent named presets and current draft by source and preview, with delete',()=>{
    const browser=storage();
    vi.stubGlobal('localStorage',browser);
    vi.stubGlobal('location',{pathname:'/HopHDND-WebApp/'});
    const sourceA='source-one',sourceB='source-two';
    const first=defaultStatusPaletteStore();
    const edited={...first.active,done:{text:'#009900',background:'#AAFFAA'},otherEnabled:true};
    const named={id:'scheme-green',name:'Bộ xanh tươi',colors:edited};
    const saved:StatusPaletteStore={version:1,active:edited,activePresetId:named.id,presets:[named]};
    expect(saveStatusPaletteStore(sourceA,saved)).toBe(true);
    expect(loadStatusPaletteStore(sourceA)).toEqual(saved);
    expect(loadStatusPaletteStore(sourceB)).toEqual(first);
    expect(saveStatusPaletteStore(sourceA,{...saved,presets:[],activePresetId:''})).toBe(true);
    expect(loadStatusPaletteStore(sourceA)).toEqual({...saved,presets:[],activePresetId:''});
    expect(browser.saved.size).toBe(1);
    vi.stubGlobal('location',{pathname:'/HopHDND-WebApp/preview/special/'});
    expect(loadStatusPaletteStore(sourceA)).toEqual(first);
    expect(saveStatusPaletteStore(sourceA,first)).toBe(true);
    expect([...browser.saved.keys()].some(key=>key.includes('preview:special:source-one'))).toBe(true);
  });
  it('rejects corrupt HEX, duplicate names, oversized schemes and unsafe persisted data',()=>{
    const base=defaultStatusPaletteStore();
    expect(()=>validateStatusPalette({...base.active,done:{text:'red',background:'#FFFFFF'}})).toThrow('HEX');
    expect(()=>validateStatusPalette({...base.active,done:{text:'#FFFFFF;}',background:'#123456'}})).toThrow();
    const row={id:'p1',name:'Màu xưa',colors:base.active};
    expect(()=>validateStatusPaletteStore({...base,presets:[row,{...row,id:'p2',name:'MÀU XƯA'}]})).toThrow();
    expect(()=>validateStatusPaletteStore({...base,presets:Array.from({length:21},(_,i)=>({...row,id:'p'+i,name:'Bộ '+i}))})).toThrow();
    const browser=storage();vi.stubGlobal('localStorage',browser);
    browser.saved.set('hdnd.status-palettes.v1:source-broken','{"version":1,"presets":[{"bad":1}]}');
    expect(loadStatusPaletteStore('source-broken')).toEqual(base);
    const blocked={...browser,setItem:()=>{throw Error('quota exceeded');}};
    vi.stubGlobal('localStorage',blocked);
    expect(saveStatusPaletteStore('source-broken',base)).toBe(false);
  });
  it('expresses foreground/background variables for both list and popup without changing dot/permissions',()=>{
    const css=statusPaletteCssVariables(defaultStatusPalette());
    expect(css['--hdnd-status-done-text']).toBe('#007A18');
    expect(css['--hdnd-status-not-submitted-bg']).toBe('#FFE0E4');
    expect(css['--hdnd-status-other-bg']).toBe('#F2F6F9');
    expect(Object.keys(css)).toHaveLength(8);
    expect(Object.keys(css).every(key=>key.startsWith('--hdnd-status-'))).toBe(true);
  });
});
