import { describe, expect, it, vi } from 'vitest';
vi.mock('react',()=>({memo:(fn:unknown)=>fn,useMemo:(fn:()=>unknown)=>fn(),useRef:()=>({current:null}),useState:(value:unknown)=>[value,()=>{}]}));
import {ReportTable} from '../src/features/reports/ReportTable';
import {ColumnResizeHandle} from '../src/components/ColumnResizeHandle';
import {ReportLayoutPanel} from '../src/features/settings/ReportLayoutPanel';
import {DeferredWidthInput} from '../src/features/items/DeferredWidthInput';
import {defaultReportLayout,reportPageWidth,configuredReports,getReportFont,getReportFontSize,getReportVariant,withReportVisuals,validateReportLayout,TABLE_FONT_OPTIONS,REPORT_VARIANTS} from '../src/data/report-preferences';
import {GROUP_OPTIONS} from '../shared/field-definitions';
import { createDemoItems } from '../src/data/demo-items';
import { aggregateReport, DEFAULT_REPORTS, getKpis } from '../src/domain/reporting';
import {reportStage} from '../src/domain/report-workflow';



describe('Kéo độ rộng và mở chi tiết số liệu',()=>{
  const flatten=(node:any):any[]=>Array.isArray(node)?node.flatMap(flatten):
    node&&typeof node==='object'?[node,...flatten(node.props?.children)]:[];
  it('displays independent resize grips on each report header only in editing mode',()=>{
    const onColumnResize=vi.fn();
    const config={...DEFAULT_REPORTS[1],columnWidths:{'Không phải trình':178}};
    const rendered=ReportTable({items:createDemoItems(5),config,group:'room',
      sourceLabel:'Nguồn thử',groupOrder:[],onSelect:()=>{},onColumnResize,preview:true});
    const handles=flatten(rendered).filter(element=>element.type===ColumnResizeHandle);
    expect(handles).toHaveLength(config.columns.length+3);
    const grip=handles.find(element=>element.props.label==='Không phải trình');
    expect(grip.props.width).toBe(178);
    grip.props.onCommit(210);
    expect(onColumnResize).toHaveBeenCalledWith('Không phải trình',210);
    const viewer=ReportTable({items:createDemoItems(5),config,group:'room',
      sourceLabel:'Nguồn thử',groupOrder:[],onSelect:()=>{}});
    expect(flatten(viewer).some(element=>element.type===ColumnResizeHandle)).toBe(false);
  });
  it('opens matching detail records from positive counts including group totals',()=>{
    const items=createDemoItems(5).map((item,i)=>({
      ...item,isDropped:false,archivedAt:null,documentKind:'NQ' as const,
      room:'Một phòng',progressBuild:i===0?'Không phải trình xây dựng NQ':'Sở chưa trình',
    }));
    const onSelect=vi.fn();
    const rendered=ReportTable({items,config:DEFAULT_REPORTS[1],group:'room',
      sourceLabel:'Nguồn thử',groupOrder:[],onSelect});
    const buttons=flatten(rendered).filter(node=>
      node.type==='button'&&node.props?.className==='count-button count-drill');
    const total=buttons.find(node=>node.props['aria-label']?.includes('Tổng số nội dung'));
    expect(total).toBeDefined();
    total.props.onClick();
    expect(onSelect).toHaveBeenCalledWith('Một phòng · Tổng số nội dung',items);
    const exempt=buttons.find(node=>node.props['aria-label']?.includes('Không phải trình'));
    expect(exempt).toBeDefined();
    exempt.props.onClick();
    expect(onSelect).toHaveBeenCalledWith('Một phòng · Không phải trình',[items[0]]);
  });
});

