import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {summarizeListItems} from '../src/domain/item-summary';
import {aggregateReport,DEFAULT_REPORTS,reportItems} from '../src/domain/reporting';
import type {Item} from '../shared/types';

const template=createDemoItems(1)[0];
function make(id:string,overrides:Partial<Item>={}):Item{
 return {...template,recordId:id,displayCode:id,stt:1,documentKind:'NQ',
   partyLevel:'Ban Chấp hành',progressParty:'Sở chưa trình',
   progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
   isDropped:false,archivedAt:null,...overrides};
}
describe('Four list cards reuse report scopes and normalization',()=>{
 const rows:Item[]=[
  make('nq1'),
  make('nq2',{progressParty:'VP đang xử lý',progressBuild:'VP đang thực hiện',progressCouncil:'VP đang thực hiện'}),
  make('nq3',{progressParty:'Đã gửi ĐU',progressBuild:'Đã trình HĐND, chưa có QĐ',progressCouncil:'Hoàn thành'}),
  make('nq4',{progressParty:'ĐU đã gửi TU chưa họp',progressBuild:'Đã có QĐ chấp thuận',progressCouncil:'Đã trình HĐND TP'}),
  make('nq5',{progressParty:'Đã họp, chưa có TBKL',progressBuild:'Không phải trình',progressCouncil:'Đã trình HĐND thành phố'}),
  make('nq6',{progressParty:'Đã có TBKL',progressBuild:'Đã có QĐ chấp thuận',progressCouncil:'Chưa chuẩn hóa bản ghi'}),
  make('nq7',{partyLevel:'Không phải xin ý kiến',progressParty:'Không phải xin ý kiến',
    progressBuild:'Không phải trình xây dựng NQ',progressCouncil:''}),
  make('nq8',{progressParty:'Trạng thái chưa chuẩn hóa',progressBuild:'Đang xin ý kiến',progressCouncil:'Đang xử lý nội bộ'}),
  make('bc1',{documentKind:'BC',progressParty:'Sở chưa trình',progressCouncil:'Đã trình HĐND'}),
  make('u1',{documentKind:'UNCLASSIFIED',progressParty:'Sở chưa trình'}),
  make('gone',{isDropped:true,progressParty:'Đã có TBKL'}),
  make('archive',{archivedAt:'2026-10-01',progressParty:'Đã có TBKL'}),
 ];
 it('total NQ/BC/unclassified follows documentKind, excludes dropped and archived',()=>{
   const summary=summarizeListItems(rows);
   expect(summary.total).toMatchObject({total:10,nq:8,bc:1,unclassified:1});
   expect(summary.total.nq+summary.total.bc+summary.total.unclassified).toBe(summary.total.total);
 });
 it('party next means exactly the three official post-VP pre-TBKL states',()=>{
   const m=summarizeListItems(rows).stages[0];
   const buckets=Object.fromEntries(m.buckets.map(b=>[b.stage,b.count]));
   expect(buckets).toEqual({source:3,office:1,next:3,completed:1});
   expect(m.unmatched).toBe(1);
   expect(m.total).toBe(9);
   expect(m.buckets.find(b=>b.stage==='next')?.ids).toEqual(['nq3','nq4','nq5']);
   const report=aggregateReport(rows,DEFAULT_REPORTS[0],'department');
   expect({total:m.total,complete:m.complete,percent:m.percent})
     .toEqual({total:report.total,complete:report.completedCount,percent:report.percent});
 });
 it('build tracks submitted-without-QD independently and keeps unknown visible',()=>{
   const m=summarizeListItems(rows).stages[1];
   expect(Object.fromEntries(m.buckets.map(b=>[b.stage,b.count])))
     .toEqual({source:1,office:1,next:1,completed:2});
   expect(m.unmatched).toBe(1);
   expect(m.total).toBe(6);
   expect(m.buckets.find(b=>b.stage==='next')?.ids).toEqual(['nq3']);
 });
 it('NQ council excludes BC and unclassified, normalizes historical completed alias',()=>{
   const m=summarizeListItems(rows).stages[2];
   expect(m.total).toBe(8);
   expect(Object.fromEntries(m.buckets.map(b=>[b.stage,b.count])))
     .toEqual({source:2,office:1,completed:3});
   expect(m.unmatched).toBe(2);
   expect(m.buckets.find(b=>b.stage==='completed')?.ids).toEqual(['nq3','nq4','nq5']);
   const config=DEFAULT_REPORTS.find(x=>x.id==='nq')!;
   expect(reportItems(rows,config).every(x=>x.documentKind==='NQ')).toBe(true);
 });
 it('every scoped record is counted exactly once including unknown source statuses',()=>{
   for(const card of summarizeListItems(rows).stages){
     expect(card.buckets.reduce((n,b)=>n+b.count,0)+card.unmatched).toBe(card.total);
     const allIds=[...card.buckets.flatMap(b=>b.ids),...card.unmatchedIds];
     expect(new Set(allIds).size).toBe(card.total);
   }
 });
 it('empty filtered results have zero totals, nullable percent and no NaN',()=>{
   const empty=summarizeListItems([]);
   expect(empty.total.total).toBe(0);
   for(const x of empty.stages){
     expect(x.total).toBe(0);expect(x.percent).toBeNull();
     expect(x.buckets.every(b=>b.count===0)).toBe(true);
   }
   const filtered=summarizeListItems(rows.filter(r=>r.recordId==='nq3'));
   expect(filtered.total.total).toBe(1);
   expect(filtered.stages.find(c=>c.id==='party')?.buckets.find(b=>b.stage==='next')?.count).toBe(1);
 });
});
