import type {Item} from '../../../shared/types';
import type {ReportConfig} from '../../../shared/types';
import {DEFAULT_REPORTS,aggregateReport,normalizeReportStatus} from '../../domain/reporting';
import {reportStage} from '../../domain/report-workflow';
import './detail-dashboard.css';

type Group={label:string;color:string;background:string;matches:(status:string)=>boolean};
const red='#dc2626',amber='#d97706',muted='#cbd5e1',green='#16a34a';
const groups=(config:ReportConfig):Group[]=>{
 const primary:Group[]=[
  {label:'Sở chưa trình',color:red,background:'#fef2f2',matches:s=>reportStage(s,config)==='source'},
  {label:'VP đang thực hiện',color:amber,background:'#fef3c7',matches:s=>reportStage(s,config)==='office'},
 ];
 if(config.id==='party')primary.push({label:'Bước tiếp theo',color:muted,background:'#f1f5f9',matches:s=>reportStage(s,config)==='next'});
 if(config.id==='build')primary.push({label:'Đã trình, chưa có QĐ',color:muted,background:'#f1f5f9',matches:s=>s==='Đã trình HĐND, chưa có QĐ'});
 primary.push({label:config.id==='party'?'Đã có TBKL':config.id==='build'?'Đã có QĐ chấp thuận':'Đã trình HĐND TP',color:green,background:'#dcfce7',matches:s=>reportStage(s,config)==='completed'});
 return primary;
};
export function DetailDashboard({items,onSelect}:{items:Item[];onSelect?:(title:string,rows:Item[])=>void}){
 const ids=['party','build','council'];
 const names=['Tiến độ xin ý kiến Thành ủy','Tiến độ trình xây dựng NQ','Tiến độ trình ban hành NQ'];
 return <div className="detail-dashboard" aria-label="Báo cáo tiến độ phía trên Danh sách chi tiết">
 {ids.map((id,index)=>{
  const config=DEFAULT_REPORTS.find(x=>x.id===id)!;
  const report=aggregateReport(items,config,'department');
  const slots=groups(config).map(group=>({
   ...group,rows:report.items.filter(item=>group.matches(normalizeReportStatus(item[config.statusField],config)))
  }));
  const total=report.total;
  const accounted=slots.reduce((n,x)=>n+x.rows.length,0);
  return <section className={'detail-dashboard-card detail-dashboard-card-'+id} key={id}>
   <div className="detail-dashboard-heading"><h3>{names[index]}</h3>
   <div className="detail-dashboard-percent"><strong>{report.percent??0}%</strong><small>{report.completedCount}/{total} hoàn thành</small></div></div>
   <div className="detail-dashboard-bar" role="img" aria-label={slots.map(s=>s.label+': '+s.rows.length).join('; ')}>
    {slots.map(s=><span key={s.label} style={{background:s.color,flexGrow:s.rows.length,flexBasis:s.rows.length?'0':'0',display:s.rows.length?'block':'none'}} title={s.label+': '+s.rows.length}/>)}
   </div>
   <div className="detail-dashboard-states" style={{gridTemplateColumns:`repeat(${slots.length},minmax(0,1fr))`}}>
    {slots.map(s=><button key={s.label} type="button" className="detail-dashboard-state" style={{background:s.background,borderColor:s.color}} disabled={!s.rows.length||!onSelect} onClick={()=>onSelect?.(names[index]+' · '+s.label,s.rows)}>
     <span>{s.label}</span><strong>{s.rows.length}</strong></button>)}
   </div>
   {accounted!==total&&<small className="detail-dashboard-unmatched">Có {total-accounted} hồ sơ ngoài các nhóm hiển thị (trạng thái chưa chuẩn hóa hoặc khác).</small>}
  </section>;
 })}
 </div>;
}
