import {useEffect,useState} from 'react';
import type {AuditEntry,Item} from '../../../shared/types';
import type {Repository} from '../../data/repository';
import {TEXT_FIELDS} from '../../../shared/field-definitions';
import {Modal} from '../../components/Modal';

export const HISTORY_FIELDS=new Set(['note','specificProgress']);
/** Field history ordered newest first; do not omit earlier actual revisions. */
export function historyForField(entries:AuditEntry[],field:string):AuditEntry[]{
  return entries.filter(entry=>Object.prototype.hasOwnProperty.call(entry.changes,field))
    .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
export function latestHistoryForField(entries:AuditEntry[],field:string):AuditEntry|undefined {
  return historyForField(entries,field)[0];
}
/** Illustrative display only; never insert these events into Firebase/Excel/audit. */
export const NOTE_HISTORY_DEMO=[
  {at:'2026-10-18T08:30:00+07:00',value:'Đã tiếp nhận, đề nghị đơn vị bổ sung hồ sơ.'},
  {at:'2026-10-20T10:15:00+07:00',value:'Đã nhận hồ sơ bổ sung, đang rà soát nội dung.'},
  {at:'2026-10-22T15:40:00+07:00',value:'Đã tổng hợp ý kiến, chuyển bước xử lý tiếp theo.'},
] as const;
const formatted=(at:string)=>new Date(at).toLocaleString('vi-VN');
export function HistoryDialog({item,field,repository,onClose}:{
  item:Item;field?:string;repository:Repository;onClose:()=>void;
}){
  const [entries,setEntries]=useState<AuditEntry[]|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    repository.history(item.recordId,item.displayCode)
      .then(value=>{if(!cancelled)setEntries(value);})
      .catch(()=>{if(!cancelled)setError('Không tải được lịch sử.');});
    return ()=>{cancelled=true;};
  },[item.recordId,item.displayCode,repository]);
  const selected=field&&HISTORY_FIELDS.has(field)?field:'note';
  const label=TEXT_FIELDS.find(row=>row.key===selected)?.label??selected;
  const shown=entries?historyForField(entries,selected):[];
  return <Modal title={`Lịch sử sửa đổi · ${label} · ${item.displayCode}`} onClose={onClose}>
    <div className="modal-body">
      {error&&<p className="error-text" role="alert">{error}</p>}
      {entries===null&&!error?<p>Đang đọc lịch sử…</p>:shown.length?
        shown.map(entry=><article className="history-entry" key={entry.operationId}>
          <time className="history-timestamp" dateTime={entry.at}>{formatted(entry.at)}</time>
          <p className="history-change-content">{String(entry.changes[selected as keyof typeof entry.changes]??'—')}</p>
        </article>):
        <p className="empty">Chưa có lần sửa đã lưu cho ô này.</p>}
      {selected==='note'&&<section className="note-history-demo" aria-label="Ba lần sửa ghi chú minh họa">
        <h3>Minh họa 3 lần sửa Ghi chú</h3>
        <p className="muted"><strong>DỮ LIỆU DEMO</strong> — chỉ để xem giao diện; các giá trị và ngày dưới đây
          không phải lịch sử thật, không ghi hoặc sửa Excel/Firebase và không được cộng vào số lần sửa đã lưu.</p>
        {[...NOTE_HISTORY_DEMO].reverse().map(entry=><article className="history-entry note-history-demo-entry" key={entry.at}>
          <time className="history-timestamp" dateTime={entry.at}>{formatted(entry.at)}</time>
          <p className="history-change-content">{entry.value}</p>
        </article>)}
      </section>}
      <p className="muted">Lịch sử đã lưu hiển thị mới nhất ở trên; dữ liệu demo được tách riêng.</p>
    </div>
  </Modal>;
}
