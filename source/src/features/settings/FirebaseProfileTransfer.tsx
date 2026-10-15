import { useEffect, useRef, useState } from 'react';
import { validateCatalog, type CatalogConfig } from '../../data/catalogs';
import { validateReportLayout, type ReportLayout } from '../../data/report-preferences';
import { validateItemLayout, type ItemLayout } from '../../data/item-preferences';

const PROJECT_ID = 'hophdnd-8b7b2';
const MAX_FILE_SIZE = 300 * 1024;
export type FirebaseProfile = { catalogs: CatalogConfig; reports: ReportLayout[]; items: ItemLayout };
type ProfileFile = { schemaVersion: 1; projectId: typeof PROJECT_ID; profile: FirebaseProfile };
type Props = {
  profile: FirebaseProfile;
  isAdmin: boolean;
  busy: boolean;
  onSave: (profile: FirebaseProfile) => Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}
function parseProfileFile(value: unknown): ProfileFile {
  if (!isRecord(value) || !hasExactKeys(value, ['schemaVersion', 'projectId', 'profile']) || value.schemaVersion !== 1 || value.projectId !== PROJECT_ID || !isRecord(value.profile) || !hasExactKeys(value.profile, ['catalogs', 'reports', 'items'])) {
    throw new Error('Tệp không đúng schema hoặc không thuộc dự án Firebase đã chọn.');
  }
  return {
    schemaVersion: 1,
    projectId: PROJECT_ID,
    profile: {
      catalogs: validateCatalog(value.profile.catalogs),
      reports: validateReportLayout(value.profile.reports),
      items: validateItemLayout(value.profile.items),
    },
  };
}

export function FirebaseProfileTransfer({ profile, isAdmin, busy, onSave, onPendingChange }: Props) {
  const [candidate, setCandidate] = useState<ProfileFile | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCallback = useRef(onPendingChange);
  pendingCallback.current = onPendingChange;

  useEffect(() => {
    onPendingChange?.(!!candidate);
  }, [candidate, onPendingChange]);

  useEffect(() => () => pendingCallback.current?.(false), []);

  useEffect(() => {
    if (!candidate) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [candidate]);

  const readFile = async (file?: File) => {
    setError(''); setNotice('');
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { setError('Tệp vượt quá giới hạn 300 KB.'); return; }
    try { setCandidate(parseProfileFile(JSON.parse(await file.text()))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được tệp cấu hình.'); }
  };
  const exportProfile = () => {
    setError(''); setNotice('');
    try {
      const payload: ProfileFile = { schemaVersion: 1, projectId: PROJECT_ID, profile: {
        catalogs: validateCatalog(profile.catalogs),
        reports: validateReportLayout(profile.reports),
        items: validateItemLayout(profile.items),
      } };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'firebase-hdnd-profile.json';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa xuất được cấu hình.'); }
  };
  const save = async () => {
    if (!candidate || !isAdmin || busy || saving) return;
    setSaving(true); setError(''); setNotice('');
    try { await onSave(candidate.profile); setCandidate(null); setNotice('Đã lưu danh mục và bố trí vào Firebase.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa lưu được danh mục và bố trí vào Firebase.'); }
    finally { setSaving(false); }
  };
  const counts = candidate ? {
    options: Object.values(candidate.profile.catalogs.options).reduce((count, values) => count + values.length, 0),
    relations: Object.keys(candidate.profile.catalogs.specialistRooms).length,
    visibleReports: candidate.profile.reports.filter(report => report.visible).length,
    visibleColumns: candidate.profile.items.columns.filter(column => column.visible).length,
    totalColumns: candidate.profile.items.columns.length,
  } : null;

  return <details className="card">
    <summary><strong>Nhập / Xuất danh mục và bố trí (JSON)</strong></summary>
    <div className="modal-body">
      <p className="muted">Tệp này chỉ chứa danh mục, quan hệ và bố trí; không chứa các dòng nội dung. Nhập tệp chỉ tạo bản xem trước. Chọn Lưu để gửi cấu hình vào Firebase.</p>
      {error && <p className="error-text" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      <div className="toolbar">
        <button className="button ghost" type="button" disabled={busy || saving} onClick={exportProfile}>Xuất JSON</button>
        <button className="button ghost" type="button" disabled={busy || saving} onClick={() => inputRef.current?.click()}>Nhập JSON</button>
        <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={event => { const input = event.currentTarget; void readFile(input.files?.[0]); input.value = ''; }} />
      </div>
      {candidate && counts && <section className="card" aria-label="Xem trước cấu hình Firebase nhập">
        <h4>Xem trước cấu hình nhập</h4>
        <p>{counts.options} giá trị danh mục · {counts.relations} quan hệ chuyên viên–phòng · {counts.visibleReports} bảng báo cáo đang hiện · {counts.visibleColumns}/{counts.totalColumns} cột đang hiện</p>
        <p className="muted">Dự án: {candidate.projectId} · Schema: {candidate.schemaVersion}</p>
        <div className="top-actions">
          {isAdmin && <button className="button primary" type="button" disabled={busy || saving} onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu danh mục và bố trí vào Firebase'}</button>}
          <button className="button ghost" type="button" disabled={busy || saving} onClick={() => { setCandidate(null); setError(''); setNotice('Bản xem trước đã bị bỏ.'); }}>Bỏ bản xem trước</button>
        </div>
        {!isAdmin && <p className="muted">Chỉ quản trị viên được lưu cấu hình vào Firebase.</p>}
      </section>}
    </div>
  </details>;
}
