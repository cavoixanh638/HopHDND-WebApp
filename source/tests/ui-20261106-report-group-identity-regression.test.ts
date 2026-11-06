import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems,mergeCatalogItems,validateCatalog,saveCatalog,loadCatalog} from '../src/data/catalogs';
import {renameReportGroupIdentity,validateReportGroupIdentities} from '../src/domain/report-reference-identity';
import {vi} from 'vitest';
import {reportReferenceGroupRows} from '../src/domain/report-reference-identity';
import type {Item,GroupField} from '../shared/types';

const row=(recordId:string,room:string,department='Sở thử nghiệm'):Item=>({
  ...createDemoItems(1)[0],recordId,room,department,
  archivedAt:null,isDropped:false,documentKind:'NQ'
});

describe('REVIEW-3 RED contract: group business identity cannot be a member anchor',()=>{
  it('keeps the same group key after adding a smaller record ID',()=>{
    const before=[row('r02','Phòng A'),row('r03','Phòng A'),row('r09','Phòng B')];
    const key=reportReferenceGroupRows(before,'room').get('Phòng A');
    expect(key).toBeTruthy();
    expect(reportReferenceGroupRows([row('r01','Phòng A'),...before],'room').get('Phòng A')).toBe(key);
  });
  it('keeps a non-empty group key when its anchor record leaves or is removed',()=>{
    const before=[row('r02','Phòng A'),row('r03','Phòng A'),row('r09','Phòng B')];
    const key=reportReferenceGroupRows(before,'room').get('Phòng A');
    expect(reportReferenceGroupRows(before.filter(x=>x.recordId!=='r02'),'room').get('Phòng A')).toBe(key);
    const moved=before.map(x=>x.recordId==='r02'?{...x,room:'Phòng B'}:x);
    expect(reportReferenceGroupRows(moved,'room').get('Phòng A')).toBe(key);
  });
  it.each<GroupField>(['department','room','vpLeader','ubndLeader'])('namespaces %s group codes separately',group=>{
    const items=[row('r02','Phòng A'),row('r03','Phòng B')];
    items[0][group]='Đơn vị X';items[1][group]='Đơn vị Y';
    const ids=reportReferenceGroupRows(items,group);
    expect(ids.get('Đơn vị X')).not.toBe(ids.get('Đơn vị Y'));
    expect(ids.get('Đơn vị X')).not.toBe(reportReferenceGroupRows(items,group==='room'?'department':'room').get('Đơn vị X'));
  });
});


describe('REVIEW-3 persisted group registry and explicit source rename',()=>{
  it('preserves ID when the source is renamed before an admin reconciles the catalog',()=>{
    const before=[row('r02','Phòng A'),row('r03','Phòng A'),row('r09','Phòng B')];
    const original=catalogFromItems(before);
    const baseKey=reportReferenceGroupRows(before,'room',original.groupIdentities).get('Phòng A');
    const sourceRenamed=before.map(item=>({...item,room:item.room==='Phòng A'?'Tên phòng mới':item.room}));
    const observed=mergeCatalogItems(original,sourceRenamed);
    expect(observed.options.room).toContain('Tên phòng mới');
    const fixed=renameReportGroupIdentity(observed.groupIdentities,'room','Phòng A','Tên phòng mới');
    const confirmed=validateCatalog({...observed,groupIdentities:fixed,
      options:{...observed.options,room:observed.options.room.filter(n=>n!=='Phòng A')}});
    const saved=JSON.parse(JSON.stringify(confirmed));
    const restored=validateCatalog(saved);
    expect(reportReferenceGroupRows(sourceRenamed,'room',restored.groupIdentities).get('Tên phòng mới')).toBe(baseKey);
    expect(reportReferenceGroupRows(before,'room',restored.groupIdentities).get('Tên phòng mới')).toBe(baseKey);
    expect(reportReferenceGroupRows(sourceRenamed.slice(0,1),'room',restored.groupIdentities).get('Tên phòng mới')).toBe(baseKey);
    expect(validateReportGroupIdentities(restored.groupIdentities).room?.filter(e=>e.id===baseKey)).toHaveLength(1);
  });
  it('survives local catalog save/reload and keeps a removed group tombstone for reappearance',()=>{
    const memory=new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,
      setItem:(k:string,v:string)=>{memory.set(k,v);}});
    try{
      const rows=[row('r02','Phòng A'),row('r03','Phòng A')];
      const initial=catalogFromItems(rows);
      const original=reportReferenceGroupRows(rows,'room',initial.groupIdentities).get('Phòng A');
      expect(saveCatalog('review3-persist',initial)).toBe(true);
      const emptySource=loadCatalog('review3-persist',[]);
      expect(emptySource.groupIdentities?.room?.find(e=>e.id===original)?.label).toBe('Phòng A');
      const returning=loadCatalog('review3-persist',[row('r99','Phòng A')]);
      expect(reportReferenceGroupRows([row('r99','Phòng A')],'room',returning.groupIdentities).get('Phòng A')).toBe(original);
    }finally{vi.unstubAllGlobals();}
  });
  it('rejects duplicate aliases, namespaced ID forgery and ambiguous curated merges',()=>{
    const original=catalogFromItems([row('r02','Phòng A'),row('r03','Phòng B')]);
    const wrong=structuredClone(original);
    wrong.groupIdentities!.room![0].id=wrong.groupIdentities!.department?.[0]?.id??'bad';
    expect(()=>validateCatalog(wrong)).toThrow();
    const aliases=structuredClone(original);
    aliases.groupIdentities!.room![0].aliases.push('Phòng B');
    expect(()=>validateCatalog(aliases)).toThrow();
    const curated=structuredClone(original);
    curated.groupIdentities!.room![1].aliases.push('Tên lịch sử');
    expect(()=>renameReportGroupIdentity(curated.groupIdentities,'room','Phòng A','Phòng B')).toThrow();
  });
  it('does not share an identity across four group namespaces even with equal labels',()=>{
    const item=row('r02','Chung tên','Chung tên');
    item.vpLeader='Chung tên';item.ubndLeader='Chung tên';
    const registry=catalogFromItems([item]).groupIdentities;
    const codes=(['department','room','vpLeader','ubndLeader'] as const).map(g=>
      reportReferenceGroupRows([item],g,registry).get('Chung tên'));
    expect(new Set(codes).size).toBe(4);
    expect(codes.every(code=>!!code?.startsWith('group:'))).toBe(true);
  });
});
