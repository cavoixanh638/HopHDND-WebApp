import { useEffect, useRef, useState } from 'react';
import type { Item } from '../../../shared/types';
import { catalogFromItems, loadCatalog, validateCatalog, type CatalogConfig } from '../../data/catalogs';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';
import { Modal } from '../../components/Modal';
import { CatalogPanel } from './CatalogPanel';
export function CatalogSettings({ sourceKey, items, onSave, onClose, config, storageLabel = 'Google Sheets',onDirtyChange }: { sourceKey: string; items: Item[]; onSave: (config:CatalogConfig)=>Promise<void>; onClose:()=>void; config?:CatalogConfig; storageLabel?: string;onDirtyChange?:(dirty:boolean)=>void }) {
  const [initial] = useState(() => config ?? loadCatalog(sourceKey, items));
  const { draft,setDraft,dirty,clearCheckpoint,recoveryMessage,checkpointMessage,unmatchedCheckpoint,restoreOldDraft,discardOldDraft } = useRecoverableDraft(`catalog:${sourceKey}`,initial,validateCatalog);
  const [confirm,setConfirm] = useState(false), [error,setError] = useState('');
  const [formPending,setFormPending]=useState(false);
  useEffect(()=>{onDirtyChange?.(dirty||formPending);},[dirty,formPending,onDirtyChange]);
  const dataLabel = storageLabel === 'Google Sheets' ? 'nội dung trong Excel' : 'dữ liệu nội dung';
  const [saving,setSaving]=useState(false);
  const discardForm=useRef<()=>void>(()=>{}), pendingForm=useRef<()=>boolean>(()=>false);
  const latest = useRef({dirty,onClose,saving}); latest.current = {dirty,onClose,saving};
  const close=()=>{if(saving)return;if(dirty||pendingForm.current())setConfirm(true);else onClose();};
  const save=async()=>{if(saving||unmatchedCheckpoint)return;setSaving(true);try{if(pendingForm.current())throw new Error('Hãy bấm Thêm hoặc Lưu tên cho phần đang nhập, hoặc xóa phần nhập trước khi Lưu danh mục.');await onSave(validateCatalog(draft));clearCheckpoint();discardForm.current();onClose();}catch(cause){setError(cause instanceof Error?cause.message:'Chưa lưu được danh mục.');}finally{setSaving(false);}};
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')){event.preventDefault();if(latest.current.saving)return;if(latest.current.dirty||pendingForm.current())setConfirm(true);else latest.current.onClose();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  return <>
    <fieldset className="settings-saving" disabled={saving||!!unmatchedCheckpoint}><div className="settings-mode-bar"><div><strong>Chế độ chỉnh danh mục và phân công</strong><p>Phần đang sửa được giữ trên máy, chưa lưu. Khi lưu, danh mục được lưu riêng trên {storageLabel}; {dataLabel} không đổi.</p></div><div className="top-actions"><button className="button ghost" onClick={()=>setDraft(catalogFromItems(items))}>Nạp lại từ dữ liệu</button><button className="button ghost" onClick={close}>Về chế độ xem</button><button className="button primary" onClick={save}>Lưu danh mục và thoát</button></div></div><p className="muted" role="status">{checkpointMessage}</p>{recoveryMessage&&<p className="notice">{recoveryMessage}</p>}{error&&<p className="error-text" role="alert">{error}</p>}<CatalogPanel sourceKey={sourceKey} onPendingChange={setFormPending} registerDiscard={fn=>{discardForm.current=fn;}} registerPending={getter=>{pendingForm.current=getter;}} draft={draft} onChange={setDraft} items={items}/>{confirm&&<Modal title={`Lưu danh mục lên ${storageLabel} trước khi thoát?`} onClose={()=>setConfirm(false)}><div className="modal-body">Có phần đang sửa trên máy, chưa lưu. Phần tự lưu trên máy không thay thế thao tác lưu danh mục lên {storageLabel}; {dataLabel} không đổi.{error&&<p className="error-text" role="alert">{error}</p>}</div><div className="modal-footer"><button className="button ghost" onClick={()=>setConfirm(false)}>Tiếp tục sửa</button><button className="button danger" onClick={()=>{clearCheckpoint();discardForm.current();onClose();}}>Bỏ phần đang sửa trên máy và về xem</button><button className="button primary" onClick={save}>Lưu danh mục và thoát</button></div></Modal>}</fieldset>
    {unmatchedCheckpoint&&<Modal title="Có phần sửa cũ trên máy" onClose={onClose}><div className="modal-body"><p>Phần đang sửa trên máy chưa được lưu và chưa ghi lên {storageLabel}. Bạn có thể nạp phần sửa để đối chiếu trước khi quyết định lưu danh mục; {dataLabel} không đổi.</p><p className="muted">Lưu trên máy: {new Date(unmatchedCheckpoint.savedAt).toLocaleString('vi-VN')}</p></div><div className="modal-footer"><button className="button ghost" onClick={onClose}>Giữ phần sửa trên máy và về xem</button><button className="button danger" onClick={discardOldDraft}>Bỏ phần sửa cũ</button><button className="button primary" onClick={restoreOldDraft}>Nạp phần sửa để đối chiếu</button></div></Modal>}
  </>;
}

