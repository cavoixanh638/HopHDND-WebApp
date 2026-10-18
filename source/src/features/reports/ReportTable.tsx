import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GroupField, Item, ReportConfig } from '../../../shared/types';
import {GROUP_OPTIONS} from '../../../shared/field-definitions';
import { aggregateReport, normalizeReportStatus } from '../../domain/reporting';
import { compareCatalogValues } from '../../domain/catalog-order';
import { reportStage,reportStageLabels,type ReportStage } from '../../domain/report-workflow';
import {tableFontStack} from '../../data/report-preferences';
import {normalizeSearch} from '../../domain/search';

export function ReportTable({ items, config, group, onSelect, sourceLabel = 'Dữ liệu mẫu', preview = false, groupOrder = [] }: { items: Item[]; config: ReportConfig; group: GroupField; onSelect: (title: string, items: Item[]) => void; sourceLabel?: string; preview?: boolean; groupOrder?:string[] }) {
  const report = useMemo(() => aggregateReport(items, config, group), [items, config, group]);
  const groupLabel=GROUP_OPTIONS.find(option=>option.key===group)?.label??'Nhóm phụ trách';
  const ref = useRef<HTMLElement>(null);
  const [focusWaiting,setFocusWaiting]=useState(false);
  const status=(item:Item)=>normalizeReportStatus(item[config.statusField],config);
  const stages=useMemo(()=>{
    const counts:Record<ReportStage,number>={source:0,office:0,next:0,completed:0,withdrawn:0,other:0};
    for(const item of report.items)counts[reportStage(status(item),config)]++;
    return counts;
  },[report.items,config]);
  const pendingTotal=stages.source+stages.office;
  const shownRows=[...report.rows.entries()].sort(([a],[b])=>compareCatalogValues(a,b,groupOrder))
    .filter(([,cells])=>!focusWaiting||[...cells.entries()].some(([status,entries])=>
      entries.length>0&&(['source','office'] as ReportStage[]).includes(reportStage(status,config))));
  const emphasize=config.emphasizeProgress!==false;
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
  const emphasis=(status:string)=>emphasize?' report-stage-'+reportStage(status,config):'';
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
    element.querySelectorAll('button').forEach(button => button.replaceWith(document.createTextNode(button.textContent ?? '')));
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
    <div className="card-header"><div><p className="report-section-kicker">{config.id==='party'?'XIN Ý KIẾN THÀNH ỦY':config.id==='nq'?'TRÌNH NGHỊ QUYẾT':config.id==='bc'?'TRÌNH BÁO CÁO':'TỔNG HỢP TIẾN ĐỘ'}</p><h3>{config.title}</h3><p className="muted">{report.total} nội dung · Xác nhận hoàn thành: {report.percent === null ? '—' : `${report.percent}%`}</p></div>{!preview && <button className="button ghost" onClick={print}>In / PDF</button>}</div>
    {report.unknown.length > 0 && <p className="unknown-note">Chưa chuẩn hóa: {report.unknown.join(', ')}. Các nội dung này vẫn được tính trong tổng.</p>}
    {report.hiddenCount > 0 && <p className="unknown-note">Có {report.hiddenCount} nội dung thuộc cột ẩn; tổng và tỷ lệ vẫn tính đầy đủ.</p>}
    <div className="report-flow-tools">
      <div className="report-flow-summary" aria-label="Số nội dung theo giai đoạn">
        {(['source','office','next','completed'] as const).map(stage=><span key={stage}
          className={'report-stage-summary'+(emphasize?' report-stage-'+stage:'')}>
          <span>{reportStageLabels[stage]}</span><strong>{stages[stage]}</strong>
        </span>)}
      </div>
      {!preview&&<button type="button" className="button ghost report-focus-button"
        aria-pressed={focusWaiting} disabled={!pendingTotal}
        onClick={()=>setFocusWaiting(value=>!value)}>
        {focusWaiting?'Xem toàn bộ đơn vị':'Chỉ xem đơn vị còn ở Sở/VP'}
      </button>}
    </div>
    <p className="report-flow-note">Màu sắc là gợi ý mức độ ưu tiên theo từng bước xử lý, không khẳng định hồ sơ quá hạn. Chỉ trạng thái hoàn thành cuối cùng mới tính tỷ lệ hoàn thành.
      {stages.withdrawn>0?' Đề nghị rút: '+stages.withdrawn+'.':''}
      {stages.other>0?' Trạng thái chưa khớp: '+stages.other+'.':''}
    </p>
    <div className="table-wrap"><table className="data-table report-table"
      style={{minWidth:`${230+(report.columns.length+2)*150}px`}}>
      <colgroup>
        <col className="report-group-col"/>
        <col className="report-total-width"/>
        {report.columns.map(col=><col key={col}/>)}
        <col className="report-percent-width"/>
      </colgroup>
      <thead><tr>
        <th scope="col" className="report-group-heading">{groupLabel}</th>
        <th scope="col" className="report-number-header report-total-col">Tổng số nội dung</th>
        {report.columns.map(column=><th key={column} scope="col"
          className={'report-number-header'+emphasis(column)}><span className="report-heading-label">{column}</span></th>)}
        <th scope="col" className="report-number-header report-percent-col">% hoàn thành</th>
      </tr></thead>
      <tbody>
        {shownRows.map(([label,cells])=>{
          const metrics=rowMetrics(cells);
          return <tr key={label}><th scope="row" className="report-group-heading">{label}</th>
            <td className="report-number report-total-col"><strong>{metrics.total}</strong></td>
            {report.columns.map(column=>{
              const entries=cells.get(column)??[];
              return <td key={column} className={'report-number'+emphasis(column)}
                style={entries.length&&emphasize&&visualStyle==='bars'
                  ?{'--bar-fill':`${Math.max(1,Math.round(entries.length/(maxByColumn.get(column)??1)*100))}%`} as CSSProperties:undefined}>
                {entries.length?<span className="report-count-mark">
                  {preview?<strong>{entries.length}</strong>:
                    <button className="count-button" aria-label={`${label}: ${column}, ${entries.length} nội dung`}
                      onClick={()=>onSelect(`${label} · ${column}`,entries)}>{entries.length}</button>}
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
        <th scope="row">{focusWaiting?'Tổng toàn bảng':'Tổng cộng'}</th>
        <td className="report-number report-total-col">{report.total}</td>
        {report.columns.map(column=><td className={'report-number'+emphasis(column)} key={column}>
          {[...report.rows.values()].reduce((sum,cells)=>sum+(cells.get(column)?.length??0),0)}
        </td>)}
        <td className="report-number report-percent-col">
          {percentCell(report.percent??0,`Toàn báo cáo: đã hoàn thành ${report.completedCount} trên ${report.total} nội dung`)}
        </td>
      </tr></tfoot>
    </table></div>
  </section>;
}
