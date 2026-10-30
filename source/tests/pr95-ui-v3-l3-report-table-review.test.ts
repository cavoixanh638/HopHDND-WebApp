import {describe,expect,it,vi} from 'vitest';
vi.mock('react',()=>({
  memo:(fn:unknown)=>fn,useEffect:()=>{},useMemo:(fn:()=>unknown)=>fn(),
  useRef:()=>({current:null}),useState:(value:unknown)=>[value,()=>{}],
}));
import {ReportTable} from '../src/features/reports/ReportTable';
import {DEFAULT_REPORTS,aggregateReport} from '../src/domain/reporting';
import {createDemoItems} from '../src/data/demo-items';
import type {Item,ReportConfig} from '../shared/types';

const walk=(node:any):any[]=>Array.isArray(node)?node.flatMap(walk):
  node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];

const records=():Item[]=>{
  const party=['Sở chưa trình','VP đang thực hiện','Đã gửi ĐU',
    'ĐU đã gửi TU chưa họp','Đã họp/xin phiếu, chưa có TBKL',
    'Đã có TBKL','TU đã cho ý kiến','Sở chưa trình'];
  const build=['Sở chưa trình','VP đang thực hiện','Đã trình HĐND, chưa có QĐ',
    'Đã có QĐ chấp thuận','Đã trình, chờ QĐ','Đã có QĐ',
    'Không phải trình xây dựng NQ','Sở chưa trình'];
  const council=['Sở chưa trình','VP đang thực hiện','Hoàn thành',
    'Đã trình HĐND thành phố','Hoàn thành','VP đang xử lý','Không rõ','Hoàn thành'];
  return createDemoItems(8).map((item,index)=>({
    ...item,recordId:'v3-'+index,displayCode:'NQ'+index,stt:index+1,
    documentKind:index===7?'BC' as const:'NQ' as const,
    type:'QPPL',room:'Phòng thử màu',
    isDropped:false,archivedAt:null,partyLevel:'BTV TU',
    progressParty:party[index],progressBuild:build[index],progressCouncil:council[index]
  }));
};
type Stage='source'|'office'|'next'|'completed';
const cases:{
  id:ReportConfig['id'],names:string[],buckets:Partial<Record<Stage,number[]>>
}[]=[
  {id:'party',names:['Sở chưa trình','VP đang xử lý','Bước tiếp theo','Đã có TBKL'],
    buckets:{source:[0,7],office:[1],next:[2,3,4],completed:[5]}},
  {id:'build',names:['Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'],
    buckets:{source:[0],office:[1],next:[2,4],completed:[3,5]}},
  {id:'council',names:['Sở chưa trình','VP đang xử lý','Hoàn thành'],
    buckets:{source:[0],office:[1,5],completed:[2,3,4,7]}},
  {id:'nq',names:['Sở chưa trình','VP đang xử lý','Hoàn thành'],
    buckets:{source:[0],office:[1,5],completed:[2,3,4]}},
  {id:'bc',names:['Sở chưa trình','VP đang xử lý','Hoàn thành'],
    buckets:{source:[],office:[],completed:[7]}},
];
const configFor=(id:ReportConfig['id'])=>DEFAULT_REPORTS.find(row=>row.id===id)!;
const summary=(rendered:any)=>walk(rendered).filter(node=>
  node.type==='button'&&String(node.props?.className??'').startsWith('report-stage-summary'));
const chipText=(chip:any)=>walk(chip).find(node=>node.type==='span')?.props?.children;
const chipCount=(chip:any)=>walk(chip).find(node=>node.type==='strong')?.props?.children;

