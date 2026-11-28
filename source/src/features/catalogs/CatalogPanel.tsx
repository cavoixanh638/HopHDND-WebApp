import {excelStatusLabel} from '../../domain/status-contract';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Item,GroupField } from '../../../shared/types';
import {REPORT_GROUP_FIELDS} from '../../domain/report-reference-identity';
import { normalizeSearch } from '../../domain/search';
import {g05ApplyCatalogAction,g05LockedCatalog,g05UsageCount} from '../items/inline-g05-catalog-logic';
import './inline-g05-catalog-panel.css';
import { CATALOG_KEYS, type CatalogConfig, type CatalogKey } from '../../data/catalogs';
import {EXCEL_SOURCE_COLUMNS} from '../../data/item-preferences';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';

const catalogLabels: {key: CatalogKey; label: string; field: keyof Item}[] =
  CATALOG_KEYS.map(key=>({
    key,field:key,
    label:EXCEL_SOURCE_COLUMNS.find(column=>column.key===key)?.label??key,
  }));

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
  columnLabels?:Record<string,string>;
  initialField?:CatalogKey;
};

export function CatalogPanel({ draft, onChange, items, sourceKey, onPendingChange, registerPending, registerDiscard,columnLabels,initialField }: CatalogPanelProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [selectedSpecialist, setSelectedSpecialist] = useState('');
  const { draft: form, setDraft: setForm, clearCheckpoint } = useRecoverableDraft<FormDraft>(`catalog-form:${sourceKey}`, blankForm(initialField??'department'), validateForm, current=>current.newValue.trim()!==''||(current.renaming!==null&&current.renameValue!==current.renaming));
  const selected=form.selected;
  const setSelected=(next:CatalogKey)=>setForm(previous=>({...previous,selected:next}));
  const pending = form.newValue.trim() !== '' || (form.renaming !== null && form.renameValue !== form.renaming);
  useEffect(()=>{if(initialField&&!pending&&form.selected!==initialField)setSelected(initialField);},[initialField]);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const discardForm = useCallback(() => { setForm(blankForm(selected)); clearCheckpoint(); setError(''); }, [selected,setForm, clearCheckpoint]);

  useEffect(() => { onPendingChange(pending); }, [onPendingChange, pending]);
  useEffect(() => { registerPending(() => pendingRef.current); }, [registerPending]);
  useEffect(() => { registerDiscard(discardForm); }, [discardForm, registerDiscard]);

  const config = catalogLabels.find(entry => entry.key === selected)!;
  const selectedLabel=columnLabels?.[selected]??config.label;
  const values = draft.options[selected] ?? [];
  const visibleValues = useMemo(() => values.filter(value => normalizeSearch(value+' '+excelStatusLabel(selected,value)).includes(normalizeSearch(query))), [values, query,selected]);
  const usageCount = (value: string) => g05UsageCount(items,selected,value);
  const locked=g05LockedCatalog(selected);

  const groupField=REPORT_GROUP_FIELDS.includes(selected as GroupField)?selected as GroupField:null;
  const mutate=(action:Parameters<typeof g05ApplyCatalogAction>[3])=>{
    try{
      onChange(g05ApplyCatalogAction(draft,items,selected,action));
      setError('');
      return true;
    }catch(cause){
      setError(cause instanceof Error?cause.message:'Không cập nhật được danh mục.');
      return false;
    }
  };
  const addValue=()=>{
    if(mutate({type:'add',value:form.newValue}))discardForm();
  };
  const startRename=(value:string)=>{
    if(locked){setError('Danh mục trạng thái chuẩn được khóa.');return;}
    if(pending){setError('Hãy hoàn tất hoặc hủy phần đang nhập trước.');return;}
    if(usageCount(value)>0){setError('Mục đang có dữ liệu nguồn; không thể đổi tên.');return;}
    setForm({selected,newValue:'',renaming:value,renameValue:value});setError('');
  };
  const saveRename=(oldValue:string)=>{
    if(mutate({type:'rename',previous:oldValue,value:form.renameValue}))discardForm();
  };
  const removeValue=(value:string)=>{
    mutate({type:'remove',value});
  };
  const moveValue=(index:number,direction:-1|1)=>{
    if(index+direction>=0&&index+direction<values.length)
      mutate({type:'move',value:values[index],to:index+direction});
  };
  const updateRooms = (specialist: string, room: string, checked: boolean) => {
    const current = draft.specialistRooms[specialist] ?? [];
    const rooms = checked ? [...current, room] : current.filter(value => value !== room);
    onChange({ ...draft, specialistRooms: { ...draft.specialistRooms, [specialist]: rooms } });
  };

  return <section className="card inline-g05-catalog-panel" aria-labelledby="catalog-panel-heading">
    <div className="card-header"><div>
      <h3 id="catalog-panel-heading">Giá trị danh sách chọn theo cột</h3>
      <p className="muted">Chọn một cột nguồn Excel để thêm, sửa, xóa hoặc sắp xếp các lựa chọn. Danh sách này được dùng trực tiếp tại bảng. Giá trị hiện có trong Excel không tự thay đổi.</p>
    </div></div>
    <div className="settings-grid">
      <label className="field">Cột dùng danh sách chọn
        <select value={selected} disabled={pending} onChange={event => { setSelected(event.target.value as CatalogKey); setQuery(''); setError(''); }}>
          {catalogLabels.map(option => <option key={option.key} value={option.key}>{columnLabels?.[option.key]??option.label}</option>)}
        </select>
      </label>
      <div className="top-actions inline-g05-catalog-toolbar">
        <label className="field search-field">Tìm trong danh mục<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nhập để lọc" /></label>
        <label className="field">Thêm giá trị<input value={form.newValue} maxLength={200} disabled={locked||form.renaming !== null} onChange={event => setForm({ ...form, newValue: event.target.value })} onKeyDown={event => { if (event.key === 'Enter'&&!event.nativeEvent?.isComposing&&event.keyCode!==229) { event.preventDefault(); addValue(); } }} placeholder="Tên mới" /></label>
        <button type="button" className="button primary" onClick={addValue} disabled={locked||form.renaming !== null}>Thêm</button>
      </div>
      {locked&&<p className="muted" role="status">Các giá trị trạng thái nghiệp vụ là danh sách chuẩn được mã nguồn khóa, chỉ xem và tìm kiếm.</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <p className="muted" role="status">{selectedLabel}: {values.length} giá trị · số nội dung đang dùng được hiển thị bên cạnh từng giá trị.</p>
      {groupField&&<p className="muted">ID nhóm báo cáo không phụ thuộc hồ sơ. Nếu nguồn đã đổi tên, chọn Đổi tên ở nhãn cũ (sau khi không còn hồ sơ mang nhãn cũ), nhập nhãn mới và Lưu danh mục chung để giữ ID. Không tự đoán hai nhóm là một.</p>}
      {visibleValues.length === 0 ? <p className="muted">Không có giá trị khớp tìm kiếm.</p> : <ol className="column-order-list inline-g05-catalog-list">
        {visibleValues.map(value => {
          const index = values.indexOf(value);
          const count = usageCount(value);
          return <li key={value}>
            {form.renaming === value ? <>
              <label className="field"><span className="sr-only">Tên mới cho {value}</span><input autoFocus maxLength={200} value={form.renameValue} onChange={event => setForm({ ...form, renameValue: event.target.value })} onKeyDown={event => { if(event.nativeEvent?.isComposing||event.keyCode===229)return; if (event.key === 'Enter') {event.preventDefault();saveRename(value);} if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); discardForm(); } }} /></label>
              <span className="top-actions"><button type="button" className="button primary" onClick={() => saveRename(value)}>Lưu tên</button><button type="button" className="button ghost" onClick={discardForm}>Hủy</button></span>
            </> : <>
              <span>{excelStatusLabel(selected,value)} <small className="muted">({count} nội dung)</small></span>
              <span className="top-actions">
                <button type="button" className="button ghost" aria-label={`Đưa ${value} lên`} onClick={() => moveValue(index, -1)} disabled={locked||index === 0}>Lên</button>
                <button type="button" className="button ghost" aria-label={`Đưa ${value} xuống`} onClick={() => moveValue(index, 1)} disabled={locked||index === values.length - 1}>Xuống</button>
                <button type="button" className="button ghost" disabled={locked||count>0} onClick={() => startRename(value)}>Đổi tên</button>
                <button type="button" className="button danger" disabled={locked||count>0||(selected==='room'&&Object.values(draft.specialistRooms).some(rooms=>rooms.includes(value)))||(selected==='specialist'&&(draft.specialistRooms[value]?.length??0)>0)} onClick={() => removeValue(value)}>Xóa</button>
              </span>
            </>}
          </li>;
        })}
      </ol>}
      <details className="catalog-relationship"><summary>Liên kết chuyên viên – phòng · Thiết lập nâng cao</summary><fieldset className="advanced-settings"><legend>Chuyên viên thuộc phòng</legend>
        <label className="field">Chuyên viên<select value={selectedSpecialist} onChange={event => setSelectedSpecialist(event.target.value)}>
          <option value="">Chọn chuyên viên</option>{draft.options.specialist.map(specialist => <option key={specialist} value={specialist}>{specialist}</option>)}
        </select></label>
        {selectedSpecialist ? <div className="column-choices">
          {draft.options.room.map(room => <label key={room}><input type="checkbox" checked={(draft.specialistRooms[selectedSpecialist] ?? []).includes(room)} onChange={event => updateRooms(selectedSpecialist, room, event.target.checked)} />{selectedSpecialist} thuộc phòng {room}</label>)}
          {draft.options.room.length === 0 && <p className="muted">Thêm phòng chuyên viên vào danh mục Phòng chuyên viên trước.</p>}
        </div> : <p className="muted">Chọn chuyên viên để gán một hoặc nhiều phòng. Quan hệ này không tự phân công nội dung.</p>}
      </fieldset></details>
    </div>
  </section>;
}


