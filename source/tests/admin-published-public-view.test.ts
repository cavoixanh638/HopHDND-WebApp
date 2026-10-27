import {describe,expect,it} from 'vitest';
import {buildAdminPublishedPublicView} from '../src/data/admin-published-public-view';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultReportLayout} from '../src/data/report-preferences';

const baseline=()=>{
  const items=createDemoItems(6);
  items[0].note='SECRET_GUEST_MUST_NOT_READ';
  items[0].recordId='PRIVATE_INTERNAL_DATABASE_ID';
  const itemLayout=defaultItemLayout();
  itemLayout.columns=itemLayout.columns.map(col=>col.key==='note'?{...col,visible:false}:col);
  return {items,itemLayout,reports:defaultReportLayout(),publishedLayoutRevision:5,
    sourceRevision:'source-approved-11',publishedAt:'2026-10-27T12:00:00Z'};
};
describe('Materialized guest-facing projection (not a raw Firebase snapshot)',()=>{
  it('includes the admin-approved list columns and grouped reports, never hidden item fields',()=>{
    const source=baseline(),publicView=buildAdminPublishedPublicView(source);
    expect(publicView.schemaVersion).toBe(1);
    expect(publicView.columns.map(x=>x.key)).not.toContain('note');
    expect(publicView.rows).toHaveLength(6);
    expect(publicView.reports.length).toBeGreaterThan(0);
    expect(publicView.reports[0].groups.department?.length).toBeGreaterThan(0);
    const output=JSON.stringify(publicView);
    expect(output).not.toContain('PRIVATE_INTERNAL_DATABASE_ID');
    expect(output).not.toContain('SECRET_GUEST_MUST_NOT_READ');
    expect(output).not.toContain('revision":');
    expect(output).not.toContain('archivedAt');
    expect(output).not.toContain('isDropped');
    expect(output).not.toContain('editProofs');
  });
  it('cannot be fed missing admin layout or fake state',()=>{
    const source=baseline();
    expect(()=>buildAdminPublishedPublicView({...source,publishedLayoutRevision:0})).toThrow();
    expect(()=>buildAdminPublishedPublicView({...source,sourceRevision:''})).toThrow();
    expect(()=>buildAdminPublishedPublicView({...source,itemLayout:{
      ...source.itemLayout,columns:source.itemLayout.columns.map(c=>({...c,visible:false}))
    }})).toThrow();
  });
  it('does not expose custom column values for hidden custom column',()=>{
    const source=baseline();
    source.itemLayout.columns.push({
      key:'custom_hidden1234',label:'Nhận xét bí mật',visible:false,width:150,
      origin:'custom',values:{[source.items[0].recordId]:'TOPSECRET_CUSTOM_CELL'}
    });
    const result=buildAdminPublishedPublicView(source);
    expect(JSON.stringify(result)).not.toContain('TOPSECRET_CUSTOM_CELL');
  });
  it('uses admin shared merge rules without exposing extra raw source columns',()=>{
    const source=baseline();
    source.itemLayout.compactDisplay={
      ...source.itemLayout.compactDisplay!,contentDetails:true,partyTogether:true,
      councilTogether:true,teamTogether:true
    };
    const result=buildAdminPublishedPublicView(source);
    const keys=result.columns.map(col=>col.key);
    expect(keys).toContain('content');
    expect(keys).not.toContain('department');
    expect(keys).not.toContain('type');
    expect(keys).not.toContain('progressParty');
    expect(keys).not.toContain('progressCouncil');
    expect(keys).not.toContain('ubndLeader');
    expect(keys).not.toContain('vpLeader');
    expect(keys).not.toContain('specialist');
    expect(result.rows[0].cells.content).toContain(source.items[0].department);
    expect(result.rows[0].cells.content).toContain(source.items[0].type);
    expect(result.rows[0].cells.partyLevel).toContain('Tiến độ:');
    expect(JSON.stringify(result)).not.toContain('SECRET_GUEST_MUST_NOT_READ');
  });
  it('projects only active detail records',()=>{
    const source=baseline();
    source.items[1].isDropped=true;
    const result=buildAdminPublishedPublicView(source);
    expect(result.rows).toHaveLength(5);
  });
});
