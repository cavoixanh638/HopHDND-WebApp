import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Item } from '../../../shared/types';
import { normalizeSearch } from '../../domain/search';
import { CATALOG_KEYS, type CatalogConfig, type CatalogKey } from '../../data/catalogs';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';

const catalogLabels: { key: CatalogKey; label: string; field: keyof Item }[] = [
  { key: 'department', label: 'Sở/đơn vị', field: 'department' },
  { key: 'type', label: 'Loại văn bản', field: 'type' },
  { key: 'partyLevel', label: 'Cấp xin ý kiến', field: 'partyLevel' },
  { key: 'progressParty', label: 'Tiến độ xin ý kiến', field: 'progressParty' },
  { key: 'progressBuild', label: 'Tiến độ xây dựng', field: 'progressBuild' },
  { key: 'progressCouncil', label: 'Tiến độ HĐND', field: 'progressCouncil' },
  { key: 'specialist', label: 'Chuyên viên', field: 'specialist' },
  { key: 'room', label: 'Phòng', field: 'room' },
  { key: 'vpLeader', label: 'Lãnh đạo VP', field: 'vpLeader' },
  { key: 'ubndLeader', label: 'Lãnh đạo UBND', field: 'ubndLeader' },
  { key: 'specificProgress', label: 'Tiến độ cụ thể', field: 'specificProgress' },
];

type FormDraft = { selected:CatalogKey; newValue: string; renaming: string | null; renameValue: string };
const blankForm = (selected:CatalogKey='department'): FormDraft => ({ selected, newValue: '', renaming: null, renameValue: '' });
function validateForm(value: unknown): FormDraft {
  if (!value || typeof value !== 'object') return blankForm();
  const form = value as Partial<FormDraft>;
  return {
    selected:CATALOG_KEYS.includes(form.selected as CatalogKey)?form.selected as CatalogKey:'department',
    newValue: typeof form.newValue === 'string' && form.newValue.length <= 200 ? form.newValue : '',
    renaming: (form.renaming === null || (typeof form.renaming === 'string' && form.renaming.length <= 200)) ? form.renaming : null,
    renameValue: typeof form.renameValue === 'string' && form.renameValue.length <= 200 ? form.renameValue : '',
  };
}
type CatalogPanelProps = {
  draft: CatalogConfig;
  onChange: (next: CatalogConfig) => void;
  items: Item[];
  sourceKey: string;
  onPendingChange: (pending: boolean) => void;
  registerPending: (getPending: () => boolean) => void;
  registerDiscard: (discard: () => void) => void;
};

