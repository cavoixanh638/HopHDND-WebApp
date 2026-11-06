import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
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
