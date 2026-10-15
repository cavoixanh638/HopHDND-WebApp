import { useEffect, useRef, useState } from 'react';
import type { SheetConfig } from '../../data/sheet-config';
import { parseSheetConfig } from '../../data/sheet-config';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';
import { Modal } from '../../components/Modal';

type ConnectionDraft = { url: string; gid: string };
type ExitIntent = 'close' | 'demo';
type ConnectionPanelProps = {
  initial: SheetConfig;
  onTest: (config: SheetConfig) => Promise<{ count: number; warningCount: number }>;
  onConnect: (config: SheetConfig) => Promise<void>;
  onDemo: () => void;
  onClose: () => void;
  disabled: boolean;
  isDemo: boolean;
  allowDemo?: boolean;
};

type TestResult = { count: number; warningCount: number };

function validateConnectionDraft(value: unknown): ConnectionDraft {
  if (!value || typeof value !== 'object') throw new Error('Nháp kết nối không hợp lệ.');
  const draft = value as Partial<ConnectionDraft>;
  if (typeof draft.url !== 'string' || draft.url.length > 2000 || typeof draft.gid !== 'string' || draft.gid.length > 30) throw new Error('Nháp kết nối không hợp lệ.');
  return { url: draft.url, gid: draft.gid };
}

export function ConnectionPanel({ initial, onTest, onConnect, onDemo, onClose, disabled, isDemo, allowDemo=true }: ConnectionPanelProps) {
  const { draft, setDraft, dirty, recoveryMessage, checkpointMessage, clearCheckpoint } = useRecoverableDraft<ConnectionDraft>(
    `connection:${initial.spreadsheetId}:${initial.gid}`,
    { url: initial.url, gid: initial.gid },
    validateConnectionDraft,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [outcome, setOutcome] = useState('');
  const [confirm, setConfirm] = useState<ExitIntent | null>(null);
  const latest = useRef({ dirty, onClose });
  latest.current = { dirty, onClose };

  const close = () => { if (dirty) setConfirm('close'); else onClose(); };

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      if (latest.current.dirty) setConfirm('close'); else latest.current.onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  const handleUrlChange = (url: string) => {
    let gid = draft.gid;
    try {
      const parsed = parseSheetConfig(url);
      const incoming = new URL(url);
      const explicitGid = incoming.searchParams.has('gid') || new URLSearchParams(incoming.hash.slice(1)).has('gid');
      gid = !explicitGid && parsed.spreadsheetId === initial.spreadsheetId ? initial.gid : parsed.gid;
    } catch {
      // Keep the editable gid while the URL is incomplete or invalid.
    }
    setDraft({ url, gid });
    setError(''); setResult(null); setOutcome('');
  };

  const runTest = async () => {
    if (busy || disabled) return;
    setBusy(true); setError(''); setResult(null); setOutcome('');
    try { setResult(await onTest(parseSheetConfig(draft.url, draft.gid))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };

  const connect = async (intent: ExitIntent | null = null) => {
    if (busy || disabled) return;
    setBusy(true); setError(''); setOutcome('');
    try {
      const config = parseSheetConfig(draft.url, draft.gid);
      await onConnect(config);
      clearCheckpoint();
      setOutcome('Đã chọn nguồn dữ liệu.');
      setConfirm(null);
      if (intent === 'demo') onDemo();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  };

  const discardAndExit = () => {
    clearCheckpoint();
    setConfirm(null);
    if (confirm === 'demo') onDemo();
    onClose();
  };
  const useDemo = () => {
    if (busy || disabled) return;
    if (dirty) setConfirm('demo');
    else { onDemo(); onClose(); }
  };

  const controlsDisabled = disabled || busy;

  return <>
    <div className="settings-mode-bar"><div><strong>Chế độ cấu hình nguồn dữ liệu</strong><p>Kiểm tra kết nối trước khi áp dụng nguồn mới.</p></div><button className="button ghost" type="button" onClick={close}>Về chế độ xem</button></div>
    {recoveryMessage && <p className="status-pill" role="status">{recoveryMessage}</p>}
    {checkpointMessage && <p className="muted" role="status">{checkpointMessage}</p>}
    <section className="card" aria-labelledby="connection-heading">
      <div className="card-header">
        <div>
          <h3 id="connection-heading">Kết nối dữ liệu</h3>
          <p className="muted">Kết nối chỉ đọc, không thay đổi dữ liệu trong Google Sheets.</p>
        </div>
      </div>
      <div className="toolbar">
        <label className="field search-field">
          Link Google Sheets
          <input type="url" value={draft.url} onChange={event => handleUrlChange(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" disabled={controlsDisabled} />
        </label>
        <label className="field">
          Mã trang tính (gid)
          <input inputMode="numeric" value={draft.gid} onChange={event => { setDraft({ ...draft, gid: event.target.value }); setError(''); setResult(null); setOutcome(''); }} disabled={controlsDisabled} />
        </label>
      </div>
      <div className="top-actions">
        <button className="button ghost" type="button" onClick={() => void runTest()} disabled={controlsDisabled}>{busy ? 'Đang xử lý…' : 'Kiểm tra kết nối'}</button>
        <button className="button primary" type="button" onClick={() => void connect()} disabled={controlsDisabled}>Kết nối và tải dữ liệu</button>
        {allowDemo&&!isDemo && <button className="button ghost" type="button" onClick={useDemo} disabled={controlsDisabled}>Dùng dữ liệu mẫu</button>}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {result && <p className="notice" role="status">Kiểm tra thành công: {result.count} nội dung.{result.warningCount > 0 && ` Có ${result.warningCount} cảnh báo cần rà soát.`}</p>}
      {outcome && <p className="notice" role="status">{outcome}</p>}
    </section>
    {confirm && <Modal title={confirm === 'close' ? 'Rời cấu hình nguồn?' : 'Dùng dữ liệu mẫu?'} onClose={() => setConfirm(null)}>
      <div className="modal-body"><p>{confirm === 'close' ? 'URL hoặc mã trang tính đang có thay đổi chưa được áp dụng.' : 'Bạn có thể áp dụng kết nối đang sửa trước khi chuyển sang dữ liệu mẫu.'}</p>{error && <p className="error-text" role="alert">{error}</p>}</div>
      <div className="modal-footer"><button className="button primary" type="button" onClick={() => void connect(confirm)} disabled={controlsDisabled}>Kết nối và thoát</button><button className="button danger" type="button" onClick={discardAndExit} disabled={controlsDisabled}>Không lưu và thoát</button><button className="button ghost" type="button" onClick={() => setConfirm(null)} disabled={controlsDisabled}>Tiếp tục sửa</button></div>
    </Modal>}
  </>;
}
