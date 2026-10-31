import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {
  HC_BC_BUILD_VALUE,nonBuildKind,buildLocked,buildLockReason,effectiveBuildStatus,
  effectiveItemField,projectedBuildDisplayItem,rejectsBuildChange
} from '../src/domain/pr95-v5-l4-build-effective';
import {aggregateReport,reportItems,DEFAULT_REPORTS,getKpis} from '../src/domain/reporting';
import {filterListBySummary,summarizeListItems} from '../src/domain/item-summary';
import {newToolbarState,filterToolbarRows,exactChoices} from '../src/features/items/list-toolbar-filters';
import {projectedStatusFilterRows} from '../src/features/items/status-display';
import {reportStage} from '../src/domain/report-workflow';
import {canonicalStatus} from '../src/domain/status-contract';
import type {Item} from '../shared/types';

const template=createDemoItems(1)[0];
const row=(id:string,type:string,kind:Item['documentKind'],build:string):Item=>({
  ...template,recordId:id,displayCode:id,stt:Number(id.slice(1))||1,
  type,documentKind:kind,progressBuild:build,archivedAt:null,isDropped:false,
  progressCouncil:'VP đang xử lý',progressParty:'VP đang xử lý',
});
const items:Item[]=[
  row('r1','QPPL','NQ','Sở chưa trình'),
  row('r2','HC','NQ','Đã có QĐ'), // deliberately contradictory raw legacy
  row('r3','Báo cáo','BC','VP đang xử lý'), // contradictory raw legacy
  row('r4','Hành chính','NQ','Sở chưa trình'),
  row('r5','kiểu không xác định','NQ','Đã trình, chờ QĐ'),
  row('r6','QPPL','BC','Đã có QĐ'), // BC documentKind wins
];
const build=DEFAULT_REPORTS.find(x=>x.id==='build')!;
const identifiers=(values:Item[])=>values.map(x=>x.recordId);
const rawSnapshot=JSON.stringify(items);

