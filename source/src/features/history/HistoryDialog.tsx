import {useEffect,useState} from 'react';
import type {AuditEntry,Item} from '../../../shared/types';
import type {Repository} from '../../data/repository';
import {TEXT_FIELDS} from '../../../shared/field-definitions';
import {Modal} from '../../components/Modal';

/** Find the newest saved audit event affecting this exact field, not the row. */
export function latestHistoryForField(entries:AuditEntry[],field:string):AuditEntry|undefined {
  return entries.filter(entry=>Object.prototype.hasOwnProperty.call(entry.changes,field))
    .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
}
/** Illustrative values only; never insert these rows into the audit log. */
export const NOTE_HISTORY_DEMO=[
  {at:'2026-10-18T08:30:00+07:00',value:'Đã tiếp nhận, đề nghị đơn vị bổ sung hồ sơ.'},
  {at:'2026-10-20T10:15:00+07:00',value:'Đã nhận hồ sơ bổ sung, đang rà soát nội dung.'},
  {at:'2026-10-22T15:40:00+07:00',value:'Đã tổng hợp ý kiến, chuyển bước xử lý tiếp theo.'},
] as const;
export function HistoryDialog({item,field,repository,onClose}:{
  item:Item;field?:string;repository:Repository;onClose:()=>void;
}){
  const [entries,setEntries]=useState<AuditEntry[]|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    repository.history(item.recordId,item.displayCode)
      .then(value=>{if(!cancelled)setEntries([...value].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)));})
      .catch(()=>{if(!cancelled)setError('Không tải được lịch sử.');});
    return ()=>{cancelled=true;};
  },[item.recordId,item.displayCode,repository]);
  const label=field?(TEXT_FIELDS.find(row=>row.key===field)?.label??field):'';
  const latest=field&&entries?latestHistoryForField(entries,field):undefined;
  const shown=field?(latest?[latest]:[]):entries??[];
  return <Modal title={field?`Sửa gần nhất · ${label} · ${item.displayCode}`:`Lịch sử · ${item.displayCode}`}
    onClose={onClose}>
    <div className="modal-body">
      {error&&<p className="error-text" role="alert">{error}</p>}
      {entries===null&&!error?<p>Đang đọc lịch sử…</p>:shown.length?
        shown.map(entry=><article className="history-entry" key={entry.operationId}>
          <strong>{new Date(entry.at).toLocaleString('vi-VN')}</strong>
          {Object.entries(entry.changes).filter(([key])=>!field||key===field)
            .map(([key,value])=><p key={key}>
              {TEXT_FIELDS.find(f=>f.key===key)?.label??key}: {String(entry.oldValues[key as keyof typeof entry.oldValues]??'—')}
              {' → '}<strong>{String(value)}</strong>
            </p>)}
        </article>):
        <p className="empty">{field?'Chưa có lần sửa đã lưu cho ô này.':'Chưa có thay đổi đã lưu trong nguồn lịch sử.'}</p>}
      {field==='note'&&<section className="note-history-demo" aria-label="Ba lần sửa ghi chú minh họa">
        <h3>Minh họa 3 lần sửa Ghi chú</h3>
        <p className="muted"><strong>DỮ LIỆU DEMO</strong> — chỉ để xem giao diện; các giá trị và ngày dưới đây
          không phải lịch sử thật, không ghi hoặc sửa Excel/Firebase và không được cộng vào số lần sửa đã lưu.</p>
        {NOTE_HISTORY_DEMO.map((entry,index)=><article className="history-entry note-history-demo-entry" key={entry.at}>
          <strong>Lần {index+1} · {new Date(entry.at).toLocaleString('vi-VN')}</strong>
          <p>Giá trị Ghi chú: <strong>{entry.value}</strong></p>
        </article>)}
      </section>}
      {field&&<p className="muted">Lịch sử thật (nếu có) ở phía trên được đọc từ nguồn đã lưu;
        bản demo tách riêng, không tính nháp chưa lưu.</p>}
    </div>
  </Modal>;
}
