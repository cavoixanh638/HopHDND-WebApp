import { useEffect, useRef, useState } from 'react';
import type { SheetConfig } from '../../data/sheet-config';
import { validateCatalog, type CatalogConfig } from '../../data/catalogs';
import { validateReportLayout, type ReportLayout } from '../../data/report-preferences';
import { validateItemLayout, type ItemLayout } from '../../data/item-preferences';
import type { SharedConfig } from '../../data/shared-config';
import { Modal } from '../../components/Modal';
import {useRecoverableDraft} from '../../state/use-recoverable-draft';
import {CONFIG_STORE_URL} from '../../data/shared-store';

type Profile = { catalogs: CatalogConfig; reports: ReportLayout[]; items: ItemLayout };
type Props = {
  source: SheetConfig; profile: Profile; config: SharedConfig | null; isHost: boolean; busy: boolean;
  onSave: (value: Profile) => Promise<void>; onRefresh: () => Promise<void>; onClose: () => void;
};
type Candidate = Profile & { schemaVersion: 1; sourceSpreadsheetId: string; gid: string };

function parseProfile(value: unknown, source: SheetConfig): Candidate {
  if (!value || typeof value !== 'object') throw new Error('Tệp cấu hình không hợp lệ.');
  const row = value as Partial<Candidate>;
  if (row.schemaVersion !== 1 || row.sourceSpreadsheetId !== source.spreadsheetId || row.gid !== source.gid) throw new Error('Phiên bản hoặc nguồn trong tệp không khớp với trang tính đang mở.');
  return { schemaVersion: 1, sourceSpreadsheetId: source.spreadsheetId, gid: source.gid,
    catalogs: validateCatalog(row.catalogs), reports: validateReportLayout(row.reports), items: validateItemLayout(row.items) };
}

