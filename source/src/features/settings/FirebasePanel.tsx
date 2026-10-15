import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { TEXT_FIELDS } from '../../../shared/field-definitions';
import type { EditableField, Item } from '../../../shared/types';
import type {CellPermissions} from '../../data/firebase-repository';

type Rule = 'inherit' | 'allow' | 'deny';
export type FirebasePermissions = CellPermissions;
type Props = {
  userLabel: string;
  isAdmin: boolean;
  connected: boolean;
  permissions: FirebasePermissions;
  items: Item[];
  busy: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSavePermissions: (permissions: FirebasePermissions, expected: FirebasePermissions) => Promise<void>;
  onClose: () => void;
};

const fields: { key: EditableField; label: string }[] = [
  ...TEXT_FIELDS.map(field => ({ key: field.key as EditableField, label: field.label })),
  { key: 'documentKind', label: 'Loại nội dung' },
  { key: 'isDropped', label: 'Đã rút' },
];
const copyPermissions = (value: FirebasePermissions): FirebasePermissions => ({
  columns: { ...value.columns },
  rows: {...value.rows},
  cells: Object.fromEntries(Object.entries(value.cells ?? {}).map(([id, rules]) => [id, { ...rules }])),
});
const same = (a: FirebasePermissions, b: FirebasePermissions) => JSON.stringify(a) === JSON.stringify(b);

