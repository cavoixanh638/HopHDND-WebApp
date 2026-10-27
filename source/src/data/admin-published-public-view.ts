import type {GroupField,Item} from '../../shared/types';
import {GROUP_OPTIONS} from '../../shared/field-definitions';
import {isActive,aggregateReport,getKpis} from '../domain/reporting';
import {configuredReports,type ReportLayout} from './report-preferences';
import {validateItemLayout,type ItemLayout} from './item-preferences';
import {activeCompactPairs,compactVisibleColumns,DEFAULT_COMPACT_DISPLAY,abbreviateVietnameseName,abbreviateLeaderName} from '../features/items/compact-columns';

/**
 * Data-minimised MATERIALIZED public view. A privileged trusted publisher must
 * create this from authoritative records + the last CONFIRMED admin layout.
 * Browsers MUST NOT fetch hdnd/items, mirrors, permissions or profile to build it.
 *
 * IMPORTANT: This pure function is not the publisher. It must run in a trusted
 * backend/privileged deployment step, never in the guest browser.
 */
export interface PublicViewV1 {
  schemaVersion:1;
  publishedAt:string;
  publishedLayoutRevision:number;
  sourceRevision:string;
  columns:{key:string;label:string;width:number}[];
  rows:{cells:Record<string,string>}[];
  kpis:ReturnType<typeof getKpis>;
  reports:{
    id:string;title:string;
    stageColumns:string[];
    groups:Partial<Record<GroupField,{
      label:string;
      total:number;
      completed:number;
      stages:{label:string;count:number;detailIndexes:number[]}[];
    }[]>>;
  }[];
}
const groupFields:GroupField[]=GROUP_OPTIONS.map(x=>x.key);
const permitted=new Set([
  'displayCode','stt','content','department','type','partyLevel',
  'progressParty','progressBuild','progressCouncil','specialist','room',
  'vpLeader','ubndLeader','specificProgress','note'
]);
/** Do not ever serialise recordId, audit, UID, lease proof, archivedAt, hidden
 * source fields, or custom-column .values maps to a public RTDB path.
 */
export function buildAdminPublishedPublicView(input:{
  items:readonly Item[];
  itemLayout:ItemLayout;
  reports:ReportLayout[];
  publishedLayoutRevision:number;
  sourceRevision:string;
  publishedAt:string;
}):PublicViewV1 {
  if(!Number.isSafeInteger(input.publishedLayoutRevision)||input.publishedLayoutRevision<1||
    !input.sourceRevision||!Number.isFinite(Date.parse(input.publishedAt))||
    input.items.length>1000)
    throw new Error('Public-view publisher: missing verified admin layout or invalid source.');
  const layout=validateItemLayout(input.itemLayout);
  const approved=layout.columns.filter(c=>c.visible&&!c.removed);
  const preferences=layout.compactDisplay??DEFAULT_COMPACT_DISPLAY;
  const pairs=activeCompactPairs(approved,preferences);
  // Apply the ADMIN's shared merge settings on the trusted backend. Guests
  // never receive the raw component columns merely to merge them in React.
  const columns=compactVisibleColumns(approved,preferences);
  if(!columns.length)throw new Error('Admin did not authorize any public list column.');
  const active=input.items.filter(isActive);
  const indexById=new Map(active.map((item,i)=>[item.recordId,i]));
  if(indexById.size!==active.length)throw new Error('Source records have duplicate internal IDs.');
  const rows=active.map(row=>{
    const cells:Record<string,string>={};
    const visibleValue=(key:string)=>{
      const configured=approved.find(column=>column.key===key);
      const original=configured?.origin==='custom'?configured.values?.[row.recordId]??'':
        permitted.has(key)?String(row[key as keyof Item]??''):'';
      return preferences.shortSpecialist&&key==='specialist'
        ?abbreviateVietnameseName(original):
        preferences.shortLeaders&&(key==='vpLeader'||key==='ubndLeader')
          ?abbreviateLeaderName(original):original;
    };
    for(const col of columns){
      const pair=pairs.find(group=>group.anchor===col.key);
      cells[col.key]=pair?pair.memberFields.map((key,i)=>{
        const value=visibleValue(key);
        return value?(pair.tags[i]?pair.tags[i]+': '+value:value):'';
      }).filter(Boolean).join('\n'):visibleValue(col.key);
    }
    return {cells};
  });
  const reports=configuredReports(input.reports).map(config=>{
    const groups:PublicViewV1['reports'][number]['groups']={};
    for(const group of groupFields){
      const result=aggregateReport(active,config,group);
      groups[group]=[...result.rows].map(([label,cells])=>{
        const stages=result.columns.map(stage=>{
          const selection=cells.get(stage)??[];
          const detailIndexes=selection.map(item=>indexById.get(item.recordId))
            .filter((value):value is number=>value!==undefined);
          return {label:stage,count:selection.length,detailIndexes};
        });
        const total=stages.reduce((sum,stage)=>sum+stage.count,0);
        const complete=new Set(config.completed);
        const completed=stages.filter(stage=>complete.has(stage.label))
          .reduce((sum,stage)=>sum+stage.count,0);
        return {label,total,completed,stages};
      });
    }
    return {id:config.id,title:config.title,stageColumns:aggregateReport(active,config,'department').columns,groups};
  });
  return {
    schemaVersion:1,publishedAt:input.publishedAt,
    publishedLayoutRevision:input.publishedLayoutRevision,
    sourceRevision:input.sourceRevision,
    columns:columns.map(c=>({key:c.key,label:c.label,width:c.width})),
    rows,kpis:getKpis(active),reports
  };
}