export function CatalogPanel({ draft, onChange, items, sourceKey, onPendingChange, registerPending, registerDiscard }: CatalogPanelProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [selectedSpecialist, setSelectedSpecialist] = useState('');
  const { draft: form, setDraft: setForm, clearCheckpoint } = useRecoverableDraft<FormDraft>(`catalog-form:${sourceKey}`, blankForm(), validateForm, current=>current.newValue.trim()!==''||(current.renaming!==null&&current.renameValue!==current.renaming));
  const selected=form.selected;
  const setSelected=(next:CatalogKey)=>setForm(previous=>({...previous,selected:next}));
  const pending = form.newValue.trim() !== '' || (form.renaming !== null && form.renameValue !== form.renaming);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const discardForm = useCallback(() => { setForm(blankForm(selected)); clearCheckpoint(); setError(''); }, [selected,setForm, clearCheckpoint]);

  useEffect(() => { onPendingChange(pending); }, [onPendingChange, pending]);
  useEffect(() => { registerPending(() => pendingRef.current); }, [registerPending]);
  useEffect(() => { registerDiscard(discardForm); }, [discardForm, registerDiscard]);

  const config = catalogLabels.find(entry => entry.key === selected)!;
  const values = draft.options[selected] ?? [];
  const visibleValues = useMemo(() => values.filter(value => normalizeSearch(value).includes(normalizeSearch(query))), [values, query]);
  const usageCount = (value: string) => items.filter(item => String(item[config.field] ?? '') === value).length;

  const setOptions = (next: string[]) => onChange({ ...draft, options: { ...draft.options, [selected]: next } });
  const validateValue = (value: string, excluding?: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Tên danh mục không được để trống.';
    if (values.some(option => option !== excluding && option.trim().toLocaleLowerCase('vi') === trimmed.toLocaleLowerCase('vi'))) return 'Tên này đã có trong danh mục.';
    return '';
  };
  const addValue = () => {
    const message = validateValue(form.newValue);
    if (message) { setError(message); return; }
    setOptions([...values, form.newValue.trim()]);
    discardForm();
  };
  const startRename = (value: string) => { if(pending){setError('Hãy hoàn tất hoặc hủy phần đang nhập trước khi đổi mục khác.');return;} if(usageCount(value)>0){setError('Mục này đang dùng trong dữ liệu. Đổi tên cần đối chiếu và thay giá trị nguồn; bản hiện tại không tự sửa Sheets.');return;} setForm({ selected,newValue: '', renaming: value, renameValue: value }); setError(''); };
  const saveRename = (oldValue: string) => {
    if(usageCount(oldValue)>0){setError('Mục này đã được dùng; chưa đổi tên để tránh tách quan hệ với dữ liệu nguồn.');return;}
    const nextValue = form.renameValue.trim();
    const message = validateValue(nextValue, oldValue);
    if (message) { setError(message); return; }
    const options = values.map(value => value === oldValue ? nextValue : value);
    const specialistRooms = selected === 'specialist'
      ? Object.fromEntries(Object.entries(draft.specialistRooms).map(([name, rooms]) => [name === oldValue ? nextValue : name, rooms]))
      : selected === 'room'
        ? Object.fromEntries(Object.entries(draft.specialistRooms).map(([name, rooms]) => [name, rooms.map(room => room === oldValue ? nextValue : room)]))
        : draft.specialistRooms;
    onChange({ ...draft, options: { ...draft.options, [selected]: options }, specialistRooms });
    if (selected === 'specialist' && selectedSpecialist === oldValue) setSelectedSpecialist(nextValue);
    discardForm();
  };
  const removeValue = (value: string) => {
    if (usageCount(value) > 0) { setError(`Không thể xóa “${value}” vì đang được dùng trong ${usageCount(value)} nội dung.`); return; }
    if (selected === 'room' && Object.values(draft.specialistRooms).some(rooms => rooms.includes(value))) {
      setError(`Không thể xóa “${value}” vì đang được liên kết với chuyên viên.`); return;
    }
    const specialistRooms = selected === 'specialist'
      ? Object.fromEntries(Object.entries(draft.specialistRooms).filter(([name]) => name !== value))
      : draft.specialistRooms;
    onChange({ ...draft, options: { ...draft.options, [selected]: values.filter(option => option !== value) }, specialistRooms });
    setError('');
  };
  const moveValue = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values]; [next[index], next[target]] = [next[target], next[index]]; setOptions(next);
  };
  const updateRooms = (specialist: string, room: string, checked: boolean) => {
    const current = draft.specialistRooms[specialist] ?? [];
    const rooms = checked ? [...current, room] : current.filter(value => value !== room);
    onChange({ ...draft, specialistRooms: { ...draft.specialistRooms, [specialist]: rooms } });
  };

  return <section className="card" aria-labelledby="catalog-panel-heading">
    <div className="card-header"><div>
      <h3 id="catalog-panel-heading">Danh mục và quan hệ chuyên viên – phòng</h3>
      <p className="muted">Phần đang sửa được giữ trên máy, chưa lưu. Bấm Lưu danh mục để lưu riêng lên Google Sheets; dữ liệu Excel không đổi. Giá trị trong nội dung hiện có không tự đổi tên hay phân công lại.</p>
    </div></div>
    <div className="settings-grid">
      <label className="field">Danh mục
        <select value={selected} disabled={pending} onChange={event => { setSelected(event.target.value as CatalogKey); setQuery(''); setError(''); }}>
          {catalogLabels.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </label>
      <div className="top-actions">
        <label className="field search-field">Tìm trong danh mục<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nhập để lọc" /></label>
        <label className="field">Thêm giá trị<input value={form.newValue} maxLength={200} disabled={form.renaming !== null} onChange={event => setForm({ ...form, newValue: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addValue(); } }} placeholder="Tên mới" /></label>
        <button type="button" className="button primary" onClick={addValue} disabled={form.renaming !== null}>Thêm</button>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <p className="muted" role="status">{config.label}: {values.length} giá trị · số nội dung đang dùng được hiển thị bên cạnh từng giá trị.</p>
      {visibleValues.length === 0 ? <p className="muted">Không có giá trị khớp tìm kiếm.</p> : <ol className="column-order-list">
        {visibleValues.map(value => {
          const index = values.indexOf(value);
          const count = usageCount(value);
          return <li key={value}>
            {form.renaming === value ? <>
              <label className="field"><span className="sr-only">Tên mới cho {value}</span><input autoFocus maxLength={200} value={form.renameValue} onChange={event => setForm({ ...form, renameValue: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') saveRename(value); if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); discardForm(); } }} /></label>
              <span className="top-actions"><button type="button" className="button primary" onClick={() => saveRename(value)}>Lưu tên</button><button type="button" className="button ghost" onClick={discardForm}>Hủy</button></span>
            </> : <>
              <span>{value} <small className="muted">({count} nội dung)</small></span>
              <span className="top-actions">
                <button type="button" className="button ghost" aria-label={`Đưa ${value} lên`} onClick={() => moveValue(index, -1)} disabled={index === 0}>Lên</button>
                <button type="button" className="button ghost" aria-label={`Đưa ${value} xuống`} onClick={() => moveValue(index, 1)} disabled={index === values.length - 1}>Xuống</button>
                <button type="button" className="button ghost" onClick={() => startRename(value)}>Đổi tên</button>
                <button type="button" className="button danger" onClick={() => removeValue(value)}>Xóa</button>
              </span>
            </>}
          </li>;
        })}
      </ol>}
      <fieldset className="advanced-settings"><legend>Chuyên viên thuộc phòng</legend>
        <label className="field">Chuyên viên<select value={selectedSpecialist} onChange={event => setSelectedSpecialist(event.target.value)}>
          <option value="">Chọn chuyên viên</option>{draft.options.specialist.map(specialist => <option key={specialist} value={specialist}>{specialist}</option>)}
        </select></label>
        {selectedSpecialist ? <div className="column-choices">
          {draft.options.room.map(room => <label key={room}><input type="checkbox" checked={(draft.specialistRooms[selectedSpecialist] ?? []).includes(room)} onChange={event => updateRooms(selectedSpecialist, room, event.target.checked)} />{selectedSpecialist} thuộc phòng {room}</label>)}
          {draft.options.room.length === 0 && <p className="muted">Thêm phòng chuyên viên vào danh mục Phòng chuyên viên trước.</p>}
        </div> : <p className="muted">Chọn chuyên viên để gán một hoặc nhiều phòng. Quan hệ này không tự phân công nội dung.</p>}
      </fieldset>
    </div>
  </section>;
}


