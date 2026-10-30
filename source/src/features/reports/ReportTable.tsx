import { memo, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { ColumnResizeHandle } from '../../components/ColumnResizeHandle';
import {mountSharedReportTooltip} from '../../components/SharedReportTooltip';
import type { GroupField, Item, ReportConfig } from '../../../shared/types';
import {GROUP_OPTIONS} from '../../../shared/field-definitions';
import { aggregateReport, normalizeReportStatus } from '../../domain/reporting';
import { compareCatalogValues } from '../../domain/catalog-order';
import { reportStage,reportStageLabels,type ReportStage } from '../../domain/report-workflow';
import {tableFontStack} from '../../data/report-preferences';
import {normalizeSearch} from '../../domain/search';
import {canonicalStatus} from '../../domain/status-contract';

/** Report-specific chip wording. These are presentation labels, NEVER Item
 * statuses or a migration of legacy source cells. Custom report titles stay intact. */
function stageLabel(config:ReportConfig,stage:ReportStage):string {
  switch(stage){
    case 'source':return 'Sở chưa trình';
    case 'office':return 'VP đang xử lý';
    case 'next':
      return config.id==='party'?'Bước tiếp theo':
        config.id==='build'?'Đã trình, chờ QĐ':'Trạng thái tiếp theo';
    case 'completed':
      return config.id==='party'?'Đã có TBKL':
        config.id==='build'?'Đã có QĐ':
        ['council','nq','bc'].includes(config.id)?'Hoàn thành':
          config.completed[0]??reportStageLabels.completed;
    default:return reportStageLabels[stage];
  }
}
/** Muted report cells: ONLY intermediate Party/Build steps and applicable
 * exclusions. Read aliases are normalized field-by-field; final states stay bold. */
const quietPartyMilestones=new Set([
  'Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL',
].map(normalizeSearch));
const quietBuildMilestone=normalizeSearch('Đã trình, chờ QĐ');
const excludedMilestone=normalizeSearch('Không phải trình');

export function ReportTable({ items, config, group, onSelect, sourceLabel = 'Dữ liệu mẫu', preview = false, groupOrder = [], onColumnResize }: { items: Item[]; config: ReportConfig; group: GroupField; onSelect: (title: string, items: Item[]) => void; sourceLabel?: string; preview?: boolean; groupOrder?:string[]; onColumnResize?:(column:string,width:number)=>void }) {
  const heading=()=>{
    const target=config.titleAccentText?.trim();
    if(!target)return config.title;
    const source=config.title, folded=source.toLocaleLowerCase('vi'),needle=target.toLocaleLowerCase('vi');
    const parts:React.ReactNode[]=[];
    let offset=0, found=folded.indexOf(needle);
    if(found<0)return source;
    while(found>=0){
      if(found>offset)parts.push(source.slice(offset,found));
      parts.push(<span key={found} className="report-title-accent"
        style={{color:config.titleAccentColor??'#b42318'}}>{source.slice(found,found+target.length)}</span>);
      offset=found+target.length;
      found=folded.indexOf(needle,offset);
    }
    if(offset<source.length)parts.push(source.slice(offset));
    return parts;
  };
  const report = useMemo(() => aggregateReport(items, config, group), [items, config, group]);
  const groupLabel=GROUP_OPTIONS.find(option=>option.key===group)?.label??'Nhóm phụ trách';
  const ref = useRef<HTMLElement>(null);
  // One tooltip instance serves all mounted reports, not one per cell.
  useEffect(()=>preview?undefined:mountSharedReportTooltip(),[preview]);
  const status=(item:Item)=>normalizeReportStatus(item[config.statusField],config);
  // Single grouped source of truth for the displayed counts AND their drilldown records.
  // This respects reportItems scope, including the saved "Không phải trình" option.
  const stageItems=useMemo(()=>{
    const groups:Record<ReportStage,Item[]>={source:[],office:[],next:[],completed:[],withdrawn:[],excluded:[],other:[]};
    for(const item of report.items)groups[reportStage(status(item),config)].push(item);
    return groups;
  },[report.items,config]);
  const shownRows=[...report.rows.entries()].sort(([a],[b])=>compareCatalogValues(a,b,groupOrder));
  const emphasize=config.emphasizeProgress!==false;
  const hasNextStage=config.columns.some(column=>reportStage(column,config)==='next');
  const visualStyle=config.reportVariant??'classic';
  // Bar lengths compare counts between groups in the SAME status column, never completion rates.
  const maxByColumn=new Map(report.columns.map(column=>[column,
    Math.max(1,...[...report.rows.values()].map(cells=>cells.get(column)?.length??0))]));
  const completedSet=new Set(config.completed.map(normalizeSearch));
  const isComplete=(status:string)=>completedSet.has(normalizeSearch(status));
  const rowMetrics=(cells:Map<string,Item[]>)=>{
    const total=[...cells.values()].reduce((sum,rows)=>sum+rows.length,0);
    const completed=[...cells.entries()].reduce((sum,[status,rows])=>sum+(isComplete(status)?rows.length:0),0);
    return {total,completed,percent:total?Math.round(completed/total*100):0};
  };
  const emphasis=(status:string)=>{
    if(!emphasize)return '';
    const canonical=normalizeSearch(canonicalStatus(config.statusField,status));
    const quiet=(config.id==='party'&&quietPartyMilestones.has(canonical))||
      (config.id==='build'&&canonical===quietBuildMilestone)||
      (['party','build'].includes(config.id)&&canonical===excludedMilestone);
    return ' report-stage-'+reportStage(status,config)+(quiet?' report-stage-intermediate':'');
  };
  const widths=config.columnWidths??{};
  const columnWidth=(key:string,fallback:number)=>Math.min(1200,Math.max(80,widths[key]??fallback));
  const allColumnWidths=[columnWidth('__group',230),columnWidth('__total',146),
    ...report.columns.map(column=>columnWidth(column,150)),columnWidth('__percent',150)];
  const gridWidth=allColumnWidths.reduce((sum,width)=>sum+width,0);
  const grip=(key:string,index:number,label:string)=>(onColumnResize
    ?<ColumnResizeHandle columnIndex={index} width={allColumnWidths[index]} label={label}
      onCommit={width=>onColumnResize(key,width)}/>:null);
  // Keep a real button for keyboard/screen readers. CSS expands it over the
  // entire containing td; the invisible spacer preserves the row's dimensions.
  const clickable=(entries:Item[])=>!preview&&entries.length>0?' report-clickable-cell':'';
  const drill=(title:string,entries:Item[])=>(preview||entries.length===0
    ?<strong>{entries.length}</strong>
    :<><span className="report-cell-sizer" aria-hidden="true">{entries.length}</span><button type="button" className="count-button count-drill"
      aria-label={`${title}, ${entries.length} nội dung. Bấm để xem chi tiết`}
      onClick={()=>onSelect(title,entries)}>
      <span>{entries.length}</span>
    </button></>);
  const percentCell=(percent:number,description:string)=><div className="report-percent-value">
    <strong>{percent}%</strong>
    <progress aria-label={description} value={percent} max={100}/>
  </div>;
  const print = () => {
    if (!ref.current) return;
    const element = document.createElement('section');
    element.id = 'print-target';
    element.className = ref.current.className;
    element.style.cssText = ref.current.style.cssText;
    element.innerHTML = ref.current.innerHTML;
    element.querySelectorAll('button').forEach(button => button.replaceWith(document.createTextNode(
      button.classList.contains('count-drill') ? (button.querySelector('span')?.textContent ?? '') : (button.textContent ?? '')
    )));
    const note = document.createElement('p');
    note.textContent = `${sourceLabel} · In lúc ${new Date().toLocaleString('vi-VN')} · Tổng ${report.total}`;
    element.prepend(note);
    document.body.append(element);
    document.body.classList.add('is-printing');
    try { window.print(); } finally { document.body.classList.remove('is-printing'); element.remove(); }
  };
  return <section className={'card report-surface report-style-'+visualStyle} ref={ref}
    style={{'--table-font-family':tableFontStack(config.tableFont??'segoe'),
      '--table-font-size':`${config.tableFontSize??13}px`} as CSSProperties}>
    <div className="card-header"><div><h3>{heading()} <span className="report-heading-count">({report.total} nội dung)</span></h3></div>{!preview && <button className="button ghost" onClick={print}>In / PDF</button>}</div>
    {report.unknown.length > 0 && <p className="unknown-note">Trạng thái nguồn chưa chuẩn hóa: {report.unknown.join(', ')}. {'Các nội dung được gom tại cột Chưa chuẩn hóa, vẫn tính vào tổng nhưng không tự tính hoàn thành.'}</p>}
    {report.hiddenCount > 0 && <p className="unknown-note">Có {report.hiddenCount} nội dung thuộc cột ẩn; tổng và tỷ lệ vẫn tính đầy đủ.</p>}
    <div className="report-flow-tools">
      <div className="report-flow-summary" aria-label="Số nội dung theo giai đoạn">
        {(['source','office','next','completed'] as const).filter(stage=>stage!=='next'||hasNextStage).map(stage=>{
          const entries=stageItems[stage];
          const className='report-stage-summary'+(emphasize?' report-stage-'+stage:'');
          const label=stageLabel(config,stage);
          const detailTitle=`${config.title} · ${label}`;
          const contents=<><span>{label}</span><strong>{entries.length}</strong></>;
          return preview
            ?<span key={stage} className={className}>{contents}</span>
            :<button type="button" key={stage} className={className}
              disabled={entries.length===0}
              aria-label={`${detailTitle}: ${entries.length} nội dung. Bấm để xem chi tiết`}
              onClick={()=>onSelect(detailTitle,entries)}>
              {contents}
            </button>;
        })}
      </div>

    </div>
    <div className="table-wrap"><table className="data-table report-table"
      style={{minWidth:`${gridWidth}px`,width:`${gridWidth}px`}}>
      <colgroup>
        <col className="report-group-col" style={{width:`${allColumnWidths[0]}px`}}/>
        <col className="report-total-width" style={{width:`${allColumnWidths[1]}px`}}/>
        {report.columns.map((col,index)=><col key={col} style={{width:`${allColumnWidths[index+2]}px`}}/>)}
        <col className="report-percent-width" style={{width:`${allColumnWidths[allColumnWidths.length-1]}px`}}/>
      </colgroup>
      <thead><tr>
        <th scope="col" className="report-group-heading report-resizable-heading">{onColumnResize?<>{groupLabel}{grip('__group',0,groupLabel)}</>:groupLabel}</th>
        <th scope="col" className="report-number-header report-total-col report-resizable-heading">{onColumnResize?<>Tổng số nội dung{grip('__total',1,'Tổng số nội dung')}</>:'Tổng số nội dung'}</th>
        {report.columns.map((column,index)=><th key={column} scope="col"
          className={'report-number-header report-resizable-heading'+emphasis(column)}>{onColumnResize?<><span className="report-heading-label">{column}</span>{grip(column,index+2,column)}</>:<span className="report-heading-label">{column}</span>}</th>)}
        <th scope="col" className="report-number-header report-percent-col report-resizable-heading">{onColumnResize?<>% hoàn thành{grip('__percent',allColumnWidths.length-1,'% hoàn thành')}</>:'% hoàn thành'}</th>
      </tr></thead>
      <tbody>
        {shownRows.map(([label,cells])=>{
          const metrics=rowMetrics(cells);
          const groupEntries=[...cells.values()].flat();
          return <tr key={label}><th scope="row" className="report-group-heading">{label}</th>
            <td className={'report-number report-total-col'+clickable(groupEntries)}>{drill(`${label} · Tổng số nội dung`,groupEntries)}</td>
            {report.columns.map(column=>{
              const entries=cells.get(column)??[];
              return <td key={column} className={'report-number'+emphasis(column)+clickable(entries)}
                style={entries.length&&emphasize&&visualStyle==='bars'
                  ?{'--bar-fill':`${Math.max(1,Math.round(entries.length/(maxByColumn.get(column)??1)*100))}%`} as CSSProperties:undefined}>
                {entries.length?<span className="report-count-mark">
                  {drill(`${label} · ${column}`,entries)}
                </span>:'—'}
              </td>;
            })}
            <td className="report-number report-percent-col">
              {percentCell(metrics.percent,`${label}: đã hoàn thành ${metrics.completed} trên ${metrics.total} nội dung`)}
            </td>
          </tr>;
        })}
        {!shownRows.length&&<tr><td className="empty" colSpan={report.columns.length+3}>
          {report.total?'Không có đơn vị thuộc nhóm đang theo dõi.':'Không có nội dung trong phạm vi này.'}
        </td></tr>}
      </tbody>
      <tfoot><tr>
        <th scope="row">Tổng cộng</th>
        <td className={'report-number report-total-col'+clickable(report.items)}>{drill('Tổng cộng · Tất cả nội dung',report.items)}</td>
        {report.columns.map(column=>{
          const entries=[...report.rows.values()].flatMap(cells=>cells.get(column)??[]);
          return <td className={'report-number'+emphasis(column)+clickable(entries)} key={column}>
            {drill(`Tổng cộng · ${column}`,entries)}
          </td>;
        })}
        <td className="report-number report-percent-col">
          {percentCell(report.percent??0,`Toàn báo cáo: đã hoàn thành ${report.completedCount} trên ${report.total} nội dung`)}
        </td>
      </tr></tfoot>
    </table></div>
  </section>;
}

/** Stable callbacks plus memo avoid rerendering reports behind a detail dialog. */
export const MemoReportTable=memo(ReportTable);
