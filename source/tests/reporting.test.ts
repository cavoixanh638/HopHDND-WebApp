import { describe, expect, it, vi } from 'vitest';
vi.mock('react',()=>({useMemo:(fn:()=>unknown)=>fn(),useRef:()=>({current:null}),useState:(value:unknown)=>[value,()=>{}]}));
import {ReportTable} from '../src/features/reports/ReportTable';
import {ReportLayoutPanel} from '../src/features/settings/ReportLayoutPanel';
import {DeferredWidthInput} from '../src/features/items/DeferredWidthInput';
import {defaultReportLayout,reportPageWidth,configuredReports,getReportFont,getReportVariant,withReportVisuals,validateReportLayout} from '../src/data/report-preferences';
import {GROUP_OPTIONS} from '../shared/field-definitions';
import { createDemoItems } from '../src/data/demo-items';
import { aggregateReport, DEFAULT_REPORTS, getKpis } from '../src/domain/reporting';
import {reportStage} from '../src/domain/report-workflow';


describe('Báo cáo có cùng tập dữ liệu và không mất tổng', () => {
  it('commits report page width through the dedicated editor, leaving other layout properties intact',()=>{
    const draft=defaultReportLayout(),onChange=vi.fn();
    const root=ReportLayoutPanel({draft,onChange,items:createDemoItems(2),group:'vpLeader',
      groupOrder:[],sourceLabel:'Google Sheets'});
    const nodes=(node:any):any[]=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];
    const width=nodes(root).find(node=>node.type===DeferredWidthInput&&node.props?.label==='Độ rộng trang Bảng báo cáo (px)');
    expect(width).toBeDefined();
    width.props.onCommit(2800);
    expect(reportPageWidth(onChange.mock.calls[0][0])).toBe(2800);
    expect(onChange.mock.calls[0][0][1]).toEqual(draft[1]);
    const auto=nodes(root).find(node=>node.type==='input'&&node.props?.type==='checkbox'&&node.props?.checked===true);
    expect(auto).toBeDefined();
  });
  it('renders all numeric cells centered with wrapped headings and preserves counts',()=>{
    const items=createDemoItems(7);
    const config=DEFAULT_REPORTS[1];
    const tree=ReportTable({items,config,group:'vpLeader',groupOrder:[],onSelect:()=>{}});
    const nodes=(v:any):any[]=>Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];
    const table=nodes(tree).find(n=>n.type==='table'&&n.props?.className==='data-table report-table');
    const th=nodes(table).filter(n=>n.type==='th'&&n.props?.className?.includes('report-number-header'));
    expect(th).toHaveLength(aggregateReport(items,config,'vpLeader').columns.length+2);
    expect(th.map(n=>n.props.scope)).toEqual(Array(th.length).fill('col'));
    const numeric=nodes(table).filter(n=>n.type==='td'&&n.props?.className?.includes('report-number'));
    expect(numeric.length).toBeGreaterThan(0);
    expect(nodes(table).some(n=>n.type==='tfoot')).toBe(true);
    const actual=aggregateReport(items,config,'vpLeader');
    expect(actual.total).toBe(actual.items.length);
  });
  it('classifies stages only by known values without inventing lateness',()=>{
    expect(reportStage(' Sở chưa trình ',DEFAULT_REPORTS[1])).toBe('source');
    expect(reportStage('VP đang thực hiện',DEFAULT_REPORTS[1])).toBe('office');
    expect(reportStage('Đã trình HĐND',DEFAULT_REPORTS[1])).toBe('next');
    expect(reportStage('Hoàn thành',DEFAULT_REPORTS[1])).toBe('completed');
    expect(reportStage('Sở xin rút',DEFAULT_REPORTS[1])).toBe('withdrawn');
    expect(reportStage('Trạng thái tự tạo',DEFAULT_REPORTS[1])).toBe('other');
  });
  it('persists visual emphasis on each report without changing grouping',()=>{
    const layout=defaultReportLayout().map((x,i)=>({...x,emphasizeProgress:i===0}));
    const saved=validateReportLayout(layout);
    expect(saved.map(x=>x.emphasizeProgress)).toEqual([true,false,false]);
    expect(saved.map(x=>x.columnOrder)).toEqual(layout.map(x=>x.columnOrder));
  });
  it('calculates per-leader and overall completion from only the final configured status',()=>{
    const rows=createDemoItems(5).map((item,i)=>({...item,documentKind:'NQ' as const,
      isDropped:false,archivedAt:null,vpLeader:i<4?'Lãnh đạo A':'Lãnh đạo B',
      progressCouncil:['Hoàn thành','Sở chưa trình','VP đang thực hiện','Đã trình HĐND','Hoàn thành'][i]}));
    const config=DEFAULT_REPORTS[1];
    const report=aggregateReport(rows,config,'vpLeader');
    expect(report.total).toBe(5);
    expect(report.completedCount).toBe(2);
    expect(report.percent).toBe(40);
    const tree=ReportTable({items:rows,config,group:'vpLeader',groupOrder:[],onSelect:()=>{}});
    const all=(v:any):any[]=>Array.isArray(v)?v.flatMap(all):v&&typeof v==='object'?[v,...all(v.props?.children)]:[];
    const table=all(tree).find(n=>n.type==='table'&&n.props?.className==='data-table report-table');
    const tbody=all(table).find(n=>n.type==='tbody');
    const bodyRows=all(tbody).filter(n=>n.type==='tr');
    const rates=bodyRows.map(row=>all(row).find(n=>n.type==='progress')?.props?.value);
    expect(rates).toEqual([25,100]);
    const foot=all(table).find(n=>n.type==='tfoot');
    expect(all(foot).find(n=>n.type==='progress')?.props?.value).toBe(40);
    expect(all(table).filter(n=>n.type==='th'&&n.props?.className?.includes('report-percent-col'))).toHaveLength(1);
  });
  it('shares saved font and variant between all reports without mutating source data',()=>{
    const seed=defaultReportLayout();
    const next=validateReportLayout(withReportVisuals(seed,{tableFont:'system',reportVariant:'compact'}));
    expect(getReportFont(next)).toBe('system');
    expect(getReportVariant(next)).toBe('compact');
    const reports=configuredReports(next);
    expect(reports).toHaveLength(3);
    for(const config of reports){
      const tree=ReportTable({items:createDemoItems(2),config,group:'vpLeader',groupOrder:[],onSelect:()=>{}});
      expect(tree.props.className).toContain('report-style-compact');
      expect(tree.props.style['--table-font-family']).toContain('system-ui');
    }
    expect(seed[0].tableFont).toBe('segoe');
    expect(()=>validateReportLayout(withReportVisuals(seed,{tableFont:'bad' as any}))).toThrow();
  });
  it('labels the first column according to selected grouping on all report tables',()=>{
    const nodes=(v:any):any[]=>Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];
    for(const choice of GROUP_OPTIONS){
      for(const config of DEFAULT_REPORTS){
        const tree=ReportTable({items:createDemoItems(5),config,group:choice.key,groupOrder:[],onSelect:()=>{}});
        const table=nodes(tree).find(n=>n.type==='table'&&n.props?.className==='data-table report-table');
        expect(table).toBeDefined();
        const columns=nodes(table).find(n=>n.type==='colgroup');
        expect(nodes(columns).filter(n=>n.type==='col')[0].props.className).toBe('report-group-col');
        const header=nodes(table).find(n=>n.type==='th'&&n.props?.scope==='col');
        expect(header.props.children).toBe(choice.label);
      }
    }
  });
  it('excludes rows marked Không in Excel party-level F or Không phải xin ý kiến in G',()=>{
    const seed=createDemoItems(4).map(x=>({...x,isDropped:false,archivedAt:null}));
    seed[0].partyLevel='Không';
    seed[1].partyLevel='Không phải xin ý kiến';
    seed[2].partyLevel='BTV TU';seed[2].progressParty='Không phải xin ý kiến';
    seed[3].partyLevel='BTV TU';seed[3].progressParty='Sở chưa trình';
    const report=aggregateReport(seed,DEFAULT_REPORTS[0],'department');
    expect(report.total).toBe(1);
    expect(report.items[0].recordId).toBe(seed[3].recordId);
    expect(report.rows.size).toBe(1);
  });
  it('fixture không đặt Không phải xin ý kiến cho nội dung cần xin ý kiến', () => {
    for (const item of createDemoItems(100)) {
      if (item.partyLevel !== 'Không phải xin ý kiến') expect(item.progressParty).not.toBe('Không phải xin ý kiến');
    }
  });
  it('rút/lưu trữ không tính nhưng đề nghị rút vẫn tính', () => {
    const seed = createDemoItems(4);
    seed[0].isDropped = true;
    seed[1].archivedAt = '2026-01-01';
    seed[2].progressCouncil = 'Sở xin rút';
    expect(getKpis(seed).total).toBe(2);
  });
  it('ẩn một cột không đổi tổng/tỷ lệ; giá trị lạ còn chi tiết', () => {
    const items = createDemoItems(3).map((item, i) => ({ ...item, documentKind: 'NQ' as const, progressCouncil: ['Hoàn thành', 'Sở chưa trình', 'Trạng thái mới'][i] }));
    const config = { ...DEFAULT_REPORTS[1], hiddenColumns: ['Hoàn thành'] };
    const report = aggregateReport(items, config, 'department');
    expect(report.total).toBe(3);
    expect(report.percent).toBe(33);
    expect(report.hiddenCount).toBe(1);
    expect(report.columns).not.toContain('Hoàn thành');
    expect(report.unknown).toEqual(['Trạng thái mới']);
    expect([...report.rows.values()].flatMap(cells => [...cells.values()].flat()).length).toBe(3);
    expect(getKpis(items).completed).toBe(report.completedCount);
  });
  it('loại BC rõ ràng bất kể mã có tiền tố NQ; nhóm __proto__ an toàn', () => {
    const item = { ...createDemoItems(1)[0], displayCode: 'NQ-0001', documentKind: 'BC' as const, department: '__proto__' };
    expect(aggregateReport([item], DEFAULT_REPORTS[1], 'department').total).toBe(0);
    expect(aggregateReport([item], DEFAULT_REPORTS[2], 'department').rows.has('__proto__')).toBe(true);
  });
});

