import {afterEach,describe,expect,it,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {normalizeSearch} from '../src/domain/search';
import {DEFAULT_COMPACT_DISPLAY,abbreviateVietnameseName,compactFilterText,
  activeCompactPairs,compactVisibleColumns,readCompactDisplay,writeCompactDisplay}
  from '../src/features/items/compact-columns';

afterEach(()=>vi.unstubAllGlobals());
describe('Optional compact projection remains read-only presentation',()=>{
  const all={...DEFAULT_COMPACT_DISPLAY,typeInContent:true,leadersTogether:true,
    departmentRoom:true,shortSpecialist:true};
  it('does not remove or mutate the 15 Excel source columns',()=>{
    const source=defaultItemLayout().columns;
    const pairs=activeCompactPairs(source,all);
    const displayed=compactVisibleColumns(source,all);
    expect(source).toHaveLength(15);
    expect(displayed).toHaveLength(12);
    expect(pairs.map(p=>p.hidden)).toEqual(['type','ubndLeader','room']);
    expect(displayed.find(c=>c.key==='content')?.label).toContain('Loại VB');
    expect(displayed.find(c=>c.key==='vpLeader')?.label).toContain('UBND');
    expect(source.find(c=>c.key==='content')?.label).toBe('Nội dung trình');
    expect(compactVisibleColumns(source,DEFAULT_COMPACT_DISPLAY)).toHaveLength(15);
  });
  it('only merges pairs when both source columns are shown',()=>{
    const columns=defaultItemLayout().columns.filter(c=>c.key!=='content');
    const projected=compactVisibleColumns(columns,all);
    expect(projected.some(c=>c.key==='type')).toBe(true);
    expect(activeCompactPairs(columns,all).map(p=>p.hidden)).not.toContain('type');
  });
  it('abbreviates displayed specialist but searches full unmodified original name',()=>{
    const item={...createDemoItems(1)[0],specialist:'Nguyễn Ngọc Hùng',
      vpLeader:'PCVP Trịnh Nam Hưng',ubndLeader:'PCT Trần Văn Quân'};
    const pairs=activeCompactPairs(defaultItemLayout().columns,all);
    expect(abbreviateVietnameseName(item.specialist)).toBe('N.N.Hùng');
    expect(item.specialist).toBe('Nguyễn Ngọc Hùng');
    expect(abbreviateVietnameseName('Hùng')).toBe('Hùng');
    expect(normalizeSearch(item.specialist)).toContain(normalizeSearch('nguyen ngoc hung'));
    expect(normalizeSearch(compactFilterText(item,'vpLeader',pairs)))
      .toContain(normalizeSearch('Trần Văn Quân'));
    expect(normalizeSearch(compactFilterText(item,'content',pairs)))
      .toContain(normalizeSearch(item.type));
  });
  it('shortens both leaders independently of merging while retaining source names for search',()=>{
    const prefs={...DEFAULT_COMPACT_DISPLAY,shortLeaders:true};
    const item={...createDemoItems(1)[0],
      vpLeader:'Nguyễn Ngọc Hùng',ubndLeader:'Trần Văn Quân'};
    expect(prefs.shortSpecialist).toBe(false);
    expect(activeCompactPairs(defaultItemLayout().columns,prefs)).toHaveLength(0);
    expect(abbreviateVietnameseName(item.vpLeader)).toBe('N.N.Hùng');
    expect(abbreviateVietnameseName(item.ubndLeader)).toBe('T.V.Quân');
    expect(normalizeSearch(item.vpLeader)).toContain('nguyen ngoc hung');
    expect(normalizeSearch(item.ubndLeader)).toContain('tran van quan');
    const merged=activeCompactPairs(defaultItemLayout().columns,
      {...prefs,leadersTogether:true});
    expect(normalizeSearch(compactFilterText(item,'vpLeader',merged)))
      .toContain(normalizeSearch('Trần Văn Quân'));
  });
  it('reads old saved settings with leader option off, not resetting existing flags',()=>{
    const values=new Map([['hdnd.compact-display.v1:old',
      JSON.stringify({leadersTogether:true,shortSpecialist:true})]]);
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null});
    expect(readCompactDisplay('old')).toEqual({...DEFAULT_COMPACT_DISPLAY,
      leadersTogether:true,shortSpecialist:true,shortLeaders:false});
  });
  it('persists independent boolean choices per local source with safe fallback',()=>{
    const values=new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,
      setItem:(k:string,v:string)=>values.set(k,v)});
    writeCompactDisplay('file-A',all);
    expect(readCompactDisplay('file-A')).toEqual(all);
    expect(readCompactDisplay('file-B')).toEqual(DEFAULT_COMPACT_DISPLAY);
    values.set('hdnd.compact-display.v1:file-A','{invalid json');
    expect(readCompactDisplay('file-A')).toEqual(DEFAULT_COMPACT_DISPLAY);
  });
});
