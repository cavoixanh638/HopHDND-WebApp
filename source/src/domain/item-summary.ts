import type {Item,ReportConfig} from '../../shared/types';
import {DEFAULT_REPORTS,aggregateReport,getKpis,isActive,normalizeReportStatus} from './reporting';
import {reportStage,type ReportStage} from './report-workflow';
import {normalizeSearch} from './search';

/** Exactly the existing report scopes, normalizer and completion denominator.
 * The four summary tiles are a read-only projection of those same records. */
export interface SummaryBucket {label:string;stage:ReportStage;count:number;ids:string[]}
export interface SummaryStage {
  id:'party'|'build'|'nq';title:string;total:number;complete:number;
  percent:number|null;buckets:SummaryBucket[];unmatched:number;unmatchedIds:string[];
}
const definitions:Readonly<Record<SummaryStage['id'],{title:string;labels:readonly {stage:ReportStage;label:string}[]}>>={
  party:{title:'Trình Thành ủy',labels:[
    {stage:'source',label:'Sở chưa trình'},
    {stage:'office',label:'VP đang xử lý'},
    {stage:'next',label:'Bước tiếp theo'},
    {stage:'completed',label:'Đã có TBKL'}]},
  build:{title:'Trình HĐND xây dựng NQ',labels:[
    {stage:'source',label:'Sở chưa trình'},
    {stage:'office',label:'VP đang xử lý'},
    {stage:'next',label:'Đã trình - chưa có QĐ'},
    {stage:'completed',label:'Đã có QĐ'}]},
  nq:{title:'Trình HĐND ban hành NQ',labels:[
    {stage:'source',label:'Sở chưa trình'},
    {stage:'office',label:'VP đang xử lý'},
    {stage:'completed',label:'Đã trình'}]},
};
function buildStage(items:Item[],id:SummaryStage['id']):SummaryStage {
  const config=DEFAULT_REPORTS.find(report=>report.id===id) as ReportConfig;
  const report=aggregateReport(items,config,'department');
  const known=definitions[id];
  const bucketMap=new Map<ReportStage,Item[]>();
  const unmatched:Item[]=[];
  for(const item of report.items){
    const normalized=normalizeReportStatus(item[config.statusField],config);
    const stage=reportStage(normalized,config);
    if(known.labels.some(label=>label.stage===stage)){
      bucketMap.set(stage,[...(bucketMap.get(stage)??[]),item]);
    }else unmatched.push(item);
  }
  const buckets=known.labels.map(({stage,label})=>({
    label,stage,count:(bucketMap.get(stage)??[]).length,
    ids:(bucketMap.get(stage)??[]).map(item=>item.recordId),
  }));
  return {id,title:known.title,total:report.total,complete:report.completedCount,
    percent:report.percent,buckets,unmatched:unmatched.length,
    unmatchedIds:unmatched.map(item=>item.recordId)};
}
export function summarizeListItems(items:Item[]){
  const total=getKpis(items);
  let qppl=0,hc=0;
  for(const item of items){
    if(!isActive(item)||item.documentKind!=='NQ')continue;
    const type=normalizeSearch(item.type).replace(/\s+/g,' ');
    if(type==='qppl')qppl++;
    else if(type==='hc'||type==='hanh chinh')hc++;
  }
  return {total:{...total,qppl,hc,nqUnclassified:total.nq-qppl-hc},stages:[
    buildStage(items,'party'),buildStage(items,'build'),buildStage(items,'nq')
  ]};
}
