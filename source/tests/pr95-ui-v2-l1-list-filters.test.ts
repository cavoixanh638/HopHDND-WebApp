import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDemoItems} from '../src/data/demo-items';
import type {Item} from '../shared/types';
import {summarizeListItems} from '../src/domain/item-summary';
import {EXCEL_SOURCE_COLUMNS,defaultItemLayout} from '../src/data/item-preferences';
import {filterToolbarRows,filterByChips,kindOf,newToolbarState,exactChoices,
  shouldClearListOnEscape,hasToolbarFilters} from '../src/features/items/list-toolbar-filters';

const base=createDemoItems(1)[0];
const mk=(id:string,changes:Partial<Item>={}):Item=>({
  ...base,recordId:id,displayCode:id,stt:99,
  documentKind:'NQ',type:'QPPL',department:'Sở A',room:'Phòng 1',
  specialist:'Nguyễn Thị Bình',vpLeader:'Phó Chánh Văn phòng Trần Văn An',
  ubndLeader:'Phó Chủ tịch Nguyễn Văn B',progressParty:'Sở chưa trình',
  progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
  isDropped:false,archivedAt:null,...changes
});
const records:Item[]=[
  mk('nq1',{content:'Đề án chuyển đổi số Hải Phòng',progressParty:'Đã gửi ĐU',
    specificProgress:'Đã hoàn thành thẩm định',note:'Đợt một'}),
  mk('nq2',{content:'Dự án khoa học',progressParty:'Đã họp/xin phiếu, chưa có TBKL',
    room:'Phòng 2',specialist:'Phạm Văn Minh'}),
  mk('hc',{type:'Hành chính',room:'Phòng 2',content:'Hành chính nội bộ'}),
  mk('bc',{documentKind:'BC',type:'HC',room:'Phòng 1',content:'Báo cáo chuyên đề'}),
  mk('unknown',{type:'Chưa rõ'}),
  mk('unclassified',{documentKind:'UNCLASSIFIED'}),
  mk('drop',{isDropped:true,progressParty:'Đã có TBKL'}),
  mk('archive',{archivedAt:'2026-10-01',progressParty:'Đã có TBKL'})
];
const ids=(rows:Item[])=>rows.map(x=>x.recordId);
afterEach(()=>{vi.unstubAllGlobals();});
describe('V2 L1 toolbar filters independently of other workers',()=>{
  it('matches Vietnamese without tone marks and full names, not abbreviated text',()=>{
    expect(ids(filterToolbarRows(records,{...newToolbarState(),search:'chuyen doi so hai phong'})))
      .toEqual(['nq1']);
    expect(ids(filterToolbarRows(records,{...newToolbarState(),search:'PHO CHANH VAN PHONG TRAN VAN AN'})))
      .toEqual(ids(records));
    expect(ids(filterToolbarRows(records,{...newToolbarState(),search:'dot mot'})))
      .toEqual(['nq1']);
  });
  it('uses exact department/room and AND with detailed original status',()=>{
    const state={...newToolbarState(),department:'Sở A',room:'Phòng 1',
      details:{...newToolbarState().details,progressParty:'Đã gửi ĐU'}};
    expect(ids(filterToolbarRows(records,state))).toEqual(['nq1']);
    expect(ids(filterToolbarRows(records,{...state,department:'Sở'}))).toEqual([]);
    expect(ids(filterToolbarRows(records,{...state,room:'Phòng'}))).toEqual([]);
    expect(exactChoices(records,'room')).toEqual(['Phòng 1','Phòng 2']);
    expect(hasToolbarFilters(state)).toBe(true);
    expect(hasToolbarFilters(newToolbarState())).toBe(false);
  });
  it('supports field-only searches and custom values without overwriting Item source',()=>{
    const s={...newToolbarState(),search:'nq1',field:'displayCode'};
    expect(ids(filterToolbarRows(records,s))).toEqual(['nq1']);
    expect(filterToolbarRows(records,{...s,field:'note'})).toEqual([]);
    const custom=(item:Item,field:string)=>item.recordId==='nq2'&&
      (field==='custom_alpha'||field==='*')?'Hồ sơ kiểm tra đặc biệt':'';
    expect(ids(filterToolbarRows(records,{...s,search:'dac biet',field:'custom_alpha'},custom)))
      .toEqual(['nq2']);
    expect(records[1].progressParty).toBe('Đã họp/xin phiếu, chưa có TBKL');
  });
  it('kind chips reuse active, documentKind and Vietnamese HC without guessing code prefix',()=>{
    expect(records.map(kindOf)).toEqual(['qppl','qppl','hc','bc','nq-unknown',
      'unclassified','qppl','qppl']);
    expect(summarizeListItems(records).total).toMatchObject({
      total:6,qppl:2,hc:1,bc:1,nqUnclassified:1,unclassified:1
    });
    expect(ids(filterByChips(records,'qppl',null))).toEqual(['nq1','nq2']);
    expect(ids(filterByChips(records,'hc',null))).toEqual(['hc']);
    expect(ids(filterByChips(records,'unclassified',null))).toEqual(['unclassified']);
    expect(ids(filterByChips(records,'qppl',{report:'party',stage:'completed'}))).toEqual([]);
  });
  it('Bước tiếp theo is a count/filter bucket, not a rewritten source label',()=>{
    const next={report:'party' as const,stage:'next' as const};
    expect(ids(filterByChips(records,null,next))).toEqual(['nq1','nq2']);
    expect(records[0].progressParty).toBe('Đã gửi ĐU');
    expect(records[1].progressParty).toBe('Đã họp/xin phiếu, chưa có TBKL');
    const single=filterToolbarRows(records,{...newToolbarState(),
      details:{...newToolbarState().details,progressParty:'Đã gửi ĐU'}});
    expect(ids(filterByChips(single,null,next))).toEqual(['nq1']);
    expect(summarizeListItems(single).stages[0].buckets.find(b=>b.stage==='next')?.count).toBe(1);
  });
  it('does not steal Escape from controls, dialogs, IME or non-filtered list',()=>{
    const options={active:true,customizing:false,permissionMode:false,
      editorOpen:false,popupOpen:false};
    const ev=(override:Record<string,unknown>={})=>({key:'Escape',defaultPrevented:false,
      isComposing:false,target:null,...override} as unknown as KeyboardEvent);
    vi.stubGlobal('document',{querySelector:()=>null});
    expect(shouldClearListOnEscape(ev(),options)).toBe(true);
    expect(shouldClearListOnEscape(ev({defaultPrevented:true}),options)).toBe(false);
    expect(shouldClearListOnEscape(ev({isComposing:true}),options)).toBe(false);
    expect(shouldClearListOnEscape(ev({key:'Enter'}),options)).toBe(false);
    expect(shouldClearListOnEscape(ev(),{...options,active:false})).toBe(false);
    expect(shouldClearListOnEscape(ev(),{...options,customizing:true})).toBe(false);
    expect(shouldClearListOnEscape(ev(),{...options,permissionMode:true})).toBe(false);
    expect(shouldClearListOnEscape(ev(),{...options,editorOpen:true})).toBe(false);
    vi.stubGlobal('Element',class {closest(){return true;}});
    const fake=new (globalThis as any).Element();
    expect(shouldClearListOnEscape(ev({target:fake}),options)).toBe(false);
    vi.stubGlobal('document',{querySelector:()=>({open:true})});
    expect(shouldClearListOnEscape(ev(),options)).toBe(false);
  });
  it('projects out STT before fit calculations but keeps Excel B and Item.stt',()=>{
    const source=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
    const popup=readFileSync(new URL('../src/features/reports/ReportDetailGrid.tsx',import.meta.url),'utf8');
    expect(source).toContain("column.key!=='stt'||showAllSourceColumns||customizing");
    expect(popup).toContain("c.key!=='stt'||showAll||settings");
    expect(source.indexOf("column.key!=='stt'")).toBeLessThan(source.indexOf('const baseWidths='));
    expect(EXCEL_SOURCE_COLUMNS[1].key).toBe('stt');
    expect(defaultItemLayout().columns.some(c=>c.key==='stt')).toBe(true);
    expect(records[0].stt).toBe(99);
    expect(source).toContain('item.stt}</td>');
  });
});
