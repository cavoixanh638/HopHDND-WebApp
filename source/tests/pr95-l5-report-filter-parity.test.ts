import {describe,expect,it} from 'vitest';
import type {Item,DocumentKind} from '../shared/types';
import {DEFAULT_REPORTS,aggregateReport,getKpis,normalizeReportStatus,reportItems} from '../src/domain/reporting';
import {filterListBySummary,summarizeListItems} from '../src/domain/item-summary';
import {reportStage} from '../src/domain/report-workflow';

// Hand-specified fixture. NEVER derive expected counts from the functions under test.
function row(code:string,kind:DocumentKind='NQ',changes:Partial<Item>={}):Item {
  return {
    recordId:'r-'+code,displayCode:code,stt:1,documentKind:kind,
    content:'Nội dung '+code,department:'Sở thử',type:'HC',partyLevel:'BTV',
    progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',
    progressCouncil:'Sở chưa trình',specialist:'CV A',room:'Phòng A',
    vpLeader:'VP A',ubndLeader:'UB A',specificProgress:'',note:'',
    isDropped:false,archivedAt:null,revision:1,...changes,
  };
}
const fixture=():Item[]=>[
  row('A','NQ',{type:'QPPL'}),
  row('B','NQ',{progressParty:'VP đang xử lý',progressBuild:'VP đang thực hiện',progressCouncil:'VP đang thực hiện'}),
  row('C','NQ',{type:'QPPL',progressParty:'Đã gửi ĐU',progressBuild:'Đã trình HĐND, chưa có QĐ',progressCouncil:'Hoàn thành'}),
  row('D','NQ',{progressParty:'ĐU đã gửi TU chưa họp',progressBuild:'Đã có QĐ chấp thuận',progressCouncil:'Đã trình HĐND thành phố'}),
  row('E','NQ',{progressParty:'Đã họp chưa có TBKL',progressBuild:'Không phải trình xây dựng NQ',progressCouncil:'Trạng thái lạ'}),
  row('F','NQ',{type:'QPPL',progressParty:'Đã có TBKL',progressBuild:'Đã có QĐ chấp thuận',progressCouncil:''}),
  row('G','NQ',{partyLevel:'Không phải xin ý kiến',progressParty:'Không phải xin ý kiến',
    progressBuild:'Không phải trình',progressCouncil:'Đã trình HĐND TP'}),
  row('H','NQ',{progressParty:'TU đã cho ý kiến',progressBuild:'Đang xin ý kiến',progressCouncil:'Chưa chuẩn hóa'}),
  row('I','BC'),
  row('J','UNCLASSIFIED'),
  row('K','NQ',{isDropped:true,progressParty:'Đã có TBKL',progressBuild:'Đã có QĐ chấp thuận',progressCouncil:'Hoàn thành'}),
  row('L','BC',{archivedAt:'2026-10-01',progressCouncil:'Hoàn thành'}),
  row('M','NQ',{partyLevel:'Không phải xin ý kiến',progressBuild:''}),
  row('N','NQ',{progressParty:'',progressBuild:'',progressCouncil:''}),
];
const codes=(items:Item[])=>items.map(row=>row.displayCode);
const expected={
  party:{source:['A','I','J','N'],office:['B'],next:['C','D','E'],completed:['F'],unmatched:['H'],total:10,complete:1,percent:10},
  build:{source:['A'],office:['B'],next:['C'],completed:['D','F'],unmatched:['H'],total:6,complete:2,percent:33},
  nq:{source:['A','F','M','N'],office:['B'],completed:['C','D','G'],unmatched:['E','H'],total:10,complete:3,percent:30},
} as const;

