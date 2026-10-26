import {afterEach,describe,expect,it,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {normalizeSearch} from '../src/domain/search';
import {DEFAULT_COMPACT_DISPLAY,abbreviateVietnameseName,abbreviateLeaderName,compactFilterText,
  activeCompactPairs,compactVisibleColumns,readCompactDisplay,writeCompactDisplay,toggleCompactOption}
  from '../src/features/items/compact-columns';

afterEach(()=>vi.unstubAllGlobals());
describe('Optional compact projection remains read-only presentation',()=>{
  const all={...DEFAULT_COMPACT_DISPLAY,typeInContent:true,leadersTogether:true,
    roomSpecialist:true,shortSpecialist:true};
  it('does not remove or mutate the 15 Excel source columns',()=>{
    const source=defaultItemLayout().columns;
    const pairs=activeCompactPairs(source,all);
    const displayed=compactVisibleColumns(source,all);
    expect(source).toHaveLength(15);
    expect(displayed).toHaveLength(12);
    expect(pairs.map(p=>p.hidden)).toEqual(['type','ubndLeader','specialist']);
    expect(displayed.find(c=>c.key==='content')?.label).toContain('Loại VB');
    expect(displayed.find(c=>c.key==='vpLeader')?.label).toContain('UBND');
    expect(displayed.find(c=>c.key==='room')?.label).toBe('Phòng chuyên môn / Chuyên viên');
    expect(displayed.some(c=>c.key==='specialist')).toBe(false);
    expect(displayed.some(c=>c.key==='department')).toBe(true);
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
    expect(compactFilterText(item,'room',pairs)).toContain('Nguyễn Ngọc Hùng');
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
  it('keeps PCVP, Q.CVP, PCT, PCTT titles in full while shortening only the personal name',()=>{
    expect(abbreviateLeaderName('PCVP Trịnh Nam Hưng')).toBe('PCVP T.N.Hưng');
    expect(abbreviateLeaderName('Q.CVP Nguyễn Ngọc Hùng')).toBe('Q.CVP N.N.Hùng');
    expect(abbreviateLeaderName('PCT Trần Văn Quân')).toBe('PCT T.V.Quân');
    expect(abbreviateLeaderName('PCTT Phạm Minh Đức')).toBe('PCTT P.M.Đức');
    expect(abbreviateLeaderName('CVP Nguyễn Văn A')).toBe('CVP N.V.A');
    expect(abbreviateLeaderName('PCT: Trần Văn Quân')).toBe('PCT: T.V.Quân');
    expect(abbreviateLeaderName('Nguyễn Ngọc Hùng (PCVP)')).toBe('N.N.Hùng (PCVP)');
    expect(abbreviateLeaderName('PCVP')).toBe('PCVP');
    expect(abbreviateLeaderName('Trần Văn Quân')).toBe('T.V.Quân');
    // Source values, search, and editor options must remain full names.
    const full='Q.CVP Nguyễn Ngọc Hùng';
    expect(abbreviateLeaderName(full)).toBe('Q.CVP N.N.Hùng');
    expect(full).toBe('Q.CVP Nguyễn Ngọc Hùng');
  });
  it('reads old saved settings with leader option off, not resetting existing flags',()=>{
    const values=new Map([['hdnd.compact-display.v1:old',
      JSON.stringify({leadersTogether:true,shortSpecialist:true})]]);
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null});
    expect(readCompactDisplay('old')).toEqual({...DEFAULT_COMPACT_DISPLAY,
      leadersTogether:true,shortSpecialist:true,shortLeaders:false});
  });
  it('does not silently migrate the OLD Sở/Phòng merge into the new Phòng/CV merge',()=>{
    const prefs={...DEFAULT_COMPACT_DISPLAY,roomSpecialist:true};
    expect(activeCompactPairs(defaultItemLayout().columns,prefs).find(pair=>
      pair.anchor==='room')).toMatchObject({hidden:'specialist'});
    const values=new Map([['hdnd.compact-display.v1:old-merge',JSON.stringify({departmentRoom:true})]]);
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null});
    expect(readCompactDisplay('old-merge').roomSpecialist).toBe(false);
  });
  it('can display all four newly requested compact groups without losing source fields',()=>{
    const source=defaultItemLayout().columns;
    const prefs={...DEFAULT_COMPACT_DISPLAY,contentDetails:true,partyTogether:true,
      councilTogether:true,teamTogether:true};
    const groups=activeCompactPairs(source,prefs);
    const shown=compactVisibleColumns(source,prefs);
    expect(groups.map(g=>g.anchor)).toEqual(['content','partyLevel','progressBuild','room']);
    expect(groups.flatMap(g=>g.hiddenFields)).toEqual([
      'type','department','progressParty','progressCouncil','specialist','ubndLeader','vpLeader'
    ]);
    expect(shown).toHaveLength(8);
    expect(source).toHaveLength(15);
    expect(shown.find(c=>c.key==='content')?.label).toContain('Sở');
    expect(shown.find(c=>c.key==='room')?.label).toContain('Lãnh đạo');
    const item={...createDemoItems(1)[0],content:'Dự thảo',department:'Sở Y tế',type:'QPPL',
      partyLevel:'Ban Thường vụ',progressParty:'Đã gửi ĐU',progressBuild:'Sở chưa trình',
      progressCouncil:'VP đang thực hiện',ubndLeader:'PCT Trần Văn A',
      vpLeader:'PCVP Nguyễn Văn B',room:'Phòng Tổng hợp',specialist:'Lê Minh H'};
    for(const [anchor,expected] of [
      ['content',['Dự thảo','Sở Y tế','QPPL']],
      ['partyLevel',['Ban Thường vụ','Đã gửi ĐU']],
      ['progressBuild',['Sở chưa trình','VP đang thực hiện']],
      ['room',['PCT Trần Văn A','PCVP Nguyễn Văn B','Phòng Tổng hợp','Lê Minh H']]
    ] as const){
      const text=normalizeSearch(compactFilterText(item,anchor,groups));
      for(const term of expected)expect(text).toContain(normalizeSearch(term));
    }
    expect(item.department).toBe('Sở Y tế');
  });
  it('resolves overlapping options without hiding an anchor or duplicating fields',()=>{
    const old={...DEFAULT_COMPACT_DISPLAY,leadersTogether:true,roomSpecialist:true,
      typeInContent:true};
    const content=toggleCompactOption(old,'contentDetails',true);
    expect(content.contentDetails).toBe(true);
    expect(content.typeInContent).toBe(false);
    const team=toggleCompactOption(content,'teamTogether',true);
    expect(team.teamTogether).toBe(true);
    expect(team.leadersTogether).toBe(false);
    expect(team.roomSpecialist).toBe(false);
    expect(activeCompactPairs(defaultItemLayout().columns,team).map(g=>g.anchor))
      .toEqual(['content','room']);
    const separate=toggleCompactOption(team,'roomSpecialist',true);
    expect(separate.teamTogether).toBe(false);
    expect(separate.roomSpecialist).toBe(true);
    expect(activeCompactPairs(defaultItemLayout().columns,separate).map(g=>g.anchor))
      .toEqual(['content','room']);
  });
  it('only merges new groups if every source column is visible',()=>{
    const cols=defaultItemLayout().columns.filter(c=>c.key!=='vpLeader');
    const prefs={...DEFAULT_COMPACT_DISPLAY,teamTogether:true,partyTogether:true};
    const groups=activeCompactPairs(cols,prefs);
    expect(groups.map(group=>group.anchor)).toEqual(['partyLevel']);
    expect(compactVisibleColumns(cols,prefs).some(c=>c.key==='ubndLeader')).toBe(true);
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