describe('R-V3-02: report-context summary labels / aria / popup titles',()=>{
  it('uses exact labels in all five reports; click ids/counts, exclusions and raw source stay untouched',()=>{
    const rows=records(),before=JSON.stringify(rows);
    for(const scenario of cases){
      const config=configFor(scenario.id),onSelect=vi.fn();
      const rendered=ReportTable({items:rows,config,group:'room',groupOrder:[],onSelect});
      const chips=summary(rendered);
      expect(chips.map(chipText),scenario.id).toEqual(scenario.names);
      expect(chips).toHaveLength(scenario.id==='party'||scenario.id==='build'?4:3);
      for(let i=0;i<chips.length;i++){
        const label=scenario.names[i];
        const stage=(['source','office',...(scenario.names.length===4?['next']:[]),'completed'] as Stage[])[i];
        const wanted=(scenario.buckets[stage]??[]).map(index=>rows[index]);
        expect(chipCount(chips[i]),scenario.id+':'+stage).toBe(wanted.length);
        expect(chips[i].props['aria-label']).toBe(
          config.title+' · '+label+': '+wanted.length+' nội dung. Bấm để xem chi tiết');
        expect(chips[i].props.disabled).toBe(wanted.length===0);
        if(wanted.length){
          chips[i].props.onClick();
          expect(onSelect).toHaveBeenLastCalledWith(config.title+' · '+label,wanted);
        }
      }
      expect(chips.filter(chip=>chipText(chip)==='Bước tiếp theo')).toHaveLength(
        scenario.id==='party'?1:0);
      const preview=ReportTable({items:rows,config,group:'room',groupOrder:[],
        onSelect,preview:true});
      const spans=walk(preview).filter(node=>node.type==='span'&&
        String(node.props.className??'').startsWith('report-stage-summary'));
      expect(spans.map(chipText)).toEqual(scenario.names);
      expect(summary(preview)).toEqual([]);
      expect(JSON.stringify(rows)).toBe(before);
    }
  });

  it('respects an administrator custom report title in display, aria and opened popup',()=>{
    const rows=records(),onSelect=vi.fn();
    const config={...configFor('build'),title:'Báo cáo xây dựng NQ của đơn vị'};
    const rendered=ReportTable({items:rows,config,group:'room',groupOrder:[],onSelect});
    const chips=summary(rendered);
    const next=chips.find(chip=>chipText(chip)==='Đã trình, chờ QĐ')!;
    expect(next).toBeDefined();
    expect(next.props['aria-label']).toBe(
      'Báo cáo xây dựng NQ của đơn vị · Đã trình, chờ QĐ: 2 nội dung. Bấm để xem chi tiết');
    next.props.onClick();
    expect(onSelect).toHaveBeenCalledWith(
      'Báo cáo xây dựng NQ của đơn vị · Đã trình, chờ QĐ',[rows[2],rows[4]]);
    expect(walk(rendered).find(node=>node.type==='h3')?.props.children[0]).toBe(config.title);
  });
});

describe('R-V3-02: actual report headers/body/footers keep muted intermediate colors',()=>{
  const getStatusCells=(rows:Item[],config:ReportConfig,label:string)=>{
    const root=ReportTable({items:rows,config,group:'room',groupOrder:[],onSelect:()=>{}});
    const report=aggregateReport(rows,config,'room'),index=report.columns.indexOf(label);
    expect(index,'missing '+label+' in '+config.id).toBeGreaterThanOrEqual(0);
    const table=walk(root).find(node=>node.type==='table'&&node.props.className==='data-table report-table');
    const thead=walk(table).find(node=>node.type==='thead');
    const header=walk(thead).find(node=>node.type==='th'&&
      walk(node).some(child=>child.type==='span'&&child.props?.className==='report-heading-label'&&
        child.props.children===label));
    const tbody=walk(table).find(node=>node.type==='tbody');
    const footer=walk(table).find(node=>node.type==='tfoot');
    const bodyCells=walk(tbody).filter(node=>node.type==='td');
    const footCells=walk(footer).filter(node=>node.type==='td');
    return [header,bodyCells[index+1],footCells[index+1]];
  };
  const assertClass=(rows:Item[],config:ReportConfig,label:string,milestone:string,quiet:boolean)=>{
    const cells=getStatusCells(rows,config,label);
    expect(cells.every(Boolean),config.id+' '+label).toBe(true);
    for(const cell of cells){
      expect(cell.props.className,config.id+':'+label).toContain('report-stage-'+milestone);
      if(quiet)expect(cell.props.className).toContain('report-stage-intermediate');
      else expect(cell.props.className).not.toContain('report-stage-intermediate');
    }
  };
  it('Party three new middle statuses plus proven old aliases are muted; TBKL remains prominent',()=>{
    const rows=records(),before=JSON.stringify(rows),config=configFor('party');
    for(const status of ['Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL'])
      assertClass(rows,config,status,'next',true);
    assertClass(rows,config,'Sở chưa trình','source',false);
    assertClass(rows,config,'VP đang xử lý','office',false);
    assertClass(rows,config,'Đã có TBKL','completed',false);
    expect(rows[3].progressParty).toBe('ĐU đã gửi TU chưa họp');
    expect(rows[4].progressParty).toBe('Đã họp/xin phiếu, chưa có TBKL');
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('Build pending decision & exemption are muted; decision and other workflow finishes are not',()=>{
    const rows=records(),before=JSON.stringify(rows),config={
      ...configFor('build'),includeNotRequired:true,hiddenColumns:[]};
    assertClass(rows,config,'Đã trình, chờ QĐ','next',true);
    assertClass(rows,config,'Không phải trình','excluded',true);
    assertClass(rows,config,'VP đang xử lý','office',false);
    assertClass(rows,config,'Đã có QĐ','completed',false);
    expect(rows[2].progressBuild).toBe('Đã trình HĐND, chưa có QĐ');
    expect(rows[3].progressBuild).toBe('Đã có QĐ chấp thuận');
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('Council/NQ/BC done is Hoàn thành and NEVER inherits Party/Build muted colors',()=>{
    const rows=records();
    for(const id of ['council','nq','bc'] as const){
      const config=configFor(id);
      assertClass(rows,config,'Hoàn thành','completed',false);
      assertClass(rows,config,'Sở chưa trình','source',false);
      assertClass(rows,config,'VP đang xử lý','office',false);
    }
  });
});