export function FirebasePanel({ userLabel, isAdmin, connected, permissions, items, busy, onLogin, onLogout, onSavePermissions, onClose }: Props) {
  const [draft, setDraft] = useState(() => copyPermissions(permissions));
  const baseline=useRef(copyPermissions(permissions));
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState('');
  const [selectedField, setSelectedField] = useState<EditableField>('content');
  const [selectedRule, setSelectedRule] = useState<'allow' | 'deny'>('deny');
  const [selectedRowRule,setSelectedRowRule]=useState<Rule>('deny');
  const dirty = !same(draft, baseline.current);
  useEffect(()=>{if(!dirty){baseline.current=copyPermissions(permissions);setDraft(copyPermissions(permissions));}},[permissions,isAdmin]);
  const isGuest = userLabel.startsWith('Khách ẩn danh');
  const latest = useRef({ dirty, onClose });
  latest.current = { dirty, onClose };
  const itemById = useMemo(() => new Map(items.map(item => [item.recordId, item])), [items]);
  const overrides = Object.entries(draft.cells ?? {}).flatMap(([recordId, rules]) => Object.entries(rules ?? {}).flatMap(([field, value]) => value === undefined ? [] : [{ recordId, field: field as EditableField, value }]));

  const close = () => dirty ? setConfirmClose(true) : onClose();
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      if (latest.current.dirty) setConfirmClose(true); else latest.current.onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);
  const setColumn = (field: EditableField, allowed: boolean) => setDraft(current => ({ ...current, columns: { ...current.columns, [field]: allowed } }));
  const setCell = (recordId: string, field: EditableField, rule: Rule) => setDraft(current => {
    const cells = { ...(current.cells ?? {}) };
    const row = { ...(cells[recordId] ?? {}) };
    if (rule === 'inherit') delete row[field]; else row[field] = rule === 'allow';
    if (Object.keys(row).length) cells[recordId] = row; else delete cells[recordId];
    return { ...current, cells };
  });
  const save = async () => {
    if (saving || busy) return;
    setSaving(true);
    setError(''); setNotice('');
    try { await onSavePermissions(copyPermissions(draft),baseline.current); baseline.current=copyPermissions(draft);setNotice('Đã lưu quyền chỉnh sửa.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa lưu được quyền chỉnh sửa.'); }
    finally { setSaving(false); }
  };
  const login = async () => {
    setError('');
    try { await onLogin(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Đăng nhập Google chưa thành công.'); }
  };
  const logout = async () => {
    setError('');
    try { await onLogout(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa đăng xuất được.'); }
  };

  return <>
    <div className="settings-mode-bar"><div><strong>Kết nối và quyền Firebase</strong><p>Quyền được kiểm tra và thực thi ở máy chủ Firebase.</p></div><div className="top-actions"><button className="button ghost" type="button" disabled={busy} onClick={close}>Về chế độ xem</button></div></div>
    <section className="card" aria-label="Kết nối Firebase">
      <div className="card-header"><div><h3>Kết nối Firebase</h3><p className="muted">{connected ? 'Đã kết nối dịch vụ Firebase' : 'Chưa kết nối Firebase'} · {userLabel || 'Chưa xác định tài khoản'}</p></div></div>
      {error && <p className="error-text" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      <div className="top-actions"><button className="button primary" type="button" disabled={busy} onClick={() => void login()}>{isAdmin ? 'Đổi tài khoản Google' : 'Đăng nhập Google quản trị'}</button>{!isGuest && <button className="button ghost" type="button" disabled={busy} onClick={() => void logout()}>Đăng xuất</button>}</div>
      <p className="muted">Đăng nhập xác định tài khoản. Firebase kiểm tra quyền trên mỗi thao tác; trạng thái trong giao diện không tự cấp quyền.</p>
    </section>

    {connected && !isAdmin && <section className="card"><h3>Thông tin quyền</h3><p>Bạn có thể xem và sửa những ô được cấp quyền. Chỉ quản trị viên được cấu hình quyền chỉnh sửa.</p></section>}
    {connected && isAdmin && <section className="card" aria-label="Cấu hình quyền chỉnh sửa">
      <div className="card-header"><div><h3>Ô được phép chỉnh sửa</h3><p className="muted">Quyền ô ưu tiên hơn dòng, rồi tới cột; chưa cấp quyền thì khóa. Sửa trên WebApp chỉ là thử nghiệm cục bộ.</p></div></div>
      <fieldset className="settings-saving" disabled={busy || saving}>
        <div className="toolbar">{fields.map(field => <label className="field" key={field.key}><span><input type="checkbox" checked={draft.columns[field.key] === true} onChange={event => setColumn(field.key, event.currentTarget.checked)} /> {field.label} — toàn cột</span></label>)}</div>
        <h4>Ngoại lệ theo ô</h4>
        <div className="toolbar">
          <label className="field">Dòng<select value={selectedRecord} onChange={event => setSelectedRecord(event.currentTarget.value)}><option value="">Chọn dòng</option>{items.map(item => <option key={item.recordId} value={item.recordId}>{item.displayCode} · {item.content.slice(0, 90)}</option>)}</select></label>
          <label className="field">Trường<select value={selectedField} onChange={event => setSelectedField(event.currentTarget.value as EditableField)}>{fields.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>
          <label className="field">Quyền<select value={selectedRule} onChange={event => setSelectedRule(event.currentTarget.value as 'allow' | 'deny')}><option value="allow">Cho phép</option><option value="deny">Từ chối</option></select></label>
          <button className="button ghost" type="button" disabled={!selectedRecord} onClick={() => setCell(selectedRecord, selectedField, selectedRule)}>Thêm ngoại lệ</button>
        </div>
        <h4>Ngoại lệ theo dòng</h4>
        <div className="toolbar"><label className="field">Quyền dòng đang chọn<select value={selectedRowRule} onChange={e=>setSelectedRowRule(e.currentTarget.value as Rule)}><option value="allow">Cho phép</option><option value="deny">Từ chối</option><option value="inherit">Kế thừa cột</option></select></label><button className="button ghost" type="button" disabled={!selectedRecord} onClick={()=>setDraft(current=>{const rows={...current.rows};if(selectedRowRule==='inherit')delete rows[selectedRecord];else rows[selectedRecord]=selectedRowRule==='allow';return {...current,rows};})}>Áp dụng quyền dòng</button></div>
        {Object.entries(draft.rows??{}).map(([id,allowed])=><p key={id}>{itemById.get(id)?.displayCode??id} · {allowed?'Cho phép':'Từ chối'} <button className="button ghost" type="button" onClick={()=>setDraft(current=>{const rows={...current.rows};delete rows[id];return {...current,rows};})}>Xóa quyền dòng</button></p>)}
        {overrides.length === 0 ? <p className="muted">Chưa có ngoại lệ theo ô.</p> : <ul>{overrides.map(({ recordId, field, value }) => <li key={`${recordId}:${field}`}>
          <strong>{itemById.get(recordId)?.displayCode ?? recordId}</strong> · {fields.find(candidate => candidate.key === field)?.label ?? field}
          <select aria-label={`Quyền ${field} ${recordId}`} value={value ? 'allow' : 'deny'} onChange={event => setCell(recordId, field, event.currentTarget.value as 'allow' | 'deny')}><option value="allow">Cho phép</option><option value="deny">Từ chối</option></select>
          <button className="button ghost" type="button" onClick={() => setCell(recordId, field, 'inherit')}>Xóa ngoại lệ</button>
        </li>)}</ul>}
      </fieldset>
      <div className="top-actions"><button className="button primary" type="button" disabled={busy || saving || !dirty} onClick={() => void save()}>{saving ? 'Đang lưu quyền…' : 'Lưu quyền'}</button></div>
    </section>}
    {confirmClose && <Modal title="Bỏ phần quyền đang sửa?" onClose={() => setConfirmClose(false)}><div className="modal-body"><p>Thay đổi quyền chưa được lưu.</p></div><div className="modal-footer"><button className="button ghost" type="button" onClick={() => setConfirmClose(false)}>Tiếp tục sửa</button><button className="button danger" type="button" onClick={onClose}>Bỏ thay đổi và thoát</button></div></Modal>}
  </>;
}