describe('Bảng xây dựng NQ lấy dữ liệu từ Excel H',()=>{
  it('has exactly five default reports and construction stage before issuance NQ',()=>{
    expect(DEFAULT_REPORTS.map(report=>report.id)).toEqual(['party','build','council','nq','bc']);
    expect(DEFAULT_REPORTS[1].title).toBe('Tiến độ trình HĐND xây dựng NQ');
    expect(DEFAULT_REPORTS[1].statusField).toBe('progressBuild');
    expect(DEFAULT_REPORTS[1].columns).toEqual([
      'Không phải trình','Sở chưa trình','VP đang thực hiện','Đã trình HĐND, chưa có QĐ','Đã có QĐ chấp thuận'
    ]);
    expect(DEFAULT_REPORTS[1].completed).toEqual(['Đã có QĐ chấp thuận']);
  });
  it('includes explicit non-applicable construction rows but excludes blanks and BC without duplicating records',()=>{
    const states=['Không phải trình xây dựng NQ','Sở chưa trình','VP đang thực hiện',
      'Đã trình HĐND, chưa có QĐ','Đã có QĐ chấp thuận','','Đã có QĐ chấp thuận'];
    const items=createDemoItems(7).map((item,index)=>({...item,
      isDropped:false,archivedAt:null,documentKind:index===6?'BC' as const:'NQ' as const,
      progressBuild:states[index],
    }));
    const before=JSON.stringify(items);
    const report=aggregateReport(items,DEFAULT_REPORTS[1],'room');
    expect(report.total).toBe(5);
    expect(report.items).toHaveLength(5);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(20);
    expect(report.unknown).toEqual([]);
    expect(report.columns).toEqual(DEFAULT_REPORTS[1].columns);
    expect(JSON.stringify(items)).toBe(before);
  });
  it('combines NQ+BC exactly as the sum of both issuance tables, including final completion',()=>{
    const raw=createDemoItems(9).map((item,i)=>({...item,isDropped:false,archivedAt:null,
      documentKind:i<6?'NQ' as const:'BC' as const,room:'Phòng minh họa',
      progressCouncil:['Sở chưa trình','VP đang thực hiện','Hoàn thành'][i%3]}));
    const summary=aggregateReport(raw,DEFAULT_REPORTS[2],'room');
    const nq=aggregateReport(raw,DEFAULT_REPORTS[3],'room');
    const bc=aggregateReport(raw,DEFAULT_REPORTS[4],'room');
    expect(summary.total).toBe(nq.total+bc.total);
    expect(summary.total).toBe(9);
    expect(summary.completedCount).toBe(nq.completedCount+bc.completedCount);
    expect(summary.completedCount).toBe(3);
    expect(summary.columns).toEqual(['Sở chưa trình','VP đang thực hiện','Đã trình HĐND thành phố']);
    expect(summary.unknown).toEqual([]);
    expect(DEFAULT_REPORTS[3].columns).not.toContain('Hoàn thành');
    expect(DEFAULT_REPORTS[4].columns).not.toContain('Hoàn thành');
    expect(DEFAULT_REPORTS[2].completed).toEqual(['Đã trình HĐND thành phố']);
  });
  it('marks the Excel H pending-decision column as quiet but final approval as prominent',()=>{
    const root=ReportTable({items:createDemoItems(5),config:DEFAULT_REPORTS[1],
      group:'room',groupOrder:[],onSelect:()=>{}});
    const flatten=(v:any):any[]=>Array.isArray(v)?v.flatMap(flatten):
      v&&typeof v==='object'?[v,...flatten(v.props?.children)]:[];
    const headers=flatten(flatten(root).find(x=>x.type==='thead')).filter(x=>x.type==='th');
    const find=(name:string)=>headers.find(x=>x.props.children?.props?.children===name);
    expect(find('Đã trình HĐND, chưa có QĐ')?.props.className).toContain('report-stage-intermediate');
    expect(find('Đã có QĐ chấp thuận')?.props.className).not.toContain('report-stage-intermediate');
  });
  it('does not render an extra all-caps section kicker above the report name',()=>{
    const root=ReportTable({items:createDemoItems(5),config:DEFAULT_REPORTS[1],group:'room',
      groupOrder:[],onSelect:()=>{}});
    const flatten=(node:any):any[]=>Array.isArray(node)?node.flatMap(flatten):
      node&&typeof node==='object'?[node,...flatten(node.props?.children)]:[];
    const header=flatten(root).find(node=>node.type==='div'&&node.props?.className==='card-header');
    expect(flatten(header).some(node=>node.type==='p'&&node.props?.className==='report-section-kicker')).toBe(false);
    expect(flatten(header).find(node=>node.type==='h3')?.props.children).toBe(DEFAULT_REPORTS[1].title);
  });
});

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
    const config=DEFAULT_REPORTS[2];
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
  it('does not invent a completed TU milestone from an unrecognized source status',()=>{
    const states=['Sở chưa trình','VP đang thực hiện','TU đã cho ý kiến',
      'Đã xin ý kiến TU','Đã gửi ĐU','ĐU đã gửi TU, chưa họp',
      'Đã họp/xin phiếu, chưa có TBKL','Đã có TBKL'];
    const items=createDemoItems(states.length).map((item,index)=>({...item,
      partyLevel:'BTV TU',progressParty:states[index],
      isDropped:false,archivedAt:null,room:'Phòng thử nghiệm'}));
    const before=JSON.stringify(items);
    const config=DEFAULT_REPORTS[0];
    const report=aggregateReport(items,config,'room');
    expect(report.total).toBe(8);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(13);
    expect(report.unknown).toEqual(['TU đã cho ý kiến','Đã xin ý kiến TU']);
    expect(report.columns).toContain('Chưa chuẩn hóa');
    expect(report.columns).not.toContain('Đã xin ý kiến TU');
    expect(report.rows.get('Phòng thử nghiệm')?.get('Chưa chuẩn hóa')).toHaveLength(2);
    expect(JSON.stringify(items)).toBe(before);
    const root=ReportTable({items,config,group:'room',groupOrder:[],onSelect:()=>{}});
    const nodes=(v:any):any[]=>Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];
    const table=nodes(root).find(n=>n.type==='table'&&n.props.className==='data-table report-table');
    const header=nodes(table).find(n=>n.type==='thead');
    const heads=nodes(header).filter(n=>n.type==='th');
    const byName=(name:string)=>heads.find(n=>
      n.props.children===name||n.props.children?.props?.children===name);
    for(const name of ['Đã gửi ĐU','ĐU đã gửi TU, chưa họp','Đã họp/xin phiếu, chưa có TBKL'])
      expect(byName(name)?.props.className).toContain('report-stage-intermediate');
    for(const name of ['Sở chưa trình','VP đang thực hiện','Đã có TBKL'])
      expect(byName(name)?.props.className).not.toContain('report-stage-intermediate');
    expect(byName('Đã có TBKL')?.props.className).toContain('report-stage-completed');
    expect(byName('VP đang thực hiện')?.props.className).toContain('report-stage-office');
    const cells=nodes(table).filter(n=>n.type==='td'&&n.props.className?.includes('report-stage-intermediate'));
    expect(cells.length).toBeGreaterThan(0);
  });
  it('classifies stages only by known values without inventing lateness',()=>{
    expect(reportStage(' Sở chưa trình ',DEFAULT_REPORTS[2])).toBe('source');
    expect(reportStage('VP đang thực hiện',DEFAULT_REPORTS[2])).toBe('office');
    expect(reportStage('Đã trình HĐND, chưa có QĐ',DEFAULT_REPORTS[1])).toBe('next');
    expect(reportStage('Đã trình HĐND thành phố',DEFAULT_REPORTS[2])).toBe('completed');
    expect(reportStage('Sở xin rút',DEFAULT_REPORTS[2])).toBe('withdrawn');
    expect(reportStage('Trạng thái tự tạo',DEFAULT_REPORTS[2])).toBe('other');
  });
  it('persists visual emphasis on each report without changing grouping',()=>{
    const layout=defaultReportLayout().map((x,i)=>({...x,emphasizeProgress:i===0}));
    const saved=validateReportLayout(layout);
    expect(saved.map(x=>x.emphasizeProgress)).toEqual([true,false,false,false,false]);
    expect(saved.map(x=>x.columnOrder)).toEqual(layout.map(x=>x.columnOrder));
  });
  it('calculates per-leader and overall completion from only the final configured status',()=>{
    const rows=createDemoItems(5).map((item,i)=>({...item,documentKind:'NQ' as const,
      isDropped:false,archivedAt:null,vpLeader:i<4?'Lãnh đạo A':'Lãnh đạo B',
      progressCouncil:['Hoàn thành','Sở chưa trình','VP đang thực hiện','Đang chờ tổng hợp','Hoàn thành'][i]}));
    const config=DEFAULT_REPORTS[3];
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
    expect(reports).toHaveLength(5);
    for(const config of reports){
      const tree=ReportTable({items:createDemoItems(2),config,group:'vpLeader',groupOrder:[],onSelect:()=>{}});
      expect(tree.props.className).toContain('report-style-compact');
      expect(tree.props.style['--table-font-family']).toContain('system-ui');
    }
    expect(seed[0].tableFont).toBe('segoe');
    expect(()=>validateReportLayout(withReportVisuals(seed,{tableFont:'bad' as any}))).toThrow();
  });
  it('wires the ten-font menu, live size slider and five style radios to the same save draft',()=>{
    const draft=defaultReportLayout(),onChange=vi.fn();
    const tree=ReportLayoutPanel({draft,onChange,items:createDemoItems(1),
      group:'vpLeader',groupOrder:[],sourceLabel:'Google Sheets'});
    const all=(node:any):any[]=>Array.isArray(node)?node.flatMap(all):
      node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
    const font=all(tree).find(n=>n.type==='select'&&n.props.id==='report-font-family');
    expect(all(font).filter(n=>n.type==='option')).toHaveLength(10);
    font.props.onChange({currentTarget:{value:'plex'}});
    expect(getReportFont(onChange.mock.lastCall![0])).toBe('plex');
    const slider=all(tree).find(n=>n.type==='input'&&n.props.id==='report-font-size');
    expect(slider.props.min).toBe(11);
    expect(slider.props.max).toBe(20);
    slider.props.onChange({currentTarget:{value:'18'}});
    expect(getReportFontSize(onChange.mock.lastCall![0])).toBe(18);
    const radios=all(tree).filter(n=>n.type==='input'&&n.props.name==='report-visual-variant');
    expect(radios).toHaveLength(5);
    radios[4].props.onChange();
    expect(getReportVariant(onChange.mock.lastCall![0])).toBe('band');
  });
  it('provides exactly ten safe font selections with independent font sizing',()=>{
    expect(TABLE_FONT_OPTIONS).toHaveLength(10);
    expect(new Set(TABLE_FONT_OPTIONS.map(option=>option.value)).size).toBe(10);
    const layout=defaultReportLayout();
    expect(getReportFontSize(layout)).toBe(13);
    for(const size of [11,13,16,20]){
      const saved=validateReportLayout(withReportVisuals(layout,{tableFont:'notoSans',tableFontSize:size}));
      expect(getReportFont(saved)).toBe('notoSans');
      expect(getReportFontSize(saved)).toBe(size);
      const reports=configuredReports(saved);
      expect(reports.every(report=>report.tableFontSize===size)).toBe(true);
      expect(ReportTable({items:[],config:reports[0],group:'vpLeader',
        groupOrder:[],onSelect:()=>{}}).props.style['--table-font-size']).toBe(size+'px');
    }
    for(const value of [9,10,21,99,12.5,Number.NaN]){
      expect(()=>validateReportLayout(withReportVisuals(layout,{tableFontSize:value}))).toThrow();
    }
  });
  it('uses five coloring techniques without changing table structure or counts',()=>{
    const original=defaultReportLayout();
    expect(REPORT_VARIANTS.map(option=>option.value)).toEqual(['classic','signal','compact','bars','band']);
    const flatten=(node:any):any[]=>Array.isArray(node)?node.flatMap(flatten):
      node&&typeof node==='object'?[node,...flatten(node.props?.children)]:[];
    const schemas=REPORT_VARIANTS.map(option=>{
      const layout=validateReportLayout(withReportVisuals(original,{reportVariant:option.value}));
      const report=configuredReports(layout)[1];
      const tree=ReportTable({items:createDemoItems(5),config:report,group:'vpLeader',groupOrder:[],onSelect:()=>{}});
      expect(tree.props.className).toContain('report-style-'+option.value);
      const table=flatten(tree).find(node=>node.type==='table'&&node.props.className==='data-table report-table');
      const header=flatten(table).filter(node=>node.type==='th').length;
      const cells=flatten(table).filter(node=>node.type==='td').length;
      return {header,cells,minWidth:table.props.style.minWidth,font:tree.props.style['--table-font-size']};
    });
    expect(schemas[1]).toEqual(schemas[0]);
    expect(schemas[2]).toEqual(schemas[0]);
    expect(schemas[3]).toEqual(schemas[0]);
    expect(schemas[4]).toEqual(schemas[0]);
  });
  it('draws bars relative to the maximum count IN THE SAME status column, not the completion percent',()=>{
    const items=createDemoItems(4).map((item,i)=>({...item,documentKind:'NQ' as const,
      isDropped:false,archivedAt:null,vpLeader:i===0?'A':'B',
      progressCouncil:'Sở chưa trình'}));
    const config={...DEFAULT_REPORTS[2],reportVariant:'bars' as const};
    const tree=ReportTable({items,config,group:'vpLeader',groupOrder:[],onSelect:()=>{}});
    const all=(node:any):any[]=>Array.isArray(node)?node.flatMap(all):
      node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
    const body=all(tree).find(node=>node.type==='tbody');
    const rows=all(body).filter(node=>node.type==='tr');
    const widths=rows.map(row=>all(row).find(node=>node.type==='td'&&
      node.props.className?.includes('report-stage-source'))?.props.style?.['--bar-fill']);
    expect(widths).toEqual(['33%','100%']);
    expect(all(body).filter(node=>node.type==='td'&&
      node.props.className?.includes('report-stage-office')).every(node=>node.props.style===undefined)).toBe(true);
    expect(aggregateReport(items,config,'vpLeader').percent).toBe(0);
  });
  it('marks body AND footer with the same semantic class as header',()=>{
    const cfg={...DEFAULT_REPORTS[2],emphasizeProgress:true};
    const root=ReportTable({items:createDemoItems(6),config:cfg,group:'vpLeader',
      groupOrder:[],onSelect:()=>{}});
    const all=(node:any):any[]=>Array.isArray(node)?node.flatMap(all):
      node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
    const table=all(root).find(n=>n.type==='table'&&n.props.className==='data-table report-table');
    const head=all(table).find(n=>n.type==='thead');
    const body=all(table).find(n=>n.type==='tbody');
    const foot=all(table).find(n=>n.type==='tfoot');
    for(const stage of ['source','office','next','completed']){
      const key='report-stage-'+stage;
      if(!all(head).some(n=>n.props.className?.includes(key)))continue;
      expect(all(body).some(n=>n.type==='td'&&n.props.className?.includes(key))).toBe(true);
      expect(all(foot).some(n=>n.type==='td'&&n.props.className?.includes(key))).toBe(true);
    }
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
  it('puts Tổng số nội dung between the grouping column and Sở chưa trình in every report',()=>{
    const all=(node:any):any[]=>Array.isArray(node)?node.flatMap(all):
      node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
    for(const config of DEFAULT_REPORTS){
      const root=ReportTable({items:createDemoItems(8),config,group:'vpLeader',groupOrder:[],onSelect:()=>{}});
      const table=all(root).find(n=>n.type==='table'&&n.props.className==='data-table report-table');
      const header=all(table).find(n=>n.type==='thead');
      const ths=all(header).filter(n=>n.type==='th');
      expect(ths[0].props.children).toBe('Lãnh đạo VP');
      expect(ths[1].props.children).toBe('Tổng số nội dung');
      expect(ths[2].props.className).toContain(config.id==='build'?'report-stage-excluded':'report-stage-source');
      const group=all(table).find(n=>n.type==='colgroup');
      expect(all(group).filter(n=>n.type==='col').slice(0,2).map(n=>n.props.className))
        .toEqual(['report-group-col','report-total-width']);
      const body=all(table).find(n=>n.type==='tbody');
      for(const tr of all(body).filter(n=>n.type==='tr')){
        const cells=all(tr).filter(n=>n.type==='td');
        if(cells.length===1)continue;
        expect(cells[0].props.className).toContain('report-total-col');
        expect(cells[1].props.className).toContain(config.id==='build'?'report-stage-excluded':'report-stage-source');
      }
      const foot=all(table).find(n=>n.type==='tfoot');
      expect(all(foot).filter(n=>n.type==='td')[0].props.className).toContain('report-total-col');
    }
  });
  it('matches latest Excel Party milestone spelling, with TBKL as the sole completed state',()=>{
    expect(DEFAULT_REPORTS[0].columns).toContain('ĐU đã gửi TU, chưa họp');
    expect(DEFAULT_REPORTS[0].columns).not.toContain('Đã họp, chưa có TBKL');
    expect(DEFAULT_REPORTS[0].columns).toContain('Đã họp/xin phiếu, chưa có TBKL');
    expect(DEFAULT_REPORTS[0].columns).toContain('Đã có TBKL');
    expect(DEFAULT_REPORTS[0].columns).not.toContain('Đã báo cáo TU');
    expect(DEFAULT_REPORTS[0].completed).toEqual(['Đã có TBKL']);
    const base=createDemoItems(5).map(item=>({...item,partyLevel:'BTV TU',
      progressParty:'Sở chưa trình',isDropped:false,archivedAt:null}));
    base[0].progressParty='TU đã cho ý kiến';
    base[1].progressParty='Đã báo cáo TU'; // legacy value, still counted as completed
    base[2].progressParty='ĐU đã gửi TU chưa họp'; // legacy missing comma
    base[3].progressParty='Đã có TBKL';
    base[4].progressParty='Đã họp, chưa có TBKL'; // legacy comma spelling
    const report=aggregateReport(base,DEFAULT_REPORTS[0],'room');
    expect(report.total).toBe(5);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(20);
    expect(report.unknown).toEqual(['TU đã cho ý kiến','Đã báo cáo TU']);
    const statuses=[...report.rows.values()].flatMap(cells=>[...cells.keys()]);
    expect(statuses).toContain('Đã có TBKL');
    expect(statuses).not.toContain('TU đã cho ý kiến');
    expect(statuses).toContain('ĐU đã gửi TU, chưa họp');
    expect(statuses).toContain('Đã họp/xin phiếu, chưa có TBKL');
    expect(statuses).not.toContain('Đã họp, chưa có TBKL');
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
    const config = { ...DEFAULT_REPORTS[3], hiddenColumns: ['Đã trình HĐND thành phố'] };
    const report = aggregateReport(items, config, 'department');
    expect(report.total).toBe(3);
    expect(report.percent).toBe(33);
    expect(report.hiddenCount).toBe(1);
    expect(report.columns).not.toContain('Đã trình HĐND thành phố');
    expect(report.unknown).toEqual(['Trạng thái mới']);
    expect([...report.rows.values()].flatMap(cells => [...cells.values()].flat()).length).toBe(3);
    expect(getKpis(items).completed).toBe(report.completedCount);
  });
  it('loại BC rõ ràng bất kể mã có tiền tố NQ; nhóm __proto__ an toàn', () => {
    const item = { ...createDemoItems(1)[0], displayCode: 'NQ-0001', documentKind: 'BC' as const, department: '__proto__' };
    expect(aggregateReport([item], DEFAULT_REPORTS[3], 'department').total).toBe(0);
    expect(aggregateReport([item], DEFAULT_REPORTS[4], 'department').rows.has('__proto__')).toBe(true);
  });
});

