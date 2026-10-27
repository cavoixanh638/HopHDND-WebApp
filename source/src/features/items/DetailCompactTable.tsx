import type {Item} from '../../../shared/types';
import {displayId} from '../../domain/display-id';
import {abbreviateVietnameseName,abbreviateLeaderName,compactTypeTone} from './compact-columns';
import {normalizeReportStatus,DEFAULT_REPORTS} from '../../domain/reporting';

const conf=(id:string)=>DEFAULT_REPORTS.find(c=>c.id===id)!;
function shorten(value:string){return abbreviateLeaderName(value)||'—';}
export function DetailCompactTable({items,onHistory}:{items:Item[];onHistory?:(item:Item,field:'specificProgress'|'note')=>void}){
 return <div className="detail-compact-wrap" role="region" aria-label="Danh sách chi tiết bố cục gọn" tabIndex={0}>
 <table className="detail-compact-table"><colgroup><col style={{width:82}}/><col style={{width:420}}/><col style={{width:250}}/><col style={{width:330}}/><col style={{width:310}}/><col style={{width:270}}/></colgroup>
 <thead>
 <tr className="detail-cluster-row"><th colSpan={2}>CỤM 01 · ĐỊNH DANH &amp; HỒ SƠ</th><th>CỤM 02 · TRÁCH NHIỆM</th><th>CỤM 03 · CHUỖI TIẾN ĐỘ 3 KHÂU</th><th colSpan={2}>CỤM 04 · THEO DÕI &amp; CHỈ ĐẠO</th></tr>
 <tr><th>MÃ</th><th>TÊN TỜ TRÌNH &amp; ĐƠN VỊ CHỦ TRÌ</th><th>LÃNH ĐẠO &amp; CHUYÊN VIÊN</th><th>THÀNH ỦY → XÂY DỰNG NQ → BAN HÀNH NQ</th><th>TIẾN ĐỘ HIỆN TẠI</th><th>GHI CHÚ</th></tr>
 </thead><tbody>{items.map(item=><tr key={item.recordId}>
  <td className="detail-code">{displayId(item)}</td>
  <td><div className="detail-document-meta"><span className="detail-document-badge" data-kind={compactTypeTone(item.type)}>{item.type||'—'}</span><strong>{item.department||'Chưa phân công'}</strong></div><div className="detail-content">{item.content||'—'}</div></td>
  <td><div className="detail-person"><b>UBND</b> <span title={item.ubndLeader}>{shorten(item.ubndLeader)}</span></div><div className="detail-person"><b>LĐVP</b> <span title={item.vpLeader}>{shorten(item.vpLeader)}</span></div><div className="detail-person"><b>CV</b> <span title={item.specialist}>{abbreviateVietnameseName(item.specialist)||'—'}{item.room?' ('+item.room+')':''}</span></div></td>
  <td><div className="detail-stage"><strong>1 Thành ủy{item.partyLevel?' ('+item.partyLevel+')':''}</strong><span>{normalizeReportStatus(item.progressParty,conf('party'))}</span></div><div className="detail-stage"><strong>2 Xây dựng NQ</strong><span>{normalizeReportStatus(item.progressBuild,conf('build'))}</span></div><div className="detail-stage"><strong>3 Ban hành NQ</strong><span>{normalizeReportStatus(item.progressCouncil,conf('council'))}</span></div></td>
  <td className="detail-long-text">{item.specificProgress||'—'}{onHistory&&<button className="detail-history" aria-label={'Xem lịch sử tiến độ hiện tại '+displayId(item)} onClick={()=>onHistory(item,'specificProgress')}>↺</button>}</td>
  <td className="detail-long-text">{item.note||'—'}{onHistory&&<button className="detail-history" aria-label={'Xem lịch sử ghi chú '+displayId(item)} onClick={()=>onHistory(item,'note')}>↺</button>}</td>
 </tr>)}</tbody></table>
 </div>;
}
