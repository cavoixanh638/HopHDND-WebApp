import {afterEach,describe,expect,it,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {normalizeSearch} from '../src/domain/search';
import {DEFAULT_COMPACT_DISPLAY,abbreviateVietnameseName,abbreviateLeaderName,compactFilterText,
  activeCompactPairs,compactVisibleColumns,readCompactDisplay,writeCompactDisplay,toggleCompactOption,
  readPersonalCompactDisplay,writePersonalCompactDisplay,clearPersonalCompactDisplay}
  from '../src/features/items/compact-columns';

afterEach(()=>vi.unstubAllGlobals());
describe('Optional document, stage and staff projection is read-only presentation',()=>{
  const all={...DEFAULT_COMPACT_DISPLAY,typeInContent:true,leadersTogether:true,
    roomSpecialist:true,shortSpecialist:true};
  it('does not remove or mutate the 15 Excel source columns',()=>{
    const source=defaultItemLayout().columns;
    const pairs=activeCompactPairs(source,all);
    const displayed=compactVisibleColumns(source,all);
    expect(source).toHaveLength(15);
    expect(displayed).toHaveLength(8);
    expect(pairs.map(p=>p.variant)).toEqual(['contentDetails','partyTogether','leadersTogether','roomSpecialist']);
    expect(displayed.find(c=>c.key==='content')?.label).toBe('Nội dung trình');
    expect(displayed.find(c=>c.key==='vpLeader')?.label).toContain('UBND');
    expect(displayed.find(c=>c.key==='room')?.label).toBe('Phòng chuyên môn / Chuyên viên');
    expect(displayed.some(c=>c.key==='specialist')).toBe(false);
    expect(displayed.some(c=>c.key==='department')).toBe(false);
    expect(source.find(c=>c.key==='content')?.label).toBe('Nội dung trình');
    expect(compactVisibleColumns(source,DEFAULT_COMPACT_DISPLAY)).toHaveLength(10);
  });
  it('only merges pairs when both source columns are shown',()=>{
    const columns=defaultItemLayout().columns.filter(c=>c.key!=='content');
    const projected=compactVisibleColumns(columns,all);
    expect(projected.some(c=>c.key==='type')).toBe(true);
    expect(projected.some(c=>c.key==='department')).toBe(false);
    expect(activeCompactPairs(columns,all).find(p=>p.variant==='contentDetails')?.anchor).toBe('type');
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
    expect(activeCompactPairs(defaultItemLayout().columns,prefs).map(p=>p.variant)).toEqual(['contentDetails','partyTogether']);
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
    expect(groups.map(g=>g.anchor)).toEqual(['content','partyLevel','room']);
    expect(groups.flatMap(g=>g.hiddenFields)).toEqual([
      'type','department','progressParty','progressBuild','progressCouncil','specialist','ubndLeader','vpLeader'
    ]);
    expect(shown).toHaveLength(7);
    expect(source).toHaveLength(15);
    expect(shown.find(c=>c.key==='content')?.label).toBe('Nội dung trình');
    expect(shown.find(c=>c.key==='room')?.label).toContain('Lãnh đạo');
    const item={...createDemoItems(1)[0],content:'Dự thảo',department:'Sở Y tế',type:'QPPL',
      partyLevel:'Ban Thường vụ',progressParty:'Đã gửi ĐU',progressBuild:'Sở chưa trình',
      progressCouncil:'VP đang thực hiện',ubndLeader:'PCT Trần Văn A',
      vpLeader:'PCVP Nguyễn Văn B',room:'Phòng Tổng hợp',specialist:'Lê Minh H'};
    for(const [anchor,expected] of [
      ['content',['Dự thảo','Sở Y tế','QPPL']],
      ['partyLevel',['Ban Thường vụ','Đã gửi ĐU','Sở chưa trình','VP đang thực hiện']],
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
    expect(content.typeInContent).toBe(true); // deprecated flag remains persisted but cannot split U01
    const team=toggleCompactOption(content,'teamTogether',true);
    expect(team.teamTogether).toBe(true);
    expect(team.leadersTogether).toBe(false);
    expect(team.roomSpecialist).toBe(false);
    expect(activeCompactPairs(defaultItemLayout().columns,team).map(g=>g.anchor))
      .toEqual(['content','partyLevel','room']);
    const separate=toggleCompactOption(team,'roomSpecialist',true);
    expect(separate.teamTogether).toBe(false);
    expect(separate.roomSpecialist).toBe(true);
    expect(activeCompactPairs(defaultItemLayout().columns,separate).map(g=>g.anchor))
      .toEqual(['content','partyLevel','room']);
  });
  it('retains all remaining staff members and truthful headings when source columns are hidden',()=>{
    const source=defaultItemLayout().columns;
    const prefs={...DEFAULT_COMPACT_DISPLAY,teamTogether:true,partyTogether:true};
    const fields=['ubndLeader','vpLeader','room','specialist'];
    for(let mask=0;mask<16;mask++){
      const visible=fields.filter((_,index)=>(mask&(1<<index))!==0);
      const cols=source.filter(c=>!fields.includes(c.key)||visible.includes(c.key));
      const pair=activeCompactPairs(cols,prefs).find(group=>group.variant==='teamTogether');
      const shown=compactVisibleColumns(cols,prefs,{teamTogether:'Tên nhóm riêng'});
      if(!visible.length){expect(pair).toBeUndefined();continue;}
      expect(pair?.memberFields).toEqual(visible);
      expect(pair?.anchor).toBe(visible.includes('room')?'room':visible[0]);
      expect(pair?.tags).toEqual(visible.map(key=>['UBND','VP','Phòng','CV'][fields.indexOf(key)]));
      expect(shown.filter(c=>fields.includes(c.key)).map(c=>c.key)).toEqual([pair!.anchor]);
      const title=shown.find(c=>c.key===pair!.anchor)?.label;
      if(mask===15)expect(title).toBe('Tên nhóm riêng');
      else{
        expect(title).not.toBe('Tên nhóm riêng');
        expect(title?.includes('CV')).toBe(visible.includes('specialist'));
        expect(title?.includes('Phòng')).toBe(visible.includes('room'));
        expect(title?.includes('Lãnh đạo')).toBe(visible.includes('ubndLeader')||visible.includes('vpLeader'));
      }
    }
    const noCv=source.filter(c=>c.key!=='specialist');
    expect(compactVisibleColumns(noCv,prefs).find(c=>c.key==='room')?.label).toBe('Lãnh đạo / Phòng');
    expect(compactVisibleColumns(source.filter(c=>c.key!=='room'),prefs).find(c=>c.key==='ubndLeader')?.label).toBe('Lãnh đạo / CV');
    expect(source).toHaveLength(15);
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
  it('isolates browser-only viewing choices per Firebase UID and source without touching shared layout',()=>{
    const values=new Map<string,string>();
    const writes:string[]=[];
    vi.stubGlobal('localStorage',{
      getItem:(key:string)=>values.get(key)??null,
      setItem:(key:string,value:string)=>{writes.push(key);values.set(key,value);},
      removeItem:(key:string)=>{writes.push(key);values.delete(key);}
    });
    const a='viewer-compact:pages:primary:firebase-uid-A';
    const b='viewer-compact:pages:primary:firebase-uid-B';
    const otherSource='viewer-compact:pages:sheets:mock:firebase-uid-A';
    expect(readPersonalCompactDisplay(a)).toBeNull();
    const next=toggleCompactOption(DEFAULT_COMPACT_DISPLAY,'contentDetails',true);
    expect(writePersonalCompactDisplay(a,next)).toBe(true);
    expect(readPersonalCompactDisplay(a)).toEqual(next);
    expect(readPersonalCompactDisplay(b)).toBeNull();
    expect(readPersonalCompactDisplay(otherSource)).toBeNull();
    expect(writes).toEqual(['hdnd.viewer-compact.v1:'+a]);
    expect(defaultItemLayout().compactDisplay?.contentDetails).toBe(false);
    expect(clearPersonalCompactDisplay(a)).toBe(true);
    expect(readPersonalCompactDisplay(a)).toBeNull();
  });
  it('rejects corrupt browser-only prefs, and never requires Firebase/network access',()=>{
    const map=new Map<string,string>([
      ['hdnd.viewer-compact.v1:x','{"contentDetails":true}']
    ]);
    vi.stubGlobal('localStorage',{
      getItem:(key:string)=>map.get(key)??null,
      setItem:()=>{throw new Error('blocked');},
      removeItem:()=>{throw new Error('blocked');}
    });
    expect(readPersonalCompactDisplay('x')).toBeNull();
    expect(writePersonalCompactDisplay('x',DEFAULT_COMPACT_DISPLAY)).toBe(false);
    expect(clearPersonalCompactDisplay('x')).toBe(false);
    map.set('hdnd.viewer-compact.v1:x','not-json');
    expect(readPersonalCompactDisplay('x')).toBeNull();
  });

  it('old saved flags and missing new flags retain the previous grouped defaults',()=>{
    const source=defaultItemLayout().columns;
    const legacy={...DEFAULT_COMPACT_DISPLAY,typeInContent:false,contentDetails:false,
      partyTogether:false,councilTogether:false};
    delete legacy.mergeProgressStages;
    expect(activeCompactPairs(source,legacy).map(p=>p.variant)).toEqual(['contentDetails','partyTogether']);
    const allFalse=compactVisibleColumns(source,legacy);
    expect(allFalse.some(c=>c.key==='department'||c.key==='type'||c.key==='progressBuild'||c.key==='progressCouncil')).toBe(false);
    const hidden=source.map(c=>({...c,visible:c.key!=='type'&&c.key!=='progressParty'}));
    const groups=activeCompactPairs(hidden,legacy);
    expect(groups.find(p=>p.variant==='contentDetails')?.memberFields).toEqual(['department','content']);
    expect(groups.find(p=>p.variant==='partyTogether')?.memberFields)
      .toEqual(['partyLevel','progressBuild','progressCouncil']);
    expect(groups.flatMap(p=>p.memberFields)).not.toContain('type');
    expect(groups.flatMap(p=>p.memberFields)).not.toContain('progressParty');
  });
  it('U04 survives old personal settings and retains source/UID isolation',()=>{
    const values=new Map<string,string>();
    vi.stubGlobal('localStorage',{
      getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
    const a='uid-A:source-A',other='uid-B:source-A';
    const old={...DEFAULT_COMPACT_DISPLAY,teamTogether:true};
    delete (old as Partial<typeof old>).cvRoomInline;
    delete old.showStaffLabels;
    delete old.mergeProgressStages;
    values.set('hdnd.viewer-compact.v1:'+a,JSON.stringify(old));
    expect(readPersonalCompactDisplay(a)?.cvRoomInline).toBe(false);
    expect(readPersonalCompactDisplay(a)?.showStaffLabels).toBe(true);
    expect(readPersonalCompactDisplay(a)?.mergeProgressStages).toBe(true);
    const split=toggleCompactOption(readPersonalCompactDisplay(a)!,'mergeProgressStages',false);
    expect(writePersonalCompactDisplay(a,split)).toBe(true);
    expect(readPersonalCompactDisplay(a)?.mergeProgressStages).toBe(false);
    const withoutTags=toggleCompactOption(readPersonalCompactDisplay(a)!,'showStaffLabels',false);
    expect(withoutTags.teamTogether).toBe(true);
    expect(writePersonalCompactDisplay(a,withoutTags)).toBe(true);
    expect(readPersonalCompactDisplay(a)?.showStaffLabels).toBe(false);
    const changed=toggleCompactOption(readPersonalCompactDisplay(a)!,'cvRoomInline',true);
    expect(writePersonalCompactDisplay(a,changed)).toBe(true);
    expect(readPersonalCompactDisplay(a)?.cvRoomInline).toBe(true);
    expect(readPersonalCompactDisplay(other)).toBeNull();
  });

});


describe('Independent document group options',()=>{
  it.each([[true,true],[true,false],[false,true],[false,false]])('type=%s department=%s',(type,department)=>{
    const source=defaultItemLayout().columns;
    const prefs=toggleCompactOption(toggleCompactOption(DEFAULT_COMPACT_DISPLAY,'mergeTypeIntoContent',type),'mergeDepartmentIntoContent',department);
    const shown=compactVisibleColumns(source,prefs);
    expect(shown.some(c=>c.key==='type')).toBe(!type);
    expect(shown.some(c=>c.key==='department')).toBe(!department);
    expect(shown.some(c=>c.key==='content')).toBe(true);
    const pairs=activeCompactPairs(source,prefs);
    expect(pairs.find(p=>p.variant==='contentDetails')?.memberFields??['content']).toEqual([
      ...(type?['type']:[]),...(department?['department']:[]),'content']);
    expect(pairs.some(p=>p.variant==='partyTogether')).toBe(true);
    expect(source).toHaveLength(15);
  });
  it('never reveals hidden fields or absorbs the other independent column',()=>{
    const source=defaultItemLayout().columns.map(c=>({...c,visible:c.key!=='type'}));
    const prefs={...DEFAULT_COMPACT_DISPLAY,mergeTypeIntoContent:true,mergeDepartmentIntoContent:false};
    const pairs=activeCompactPairs(source,prefs);
    expect(pairs.some(p=>p.variant==='contentDetails')).toBe(false);
    expect(compactVisibleColumns(source,prefs).some(c=>c.key==='department')).toBe(true);
  });
});

describe('Independent progress grouping',()=>{
  const stageKeys=['partyLevel','progressParty','progressBuild','progressCouncil'];
  it('splits exactly the four source columns and restores the same named group',()=>{
    const source=defaultItemLayout().columns;
    const prefs={...DEFAULT_COMPACT_DISPLAY,teamTogether:true};
    const original=JSON.stringify(source);
    const split=toggleCompactOption(prefs,'mergeProgressStages',false);
    expect(activeCompactPairs(source,split).map(p=>p.variant)).toEqual(['contentDetails','teamTogether']);
    expect(compactVisibleColumns(source,split).filter(c=>stageKeys.includes(c.key)))
      .toEqual(source.filter(c=>stageKeys.includes(c.key)));
    const regrouped=toggleCompactOption(split,'mergeProgressStages',true);
    expect(activeCompactPairs(source,regrouped).find(p=>p.variant==='partyTogether')?.memberFields).toEqual(stageKeys);
    expect(compactVisibleColumns(source,regrouped,{partyTogether:'Tiến độ tùy chỉnh'}).find(c=>c.key==='partyLevel')?.label)
      .toBe('Tiến độ tùy chỉnh');
    expect(regrouped).toEqual(prefs);
    expect(JSON.stringify(source)).toBe(original);
  });
  it('never restores an individually hidden or removed stage merely because grouping changes',()=>{
    const source=defaultItemLayout().columns.map(c=>c.key==='progressBuild'?{...c,visible:false}:c)
      .filter(c=>c.key!=='progressCouncil');
    const visible=source.filter(c=>c.visible&&!c.removed);
    const split=toggleCompactOption(DEFAULT_COMPACT_DISPLAY,'mergeProgressStages',false);
    expect(compactVisibleColumns(visible,split).filter(c=>stageKeys.includes(c.key)).map(c=>c.key))
      .toEqual(['partyLevel','progressParty']);
    expect(activeCompactPairs(visible,toggleCompactOption(split,'mergeProgressStages',true))
      .find(p=>p.variant==='partyTogether')?.memberFields).toEqual(['partyLevel','progressParty']);
  });
});