describe('PR95 V5 L4: UI/read-domain HC/BC Business Build without raw migration',()=>{
  it('classifies ONLY known HC/BC/aliases, BC document kind and leaves unknown NQ untouched',()=>{
    expect(items.map(nonBuildKind)).toEqual([null,'HC','BC','HC',null,'BC']);
    expect(nonBuildKind({...template,documentKind:'UNCLASSIFIED',type:'   '})).toBeNull();
    expect(nonBuildKind({...template,documentKind:'NQ',type:'Quyết định khác'})).toBeNull();
    expect(nonBuildKind({...template,type:'hÀNh   CHÍNH'})).toBe('HC');
    expect(nonBuildKind({...template,type:'BÁO CÁO'})).toBe('BC');
    expect(buildLockReason(items[1])).toBe('Loại VB HC không phải trình xây dựng NQ nên trạng thái này không thể chỉnh sửa.');
    expect(buildLockReason(items[2])).toBe('Loại VB BC không phải trình xây dựng NQ nên trạng thái này không thể chỉnh sửa.');
    expect(buildLockReason(items[0])).toBeNull();
  });
  it('projects status only, leaves raw and every shared field stable, never mutates an item',()=>{
    for(const item of items){
      const raw={...item};
      const display=projectedBuildDisplayItem(item);
      expect(effectiveItemField(item,'progressBuild')).toBe(effectiveBuildStatus(item));
      expect(display.progressBuild).toBe(buildLocked(item)?HC_BC_BUILD_VALUE:item.progressBuild);
      expect(item).toEqual(raw);
      expect(display.recordId).toBe(item.recordId);
      expect(display.stt).toBe(item.stt);
      expect(display.documentKind).toBe(item.documentKind);
      if(buildLocked(item)){
        expect(display).not.toBe(item);
        expect(display.progressBuild).toBe('Không phải trình');
      }else expect(display).toBe(item);
    }
    expect(JSON.stringify(items)).toBe(rawSnapshot);
    const rows=projectedStatusFilterRows(items);
    expect(rows.map(x=>x.progressBuild)).toEqual([
      'Sở chưa trình','Không phải trình','Không phải trình','Không phải trình',
      'Đã trình, chờ QĐ','Không phải trình'
    ]);
    expect(JSON.stringify(items)).toBe(rawSnapshot);
  });
  it('guards both stale picker callbacks and same-patch prospective HC/BC, permits other edits and QPPL',()=>{
    expect(rejectsBuildChange(items[1],{progressBuild:'Không phải trình'})).toBe(true);
    expect(rejectsBuildChange(items[2],{progressBuild:'Đã có QĐ'})).toBe(true);
    expect(rejectsBuildChange(items[0],{progressBuild:'VP đang xử lý'})).toBe(false);
    expect(rejectsBuildChange(items[0],{type:'HC',progressBuild:'VP đang xử lý'})).toBe(true);
    expect(rejectsBuildChange(items[0],{type:'Báo cáo',progressBuild:'VP đang xử lý'})).toBe(true);
    expect(rejectsBuildChange(items[0],{note:'chỉ sửa ghi chú'})).toBe(false);
    expect(rejectsBuildChange(items[1],{note:'chỉ sửa ghi chú'})).toBe(false);
    expect(rejectsBuildChange(items[1],{progressBuild:items[1].progressBuild})).toBe(false);
    expect(rejectsBuildChange({...items[0],type:'HC'},{progressBuild:'VP đang xử lý'})).toBe(true);
    expect(JSON.stringify(items)).toBe(rawSnapshot);
  });
  it('default C02 and Build report exclude exactly four HC/BC, never count legacy completion',()=>{
    const report=aggregateReport(items,build,'department');
    expect(identifiers(reportItems(items,build))).toEqual(['r1','r5']);
    expect(report.total).toBe(2);
    expect(report.completedCount).toBe(0);
    expect(report.percent).toBe(0);
    expect(report.unknown).toEqual([]);
    const summary=summarizeListItems(items);
    const buildCard=summary.stages.find(s=>s.id==='build')!;
    expect(buildCard.total).toBe(2);
    expect(buildCard.complete).toBe(0);
    expect(buildCard.buckets.map(b=>[b.stage,b.count])).toEqual([
      ['source',1],['office',0],['next',1],['completed',0]
    ]);
    expect(identifiers(filterListBySummary(items,{report:'build',stage:'source'}))).toEqual(['r1']);
    expect(identifiers(filterListBySummary(items,{report:'build',stage:'next'}))).toEqual(['r5']);
    expect(JSON.stringify(items)).toBe(rawSnapshot);
  });
  it('includeNotRequired groups HC/BC in excluded, not done or unknown; raw ID drill rows preserved',()=>{
    const configured={...build,includeNotRequired:true,hiddenColumns:[]};
    const report=aggregateReport(items,configured,'department');
    expect(report.total).toBe(6);
    expect(report.completedCount).toBe(0);
    expect(report.percent).toBe(0);
    expect(report.unknown).toEqual([]);
    const entries=[...report.rows.values()].flatMap(cells=>[...cells.entries()]);
    const idsFor=(status:string)=>entries.flatMap(([label,values])=>label===status?values.map(x=>x.recordId):[]);
    expect(idsFor('Không phải trình')).toEqual(['r2','r3','r4','r6']);
    expect(idsFor('Sở chưa trình')).toEqual(['r1']);
    expect(idsFor('Đã trình, chờ QĐ')).toEqual(['r5']);
    expect(reportStage('Không phải trình',configured)).toBe('excluded');
    expect(reportItems(items,configured).every(x=>items.includes(x))).toBe(true); // raw scope
    expect(report.items.map(x=>x.progressBuild)).toEqual([
      'Sở chưa trình','Không phải trình','Không phải trình','Không phải trình',
      'Đã trình, chờ QĐ','Không phải trình'
    ]); // report stage chips read snapshots; never written back
    expect(JSON.stringify(items)).toBe(rawSnapshot);
  });
  it('list advanced detail dropdown and exact source filters match effective values, not old raw',()=>{
    const state=newToolbarState();
    state.details.progressBuild='Không phải trình';
    expect(identifiers(filterToolbarRows(items,state))).toEqual(['r2','r3','r4','r6']);
    state.details.progressBuild='Đã có QĐ';
    expect(filterToolbarRows(items,state)).toEqual([]);
    state.details.progressBuild='Đã trình, chờ QĐ';
    expect(identifiers(filterToolbarRows(items,state))).toEqual(['r5']);
    state.details.progressBuild='';
    state.field='progressBuild';state.search='Không phải trình';
    expect(identifiers(filterToolbarRows(items,state))).toEqual(['r2','r3','r4','r6']);
    state.search='đã có QĐ';
    expect(filterToolbarRows(items,state)).toEqual([]);
    expect(exactChoices(items,'progressBuild')).toContain('Không phải trình');
    expect(projectedStatusFilterRows(items).map(x=>canonicalStatus('progressBuild',x.progressBuild)))
      .toEqual(['Sở chưa trình','Không phải trình','Không phải trình','Không phải trình',
        'Đã trình, chờ QĐ','Không phải trình']);
    expect(JSON.stringify(items)).toBe(rawSnapshot);
  });
  it('new demo defaults apply HC/BC Build rule but retain all other seeded properties',()=>{
    const rows=createDemoItems(27);
    expect(rows).toHaveLength(27);
    expect(rows.filter(x=>x.isDropped||x.archivedAt).length).toBe(4);
    expect(rows.every(x=>!buildLocked(x)||x.progressBuild===HC_BC_BUILD_VALUE)).toBe(true);
    expect(new Set(rows.map(x=>x.recordId)).size).toBe(27);
    expect(rows.map(x=>x.stt)).toEqual(Array.from({length:27},(_,i)=>i+1));
    expect(rows.filter(x=>x.documentKind==='BC').length).toBe(9);
    expect(getKpis(rows).total).toBe(23);
  });
});