export function SyncPanel({ source, profile, config, isHost, busy, onSave, onRefresh, onClose }: Props) {
  const {draft:candidate,setDraft:setCandidate,clearCheckpoint,recoveryMessage,checkpointMessage}=useRecoverableDraft<Candidate|null>(`sync:${source.spreadsheetId}:${source.gid}`,null,value=>value===null?null:parseProfile(value,source));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ candidate, busy, onClose });
  latest.current = { candidate, busy, onClose };

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      if(latest.current.busy)return;
      if (latest.current.candidate) setConfirmExit(true); else latest.current.onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  const close = () => {if(busy)return;candidate?setConfirmExit(true):onClose();};
  const save = async (andClose = false) => {
    if (!candidate || busy) return;
    setError('');
    try {
      await onSave({ catalogs: candidate.catalogs, reports: candidate.reports, items: candidate.items });
      setCandidate(null);clearCheckpoint(); setNotice('Đã lưu danh mục và bố trí vào kho Google Sheets riêng.');
      if (andClose) onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa lưu được danh mục và bố trí dùng chung.'); }
  };
  const readFile = async (file?: File) => {
    setError(''); setNotice('');
    if (!file) return;
    if (file.size > 300 * 1024) { setError('Tệp vượt quá giới hạn 300 KB.'); return; }
    try { setCandidate(parseProfile(JSON.parse(await file.text()), source)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được tệp cấu hình.'); }
  };
  const exportProfile = () => {
    const payload: Candidate = { schemaVersion: 1, sourceSpreadsheetId: source.spreadsheetId, gid: source.gid,
      catalogs: validateCatalog(profile.catalogs), reports: validateReportLayout(profile.reports), items: validateItemLayout(profile.items) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cau-hinh-hdnd-${source.gid}.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };
  const hostInit = async () => {
    if (busy) return;
    try { await onSave(profile); setNotice('Đã khởi tạo danh mục và bố trí dùng chung trong kho Google Sheets riêng.'); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa khởi tạo được danh mục và bố trí dùng chung.'); }
  };

  return <>
    <div className="settings-mode-bar"><div><strong>Danh mục và bố trí dùng chung</strong><p>Google Sheets riêng lưu danh mục tên/phòng, quan hệ chuyên viên – phòng, tên/thứ tự/ẩn hiện bảng/cột và độ rộng. Các dòng nội dung trình HĐND vẫn ở Excel nguồn.</p></div><div className="top-actions"><button className="button ghost" type="button" disabled={busy} onClick={close}>Về chế độ xem</button></div></div>
    <section className="card" aria-labelledby="sync-heading">
      <div className="card-header"><div><h3 id="sync-heading">Danh mục và bố trí dùng chung</h3>
        {config ? <p className="muted">Đã kết nối · phiên bản chung {config.revision} · cập nhật {new Date(config.updatedAt).toLocaleString('vi-VN')}</p>
          : <p className="muted">Chưa đọc được danh mục và bố trí từ Google Sheets riêng.</p>}
      </div></div>
      {recoveryMessage&&<p role="status">{recoveryMessage}</p>}<p className="muted" role="status">{checkpointMessage}</p>
      {error && <p className="error-text" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      <div className="toolbar">
        <button className="button ghost" type="button" disabled={busy} onClick={exportProfile}>Xuất danh mục và bố trí</button>
        <button className="button ghost" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>Nhập danh mục và bố trí</button>
        <input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" onChange={event => { const input = event.currentTarget; void readFile(input.files?.[0]); input.value = ''; }} />
        <button className="button ghost" type="button" disabled={busy} onClick={() => { setError(''); void onRefresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Chưa tải được danh mục và bố trí từ Google.')); }}>Đọc danh mục và bố trí từ Google</button>
      </div>
      <p className="muted">Tệp xuất chỉ chứa danh mục, quan hệ và bố trí, không chứa các dòng nội dung Excel. Nhập tệp tạo bản xem trước; kiểm tra rồi bấm Lưu để cập nhật bản dùng chung.</p>
      {candidate && <div className="card" aria-label="Xem trước cấu hình nhập">
        <h4>Xem trước cấu hình nhập</h4>
        <p>{Object.values(candidate.catalogs.options).reduce((n, values) => n + values.length, 0)} giá trị danh mục · {candidate.reports.length} bảng báo cáo · {candidate.items.columns.filter(column => column.visible).length}/{candidate.items.columns.length} cột đang hiện · khung ngoài {candidate.items.frameWidth==='auto'||candidate.items.frameWidth===undefined?'tự động':`${candidate.items.frameWidth} px`} · bảng bên trong {candidate.items.tableWidth} px</p>
        <ul>{candidate.reports.map(report => <li key={report.id}>{report.title}{report.visible ? '' : ' (đang ẩn)'}</li>)}</ul>
        <div className="top-actions">{isHost && <button className="button primary" type="button" disabled={busy} onClick={() => void save()}>Lưu danh mục và bố trí vào Google</button>}<button className="button ghost" type="button" disabled={busy} onClick={() => setCandidate(null)}>Bỏ bản xem trước</button></div>
      </div>}
      {isHost && !config && <div className="top-actions"><button className="button primary" type="button" disabled={busy} onClick={() => void hostInit()}>Tạo bản danh mục và bố trí dùng chung</button></div>}
      {!isHost && config?.editorUrl && <p><a href={config.editorUrl} target="_blank" rel="noreferrer">Mở trang chỉnh danh mục và bố trí trên Google</a></p>}
      <p className="muted">Tải từ Google cập nhật danh mục và bố trí trong ứng dụng; lưu từ ứng dụng ghi danh mục và bố trí vào kho Google Sheets riêng. Kho này không lưu nội dung nghiệp vụ trong Excel.</p>
      <p><a href={source.url} target="_blank" rel="noreferrer">Mở file Excel nhập liệu</a></p>
      <p><a href={CONFIG_STORE_URL} target="_blank" rel="noreferrer">Mở kho Google Sheets riêng chứa danh mục và bố trí</a></p><p className="muted">Danh mục và bố trí lưu riêng để giữ nguyên file Excel và link nhập liệu. Giữ thay đổi trên máy không cập nhật Google Sheets này.</p>
    </section>
    {confirmExit && <Modal title="Xử lý danh mục và bố trí đã nhập?" onClose={() => setConfirmExit(false)}><div className="modal-body"><p>Có danh mục và bố trí đã nhập đang chờ lưu.{!isHost&&' Mở trình chỉnh trên Google để lưu vào kho Google Sheets riêng; file HTML chỉ lưu trên máy.'}</p>{error && <p className="error-text" role="alert">{error}</p>}</div><div className="modal-footer"><button className="button primary" type="button" disabled={busy||!isHost} onClick={() => void save(true)}>Lưu danh mục và bố trí vào kho Google Sheets riêng</button><button className="button danger" type="button" disabled={busy} onClick={() => { setCandidate(null);clearCheckpoint(); setConfirmExit(false); onClose(); }}>Bỏ danh mục và bố trí đã nhập</button><button className="button ghost" type="button" disabled={busy} onClick={() => setConfirmExit(false)}>Tiếp tục</button></div></Modal>}
  </>;
}