describe('PR95 L5: independently enumerated List/Report parity',()=>{
  it('has exactly 4-4-3 bucket groups and preserves the separate Council/BC reports',()=>{
    const rows=fixture();
    const snapshot=JSON.stringify(rows);
    const summary=summarizeListItems(rows);
    expect(summary.total).toEqual({
      total:12,nq:10,bc:1,unclassified:1,pending:6,doing:1,completed:3,
      qppl:3,hc:7,nqUnclassified:0,
    });
    expect(summary.stages.map(x=>x.buckets.length)).toEqual([4,4,3]);
    expect(summary.stages.map(x=>x.id)).toEqual(['party','build','nq']);
    for(const stage of summary.stages){
      const check=expected[stage.id];
      expect({total:stage.total,complete:stage.complete,percent:stage.percent})
        .toEqual({total:check.total,complete:check.complete,percent:check.percent});
      for(const bucket of stage.buckets){
        const ids=(check as Record<string,unknown>)[bucket.stage] as readonly string[]|undefined;
        expect(ids,stage.id+':'+bucket.stage).toBeDefined();
        expect(bucket.count).toBe(ids!.length);
        expect(bucket.ids).toEqual(ids!.map(code=>'r-'+code));
        expect(codes(filterListBySummary(rows,{report:stage.id,stage:bucket.stage})))
          .toEqual(ids);
      }
      expect(stage.unmatchedIds).toEqual(check.unmatched.map(code=>'r-'+code));
      expect(stage.unmatched).toBe(check.unmatched.length);
      expect(stage.buckets.reduce((sum,b)=>sum+b.count,0)+stage.unmatched).toBe(stage.total);
      expect(new Set([...stage.buckets.flatMap(b=>b.ids),...stage.unmatchedIds]).size)
        .toBe(stage.total);
    }
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(DEFAULT_REPORTS.map(r=>r.id)).toEqual(['party','build','council','nq','bc']);
  });

  it('normalizes historic Council completions in both KPI and report, never upgrading unknowns',()=>{
    const rows=fixture();
    expect(getKpis(rows).completed).toBe(3);
    expect(getKpis(rows).pending).toBe(6);
    const council=DEFAULT_REPORTS.find(r=>r.id==='council')!;
    const all=aggregateReport(rows,council,'department');
    const nq=aggregateReport(rows,DEFAULT_REPORTS.find(r=>r.id==='nq')!,'department');
    const bc=aggregateReport(rows,DEFAULT_REPORTS.find(r=>r.id==='bc')!,'department');
    expect({total:all.total,completed:all.completedCount,percent:all.percent})
      .toEqual({total:11,completed:3,percent:27});
    expect({total:nq.total,completed:nq.completedCount,percent:nq.percent})
      .toEqual({total:10,completed:3,percent:30});
    expect({total:bc.total,completed:bc.completedCount,percent:bc.percent})
      .toEqual({total:1,completed:0,percent:0});
    expect(all.total).toBe(nq.total+bc.total);
    expect(all.rows.get('Sở thử')?.get('Chưa chuẩn hóa')?.map(x=>x.displayCode))
      .toEqual(['E','H']);
    expect(all.unknown).toEqual(['Trạng thái lạ','Chưa chuẩn hóa']);
    expect(normalizeReportStatus(' Hoàn thành ',council)).toBe('Hoàn thành');
    expect(normalizeReportStatus('Đã trình HĐND TP',council)).toBe('Hoàn thành');
    expect(normalizeReportStatus('Chưa chuẩn hóa',council)).toBe('Chưa chuẩn hóa');
    expect(reportStage('Chưa chuẩn hóa',council)).toBe('other');
  });

  it('keeps exempt, blank, withdrawn and archived records in their established scopes only',()=>{
    const rows=fixture();
    const party=DEFAULT_REPORTS.find(r=>r.id==='party')!;
    const build=DEFAULT_REPORTS.find(r=>r.id==='build')!;
    expect(codes(reportItems(rows,party))).toEqual(['A','B','C','D','E','F','H','I','J','N']);
    expect(codes(reportItems(rows,build))).toEqual(['A','B','C','D','F','H']);
    expect(codes(reportItems(rows,{...party,includeNotRequired:true})))
      .toEqual(['A','B','C','D','E','F','G','H','I','J','M','N']);
    expect(codes(reportItems(rows,{...build,includeNotRequired:true})))
      .toEqual(['A','B','C','D','E','F','G','H']);
    expect(aggregateReport(rows,{...party,includeNotRequired:true,hiddenColumns:[]},'department')
      .rows.get('Sở thử')?.get('Không phải trình')?.map(x=>x.displayCode)).toEqual(['G']);
    expect(aggregateReport(rows,{...build,includeNotRequired:true,hiddenColumns:[]},'department')
      .rows.get('Sở thử')?.get('Không phải trình')?.map(x=>x.displayCode)).toEqual(['E','G']);
    for(const report of DEFAULT_REPORTS){
      const scoped=reportItems(rows,report);
      expect(scoped.every(x=>x.displayCode!=='K'&&x.displayCode!=='L')).toBe(true);
      const agg=aggregateReport(rows,report,'department');
      expect(agg.total).toBe(scoped.length);
      expect(agg.items).toEqual(scoped);
    }
  });

  it('each exact report cell equals its independently enumerated drilldown set',()=>{
    const rows=fixture();
    const expectedCells:Record<string,Record<string,string[]>>={
      party:{
        'Sở chưa trình':['A','I','J','N'],'VP đang xử lý':['B'],
        'Đã gửi ĐU':['C'],'ĐU gửi TU, chưa họp':['D'],
        'Đã xin ý kiến, chờ TBKL':['E'],'Đã có TBKL':['F'],
        'Chưa chuẩn hóa':['H'],
      },
      build:{
        'Sở chưa trình':['A'],'VP đang xử lý':['B'],
        'Đã trình, chờ QĐ':['C'],'Đã có QĐ':['D','F'],
        'Chưa chuẩn hóa':['H'],
      },
      council:{
        'Sở chưa trình':['A','F','I','M','N'],'VP đang xử lý':['B'],
        'Hoàn thành':['C','D','G'],'Chưa chuẩn hóa':['E','H'],
      },
      nq:{
        'Sở chưa trình':['A','F','M','N'],'VP đang xử lý':['B'],
        'Hoàn thành':['C','D','G'],'Chưa chuẩn hóa':['E','H'],
      },
      bc:{'Sở chưa trình':['I']},
    };
    for(const config of DEFAULT_REPORTS){
      const report=aggregateReport(rows,config,'department');
      const group=report.rows.get('Sở thử');
      const actual=Object.fromEntries([...(group??new Map())]
        .map(([status,records])=>[status,codes(records)]));
      expect(actual,config.id).toEqual(expectedCells[config.id]);
      const all=[...(group?.values()??[])].flat();
      expect(all).toHaveLength(report.total);
      expect(new Set(all.map(item=>item.recordId)).size).toBe(report.total);
      for(const [status,records] of group??[]){
        expect(records.map(item=>item.recordId))
          .toEqual(expectedCells[config.id][status].map(code=>'r-'+code));
      }
    }
  });

  it('counts a blank Council status as source; blank construction is outside current scope',()=>{
    const rows=fixture();
    expect(codes(filterListBySummary(rows,{report:'nq',stage:'source'})))
      .toEqual(['A','F','M','N']);
    expect(codes(filterListBySummary(rows,{report:'build',stage:'source'}))).toEqual(['A']);
    const empty=summarizeListItems([]);
    expect(empty.total).toEqual({
      total:0,nq:0,bc:0,unclassified:0,pending:0,doing:0,completed:0,
      qppl:0,hc:0,nqUnclassified:0,
    });
    for(const stage of empty.stages){
      expect(stage.total).toBe(0);
      expect(stage.percent).toBeNull();
      expect(stage.complete).toBe(0);
      expect(stage.buckets.every(x=>x.count===0&&x.ids.length===0)).toBe(true);
    }
    expect(aggregateReport([],DEFAULT_REPORTS[0],'department').percent).toBeNull();
  });
});
