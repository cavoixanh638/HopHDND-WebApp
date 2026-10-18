import { useMemo, useRef, useState } from 'react';
import type { GroupField, Item, ReportConfig } from '../../../shared/types';
import {GROUP_OPTIONS} from '../../../shared/field-definitions';
import { aggregateReport } from '../../domain/reporting';
import { compareCatalogValues } from '../../domain/catalog-order';
import { reportStage,reportStageLabels,type ReportStage } from '../../domain/report-workflow';

export function ReportTable({ items, config, group, onSelect, sourceLabel = 'Dữ liệu mẫu', preview = false, groupOrder = [] }: { items: Item[]; config: ReportConfig; group: GroupField; onSelect: (title: string, items: Item[]) => void; sourceLabel?: string; preview?: boolean; groupOrder?:string[] }) {
  const report = useMemo(() => aggregateReport(items, config, group), [items, config, group]);
  const groupLabel=GROUP_OPTIONS.find(option=>option.key===group)?.label??'Nhóm phụ trách';
  const ref = useRef<HTMLElement>(null);
  const [focusWaiting,setFocusWaiting]=useState(false);
  const status=(item:Item)=>item[config.statusField].trim()||'Sở chưa trình';
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
  const print = () => {
    if (!ref.current) return;
    const element = document.createElement('section');
    element.id = 'print-target';
    element.innerHTML = ref.current.innerHTML;
    element.querySelectorAll('button').forEach(button => button.replaceWith(document.createTextNode(button.textContent ?? '')));
    const note = document.createElement('p');
    note.textContent = `${sourceLabel} · In lúc ${new Date().toLocaleString('vi-VN')} · Tổng ${report.total}`;
    element.prepend(note);
    document.body.append(element);
    document.body.classList.add('is-printing');
    try { window.print(); } finally { document.body.classList.remove('is-printing'); element.remove(); }
  };
  return <section className="card" ref={ref}>
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
    <p className="report-flow-note">Số liệu phân theo trạng thái hiện có; “Sở chưa trình” và “VP đang thực hiện” là nhóm cần theo dõi, không mặc định là quá hạn.
      {stages.withdrawn>0?' Đề nghị rút: '+stages.withdrawn+'.':''}
      {stages.other>0?' Trạng thái chưa khớp: '+stages.other+'.':''}
    </p>
    <div className="table-wrap"><table className="data-table report-table" style={{minWidth:`${230+(report.columns.length+1)*170}px`}}><colgroup><col className="report-group-col"/>{report.columns.map(col=><col key={col}/>)}<col/></colgroup><thead><tr><th scope="col">{groupLabel}</th>{report.columns.map(column => <th key={column} scope="col" className={'report-number-header'+(emphasize?' report-stage-'+reportStage(column,config):'')}>{column}</th>)}<th scope="col" className="report-number-header report-total-col">Tổng số</th></tr></thead><tbody>
      {shownRows.map(([label, cells]) => <tr key={label}><th>{label}</th>{report.columns.map(column => {
        const entries = cells.get(column) ?? [];
        return <td key={column} className={'report-number'+(emphasize?' report-stage-'+reportStage(column,config):'')}>{entries.length ? preview ? <strong>{entries.length}</strong> : <button className="count-button" aria-label={`${label}: ${column}, ${entries.length} nội dung`} onClick={() => onSelect(`${label} · ${column}`, entries)}>{entries.length}</button> : '—'}</td>;
      })}<td className="report-number report-total-col"><strong>{[...cells.values()].reduce((sum, rows) => sum + rows.length, 0)}</strong></td></tr>)}
      {!shownRows.length && <tr><td className="empty" colSpan={report.columns.length + 2}>{report.total?'Không có đơn vị thuộc nhóm đang theo dõi.':'Không có nội dung trong phạm vi này.'}</td></tr>}
    </tbody><tfoot><tr><th>{focusWaiting?'Tổng toàn bảng':'Tổng cộng'}</th>{report.columns.map(column => <td className="report-number" key={column}>{[...report.rows.values()].reduce((sum, cells) => sum + (cells.get(column)?.length ?? 0), 0)}</td>)}<td className="report-number report-total-col">{report.total}</td></tr></tfoot></table></div>
  </section>;
}
