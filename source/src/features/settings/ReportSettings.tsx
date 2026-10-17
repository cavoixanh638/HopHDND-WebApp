import { useEffect, useRef, useState } from 'react';
import type { GroupField, Item } from '../../../shared/types';
import { defaultReportLayout, validateReportLayout, type ReportLayout } from '../../data/report-preferences';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';
import { ReportLayoutPanel } from './ReportLayoutPanel';
import { Modal } from '../../components/Modal';
import { validateReportDraft } from '../../data/report-draft';

export function ReportSettings({ initial, onSave, onClose, items, group, sourceLabel, sourceKey, groupOrder, storageLabel = 'Google Sheets',onDirtyChange }: {
  initial: ReportLayout[]; onSave: (layout: ReportLayout[]) => Promise<void>; onClose: () => void;
  items: Item[]; group: GroupField; sourceLabel: string; sourceKey: string; groupOrder:string[];
  storageLabel?: string;
  onDirtyChange?:(dirty:boolean)=>void;
}) {
  const { draft, setDraft, dirty, recoveryMessage, checkpointMessage, clearCheckpoint, unmatchedCheckpoint, restoreOldDraft, discardOldDraft } = useRecoverableDraft<ReportLayout[]>(`report:${sourceKey}`, initial, validateReportDraft);
  const [error, setError] = useState('');
  const [saving,setSaving]=useState(false);
  const [confirm, setConfirm] = useState<'close' | 'reset' | null>(null);
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  const dataLabel = storageLabel === 'Google Sheets' ? 'dữ liệu Excel' : 'dữ liệu nội dung';
  const latest = useRef({ dirty, onClose,saving });
  latest.current = { dirty, onClose,saving };
  const close = () => { if(saving)return;if (dirty) setConfirm('close'); else onClose(); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      if(latest.current.saving)return;
      if (latest.current.dirty) setConfirm('close'); else latest.current.onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  const change = (next: ReportLayout[]) => { setDraft(next); setError(''); };
  const save = async (exit = false) => {
    if(saving||unmatchedCheckpoint)return;
    setSaving(true);
    try {
      const valid = validateReportLayout(draft);
      await onSave(valid);
      clearCheckpoint();
      setError('');
      setConfirm(null);
      if (exit) onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa lưu được bố trí báo cáo.');
    } finally {setSaving(false);}
  };

  return <>
  <fieldset className="settings-saving" disabled={saving||!!unmatchedCheckpoint}>
    <div className="settings-mode-bar"><div><strong>Chế độ tùy chỉnh bảng báo cáo</strong><p>Phần đang sửa được giữ trên máy, chưa lưu. Khi lưu, bố trí báo cáo được lưu riêng lên {storageLabel}; {dataLabel} không đổi.</p></div><div className="top-actions"><button className="button ghost" onClick={() => setConfirm('reset')}>Khôi phục mặc định</button><button className="button ghost" onClick={close}>Hủy / Về chế độ xem</button><button className="button primary" onClick={() => save(true)}>Lưu bố trí và về chế độ xem</button></div></div>
    {recoveryMessage && <p className="status-pill" role="status">{recoveryMessage}</p>}
    {checkpointMessage && <p className="muted" role="status">{checkpointMessage}</p>}
    {error && <p className="error-text" role="alert">{error}</p>}
    {saving&&<p role="status">Đang lưu bố trí báo cáo lên {storageLabel}…</p>}
    <ReportLayoutPanel draft={draft} onChange={change} items={items} group={group} groupOrder={groupOrder} sourceLabel={sourceLabel} />
    {confirm && <Modal title={confirm === 'close' ? `Lưu bố trí lên ${storageLabel} trước khi thoát?` : 'Khôi phục bố trí mặc định?'} onClose={() => setConfirm(null)}><div className="modal-body"><p>{confirm === 'close' ? `Có phần đang sửa trên máy, chưa lưu. Bố trí chỉ được lưu lên ${storageLabel} khi bạn bấm Lưu; ${dataLabel} không đổi.` : `Ba bảng trở về tên, thứ tự và các cột hiển thị mặc định trong phần đang sửa trên máy. Bấm Lưu bố trí để lưu riêng lên ${storageLabel}; ${dataLabel} không đổi.`}</p></div>{confirm === 'close' ? <div className="modal-footer"><button className="button ghost" onClick={() => save(true)}>Lưu bố trí và thoát</button><button className="button danger" onClick={() => { clearCheckpoint(); setConfirm(null); onClose(); }}>Bỏ phần đang sửa trên máy và về xem</button><button className="button primary" onClick={() => setConfirm(null)}>Tiếp tục sửa</button></div> : <div className="modal-footer"><button className="button ghost" onClick={() => setConfirm(null)}>Tiếp tục tùy chỉnh</button><button className="button danger" onClick={() => { change(defaultReportLayout()); setConfirm(null); }}>Khôi phục trong phần đang sửa</button></div>}</Modal>}
  </fieldset>
  {unmatchedCheckpoint&&<Modal title="Có phần sửa cũ trên máy" onClose={onClose}><div className="modal-body"><p>Phần đang sửa trên máy chưa được lưu và chưa ghi lên {storageLabel}. Bạn có thể nạp phần sửa để đối chiếu trước khi quyết định lưu bố trí; {dataLabel} không đổi.</p><p className="muted">Lưu trên máy: {new Date(unmatchedCheckpoint.savedAt).toLocaleString('vi-VN')}</p></div><div className="modal-footer"><button className="button ghost" onClick={onClose}>Giữ phần sửa trên máy và về xem</button><button className="button danger" onClick={discardOldDraft}>Bỏ phần sửa cũ</button><button className="button primary" onClick={restoreOldDraft}>Nạp phần sửa để đối chiếu</button></div></Modal>}
  </>;
}

