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
      {field&&<p className="muted">Chỉ hiển thị lịch sử đã lưu trong nguồn; nháp chưa lưu không có ở đây.</p>}
    </div>
  </Modal>;
}
