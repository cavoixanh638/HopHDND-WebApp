import {useEffect,useRef,useState} from 'react';
import type {Item} from '../../../shared/types';
import type {CellPermissions} from '../../data/firebase-repository';
import {EXCEL_SOURCE_COLUMNS} from '../../data/item-preferences';
import {samePermissions} from '../../data/firebase-repository';
import {validateCatalog,catalogFromItems} from '../../data/catalogs';
import {ColumnChoiceEditor} from './ColumnChoiceEditor';
import type {ItemColumn,ItemLayout} from '../../data/item-preferences';
import {EXCEL_COLUMN_KEYS} from '../../data/item-preferences';
import {TEXT_FIELDS} from '../../../shared/field-definitions';
import {CATALOG_KEYS,type CatalogConfig,type CatalogKey} from '../../data/catalogs';
const editableSourceKeys=new Set(TEXT_FIELDS.map(f=>f.key));
import {DeferredWidthInput} from './DeferredWidthInput';

type Props={
  layout:ItemLayout;catalog?:CatalogConfig;items?:Item[];permissions?:CellPermissions;
  onChange:(next:ItemLayout)=>void;
  layoutDirty?:boolean;onSaveLayout?:()=>Promise<void>;
  onSaveCatalog?:(next:CatalogConfig)=>Promise<void>;
  onSavePermissions?:(next:CellPermissions,expected:CellPermissions)=>Promise<void>;
  onDirtyChange?:(dirty:boolean)=>void;
  validationMessage?:string;
};

/** Compact column manager inspired by database-table field panels:
 * one row per field, advanced properties only for the selected field.
 * Width changes are made exclusively by dragging the column border in-table.
 */
export function ItemColumnPanel({layout,catalog,items=[],permissions,onChange,layoutDirty=false,onSaveLayout,onSaveCatalog,onSavePermissions,onDirtyChange,validationMessage}:Props){
  const [selected,setSelected]=useState<string|null>(null);
  const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
  const [selectedSpecialist,setSelectedSpecialist]=useState('');
  const copyCatalog=(value:CatalogConfig):CatalogConfig=>({
    options:Object.fromEntries(Object.entries(value.options).map(([key,options])=>[key,[...options]])) as CatalogConfig['options'],
    specialistRooms:Object.fromEntries(Object.entries(value.specialistRooms).map(([key,rooms])=>[key,[...rooms]]))
  });
  const savedCatalog=useRef<CatalogConfig>(copyCatalog(catalog??catalogFromItems(items)));
  const [choiceDraft,setChoiceDraft]=useState<CatalogConfig>(()=>copyCatalog(savedCatalog.current));
  // Do not overwrite a successful local save with an older profile prop while
  // its Firebase listener notification is still in flight.
  const awaitingCatalogEcho=useRef<string|null>(null);
  const catalogDirty=JSON.stringify(choiceDraft)!==JSON.stringify(savedCatalog.current);
  const savedPermissions=useRef<CellPermissions>({
    columns:{...(permissions?.columns??{})},
    rows:{...(permissions?.rows??{})},cells:{...(permissions?.cells??{})}
  });
  const [columnRights,setColumnRights]=useState({...savedPermissions.current.columns});
  const awaitingPermissionsEcho=useRef<string|null>(null);
  const [clearExceptions,setClearExceptions]=useState(false);
  const exceptions=Object.keys(savedPermissions.current.rows??{}).length+
    Object.values(savedPermissions.current.cells??{}).reduce((sum,cells)=>sum+Object.keys(cells).length,0);
  const rightsDraft:CellPermissions={columns:columnRights,rows:{},cells:{}};
  const rightsDirty=!!onSavePermissions&&(
    !samePermissions({columns:columnRights},{columns:savedPermissions.current.columns})||
    (clearExceptions&&exceptions>0)
  );
  const [saveError,setSaveError]=useState('');
  useEffect(()=>{
    if(!catalog||saving)return;
    const incoming=JSON.stringify(catalog);
    const confirmed=JSON.stringify(savedCatalog.current);
    if(awaitingCatalogEcho.current){
      if(incoming===awaitingCatalogEcho.current)awaitingCatalogEcho.current=null;
      return;
    }
    if(incoming!==confirmed&&!catalogDirty){
      savedCatalog.current=copyCatalog(catalog);
      setChoiceDraft(copyCatalog(catalog));
    }
  },[catalog]);
  useEffect(()=>{
    if(!permissions||saving)return;
    const incoming=JSON.stringify(permissions);
    const confirmed=JSON.stringify(savedPermissions.current);
    if(awaitingPermissionsEcho.current){
      if(incoming===awaitingPermissionsEcho.current)awaitingPermissionsEcho.current=null;
      return;
    }
    if(incoming!==confirmed&&
      samePermissions({columns:columnRights},{columns:savedPermissions.current.columns})){
      savedPermissions.current={columns:{...permissions.columns},
        rows:{...(permissions.rows??{})},cells:{...(permissions.cells??{})}};
      setColumnRights({...permissions.columns});
    }
  },[permissions]);

  const [saveSuccess,setSaveSuccess]=useState('');
  const [saving,setSaving]=useState(false);
  useEffect(()=>{onDirtyChange?.(catalogDirty||rightsDirty);},[catalogDirty,rightsDirty,onDirtyChange]);
  const canSave=layoutDirty||catalogDirty||rightsDirty;
  const saveAll=async()=>{
    if(!canSave||saving)return;
    if(rightsDirty&&exceptions&&!clearExceptions){
      setSaveError('Quyền riêng theo dòng/ô còn tồn tại. Tick xác nhận bỏ các ngoại lệ cũ rồi lưu lại.');
      return;
    }
    setSaving(true);setSaveError('');setSaveSuccess('');
    const completed:string[]=[];
    let currentPart='danh sách chọn';
    try{
      // Only changed parts are written. Each successful Firebase section is
      // acknowledged independently; the remaining local drafts are retained.
      if(catalogDirty){
        currentPart='danh sách chọn';
        if(!onSaveCatalog)throw new Error('Chưa kết nối nơi lưu danh sách chọn.');
        const next=validateCatalog(choiceDraft);
        await onSaveCatalog(next);
        savedCatalog.current=copyCatalog(next);
        awaitingCatalogEcho.current=JSON.stringify(next);
        setChoiceDraft(copyCatalog(next));
        completed.push(currentPart);
      }
      if(rightsDirty){
        currentPart='quyền chỉnh sửa cột';
        if(!onSavePermissions)throw new Error('Chưa kết nối nơi lưu quyền cột.');
        await onSavePermissions(rightsDraft,savedPermissions.current);
        savedPermissions.current={columns:{...columnRights},rows:{},cells:{}};
        awaitingPermissionsEcho.current=JSON.stringify(savedPermissions.current);
        setClearExceptions(false);
        completed.push(currentPart);
      }
      if(layoutDirty){
        currentPart='bố cục và độ rộng cột';
        if(!onSaveLayout)throw new Error('Chưa kết nối nơi lưu bố cục.');
        await onSaveLayout();
        completed.push(currentPart);
      }
      if(completed.length)setSaveSuccess('Đã lưu '+completed.join(', ')+'.');
    }catch(cause){
      const reason=cause instanceof Error?cause.message:'Không lưu được. Vui lòng thử lại.';
      setSaveError('Chưa lưu được '+currentPart+': '+reason+
        (completed.length?' Đã lưu thành công: '+completed.join(', ')+'.':'')+
        ' Phần chưa lưu vẫn được giữ để thử lại.');
    }finally{setSaving(false);}
  };
  const updateChoices=(key:CatalogKey,next:string[])=>{
    setChoiceDraft(current=>{
      const specialistRooms={...current.specialistRooms};
      if(key==='specialist')for(const person of Object.keys(specialistRooms))
        if(!next.includes(person))delete specialistRooms[person];
      if(key==='room')for(const person of Object.keys(specialistRooms))
        specialistRooms[person]=specialistRooms[person].filter(room=>next.includes(room));
      return {...current,options:{...current.options,[key]:next},specialistRooms};
    });
  };
  const [highlightWord,setHighlightWord]=useState('');
  const [highlightField,setHighlightField]=useState('*');
  const [highlightTextColor,setHighlightTextColor]=useState('#8a241c');
  const [highlightBgColor,setHighlightBgColor]=useState('#fff1d6');
  const active=layout.columns.filter(c=>!c.removed);
  const customCount=layout.columns.filter(c=>c.origin==='custom').length;
  const update=(key:string,change:Partial<ItemColumn>)=>onChange({
    ...layout,columns:layout.columns.map(c=>c.key===key?{...c,...change}:c),
  });
  const move=(key:string,delta:number)=>{
    const from=layout.columns.findIndex(c=>c.key===key),to=from+delta;
    if(from<0||to<0||to>=layout.columns.length)return;
    const next=[...layout.columns];
    [next[from],next[to]]=[next[to],next[from]];
    onChange({...layout,columns:next});
  };
  const add=()=>{
    if(customCount>=20)return;
    const key='custom_'+crypto.randomUUID().replace(/-/g,'').slice(0,16);
    onChange({...layout,columns:[...layout.columns,{
      key,label:'Cột mới',width:180,visible:true,origin:'custom',
      kind:'text',values:{}
    }]});
    setSelected(key);
  };
  const remove=(key:string)=>{
    const col=layout.columns.find(c=>c.key===key);
    if(!col)return;
    if(confirmDelete!==key){setConfirmDelete(key);return;}
    onChange({...layout,columns:col.origin==='custom'
      ?layout.columns.filter(c=>c.key!==key)
      :layout.columns.map(c=>c.key===key?{...c,removed:true,visible:false}:c)});
    setSelected(null);setConfirmDelete(null);
  };
  return <section className="card item-column-panel column-manager">
    <div className="column-manager-heading"><h3>Quản lý cột</h3><span className="column-count">{active.length} cột · tên, kiểu nhập, danh sách chọn và quyền sửa</span></div>
    <div className="column-manager-body">
      {validationMessage&&<div className="layout-inline-error" role="alert">
        <strong>Chưa lưu được:</strong> {validationMessage}
      </div>}
      {saveError&&<p className="error-text" role="alert">{saveError}</p>}
      <div className="column-manager-savebar" role="group" aria-label="Lưu thiết lập danh sách">
        <div className="column-manager-save-summary"><strong>Thiết lập cột</strong>
          <span className="muted">{canSave?'Có thay đổi chưa lưu':'Không có thay đổi chưa lưu'}</span>
        </div>
        <button type="button" className="button primary column-save-button"
          disabled={!canSave||saving} onClick={()=>void saveAll()}>
          {saving?'Đang lưu…':'Lưu thay đổi'}
        </button>
      </div>
      {saveSuccess&&<p className="column-save-success" role="status">{saveSuccess}</p>}
      {onSavePermissions&&exceptions>0&&<label className="column-rights-warning">
        <input type="checkbox" checked={clearExceptions} onChange={e=>setClearExceptions(e.currentTarget.checked)}/>
        Bỏ {exceptions} quyền riêng theo dòng/ô đã lưu trước đây khi lưu quyền cột. Nếu chưa xác nhận, các quyền riêng cũ vẫn được giữ.
      </label>}
      <details className="cell-highlights-editor">
        <summary>Tô màu chữ/nền ô theo từ khóa ({layout.cellHighlights?.length??0})</summary>
        <p className="muted">Quy tắc chỉ tô ô có chứa từ khóa (không phân biệt hoa/thường và dấu); sử dụng chung trong Bảng dữ liệu và popup. Bấm Lưu thay đổi để áp dụng.</p>
        <div className="cell-highlights-controls">
          <label className="field">Từ khóa<input maxLength={100} value={highlightWord}
            onChange={e=>setHighlightWord(e.currentTarget.value)} placeholder="Ví dụ: Sở chưa trình"/></label>
          <label className="field">Cột<select value={highlightField} onChange={e=>setHighlightField(e.currentTarget.value)}>
            <option value="*">Tất cả cột</option>
            {EXCEL_SOURCE_COLUMNS.map(col=><option key={col.key} value={col.key}>{col.label}</option>)}
          </select></label>
          <label className="field">Màu chữ<input type="color" aria-label="Màu chữ ô khớp từ khóa"
            value={highlightTextColor} onChange={e=>setHighlightTextColor(e.currentTarget.value)}/></label>
          <label className="field">Màu nền ô<input type="color" aria-label="Màu nền ô khớp từ khóa"
            value={highlightBgColor} onChange={e=>setHighlightBgColor(e.currentTarget.value)}/></label>
          <button className="button" type="button" disabled={!highlightWord.trim()||(layout.cellHighlights?.length??0)>=30}
            onClick={()=>{onChange({...layout,cellHighlights:[...(layout.cellHighlights??[]),{
              id:crypto.randomUUID(),word:highlightWord.trim(),field:highlightField,
              textColor:highlightTextColor,backgroundColor:highlightBgColor}]});setHighlightWord('');}}>
            + Thêm quy tắc
          </button>
        </div>
        {(layout.cellHighlights??[]).map(rule=><div className="cell-highlight-rule" key={rule.id}>
          <span style={{color:rule.textColor,backgroundColor:rule.backgroundColor,padding:'4px 8px',borderRadius:5}}>
            {rule.word}</span>
          <small>{rule.field==='*'?'Tất cả cột':layout.columns.find(col=>col.key===rule.field)?.label??rule.field}</small>
          <button type="button" className="button ghost" aria-label={'Xóa quy tắc '+rule.word}
            onClick={()=>onChange({...layout,cellHighlights:layout.cellHighlights?.filter(x=>x.id!==rule.id)})}>Xóa</button>
        </div>)}
      </details>
      <div className="column-manager-toolbar">
        <span className="muted">{active.filter(c=>c.visible).length}/{active.length} cột đang hiển thị. Kéo cạnh tiêu đề trên bảng để đổi độ rộng.</span>
        <button type="button" className="button ghost" disabled={active.every(c=>c.visible)}
          onClick={()=>onChange({...layout,columns:layout.columns.map(c=>c.removed?c:{...c,visible:true})})}>Hiện tất cả</button>
        <button type="button" className="button" disabled={customCount>=20} onClick={add}>+ Thêm cột</button>
      </div>
      <div className="column-manager-legend"><span>Hiện</span><span>Tên cột</span><span>Kiểu nhập</span><span>Cho sửa</span><span>Thao tác</span></div>
      <div className="column-manager-grid" aria-label="Danh sách cột và kiểu dữ liệu">
        {active.map((column,index)=><div key={column.key} className={'column-manager-row'+(selected===column.key?' selected':'')}>
          <label className="column-manager-check"><input type="checkbox" checked={column.visible}
            aria-label={`Hiện cột ${column.label}`} onChange={e=>update(column.key,{visible:e.currentTarget.checked})}/></label>
          <span className="column-manager-label" title={column.label}>{column.label}</span>
          <span className="column-manager-type">{(column.kind??(column.origin==='custom'?'text':editableSourceKeys.has(column.key as never)&&column.key!=='content'&&column.key!=='note'?'select':'text'))==='select'?'Danh sách chọn':'Nhập tự do'}</span>
          <label className="column-manager-right"><input type="checkbox"
            aria-label={'Cho phép sửa cột '+column.label}
            checked={columnRights[column.key as keyof typeof columnRights]===true}
            disabled={!onSavePermissions||!editableSourceKeys.has(column.key as never)||column.origin==='custom'}
            onChange={e=>setColumnRights(current=>({...current,[column.key]:e.currentTarget.checked}))}
          /></label>
          <button type="button" className="button ghost" aria-expanded={selected===column.key}
            aria-label={`Thiết lập cột ${column.label}`}
            onClick={()=>{setSelected(selected===column.key?null:column.key);setConfirmDelete(null);}}>
            {selected===column.key?'Đóng':'Sửa'}
          </button>
          {selected===column.key&&<div className="column-manager-detail">
            <label className="field">Tên cột<input aria-label={`Tên cột ${column.key}`}
              value={column.label} maxLength={100}
              onChange={e=>update(column.key,{label:e.currentTarget.value,renamed:true})}/></label>
            <label className="field">Kiểu dữ liệu
              <select aria-label={`Kiểu dữ liệu ${column.key}`}
                disabled={column.origin!=='custom'&&!CATALOG_KEYS.includes(column.key as CatalogKey)}
                value={column.kind??(column.origin==='custom'?'text':editableSourceKeys.has(column.key as never)&&column.key!=='content'&&column.key!=='note'?'select':'text')}
                onChange={e=>update(column.key,{kind:e.currentTarget.value as 'text'|'select'})}>
                <option value="text">Nhập văn bản tự do</option><option value="select">Danh sách chọn</option>
              </select>
            </label>
            {(column.origin==='custom'?column.kind==='select':CATALOG_KEYS.includes(column.key as CatalogKey))&&
              <div className="column-manager-options">
                <ColumnChoiceEditor key={column.key} label={column.label}
                  options={column.origin==='custom'?column.options??[]:choiceDraft.options[column.key as CatalogKey]??[]}
                  usedValues={column.origin==='custom'
                    ?Object.values(column.values??{})
                    :items.map(item=>String(item[column.key as CatalogKey]??'')).filter(Boolean)}
                  onChange={(next,previous,replacement)=>{
                    if(column.origin==='custom'){
                      const values=column.values??{};
                      const newValues=previous&&replacement?Object.fromEntries(Object.entries(values).map(([id,value])=>[id,value===previous?replacement:value])):values;
                      update(column.key,{kind:'select',options:next,values:newValues});
                    }else updateChoices(column.key as CatalogKey,next);
                  }}/>
                {column.origin!=='custom'&&<p className="muted">Danh sách chọn của cột này dùng chung cho bảng. Nếu đang để kiểu nhập tự do, chọn “Danh sách chọn” phía trên để áp dụng các lựa chọn.</p>}
              </div>}
            {column.key==='specialist'&&<details className="column-specialist-relations">
              <summary>Liên kết chuyên viên – phòng (nâng cao)</summary>
              <p className="muted">Giữ quan hệ phân công để lọc chuyên viên theo phòng. Thay đổi lưu cùng danh sách chọn.</p>
              <label className="field">Chuyên viên
                <select value={selectedSpecialist} onChange={event=>setSelectedSpecialist(event.currentTarget.value)}>
                  <option value="">Chọn chuyên viên</option>
                  {choiceDraft.options.specialist.map(name=><option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              {selectedSpecialist&&<div className="column-specialist-room-list">
                {choiceDraft.options.room.map(room=><label key={room}>
                  <input type="checkbox" checked={(choiceDraft.specialistRooms[selectedSpecialist]??[]).includes(room)}
                    onChange={event=>{const checked=event.currentTarget.checked;setChoiceDraft(previous=>{
                      const old=previous.specialistRooms[selectedSpecialist]??[];
                      const rooms=checked?[...new Set([...old,room])]:old.filter(value=>value!==room);
                      return {...previous,specialistRooms:{...previous.specialistRooms,[selectedSpecialist]:rooms}};
                    });}}/>
                  {room}
                </label>)}
              </div>}
            </details>}
            <p className="column-manager-rights-hint">
              {editableSourceKeys.has(column.key as never)&&column.origin!=='custom'
                ?'Tick “Cho sửa” ở hàng cột này để cấp quyền chỉnh sửa cho toàn bộ cột.'
                :'ID/STT là mã và vị trí dòng nguồn, không thể cấp quyền sửa cho khách khi chưa có cơ chế ghi Excel có kiểm tra ID trùng và thứ tự. Cột tự tạo do quản trị chỉnh trong cấu hình.'}
            </p>
            <div className="column-manager-detail-actions">
              <button type="button" className="button ghost" disabled={index===0} onClick={()=>move(column.key,-1)}>↑ Lên</button>
              <button type="button" className="button ghost" disabled={index===active.length-1} onClick={()=>move(column.key,1)}>↓ Xuống</button>
              <button type="button" className="button danger" onClick={()=>remove(column.key)}>
                {confirmDelete===column.key?'Xác nhận xóa':'Xóa cột'}
              </button>
              {confirmDelete===column.key&&<span className="muted" role="alert">
                {column.origin==='custom'?'Xóa cột tự tạo sẽ xóa cả giá trị đã lưu trong cột.':'Cột Excel sẽ bị gỡ khỏi bảng, không xóa dữ liệu nguồn.'}
                <button className="button ghost" type="button" onClick={()=>setConfirmDelete(null)}>Hủy</button>
              </span>}
            </div>
            {column.origin!=='custom'&&<p className="muted">Cột nguồn Excel: đổi tên chỉ ảnh hưởng cách hiển thị; giá trị gốc không đổi. Danh sách chọn được chỉnh ngay trong cột này.</p>}
            {column.origin==='custom'&&<p className="muted">Cột độc lập: giá trị được lưu cùng bố cục ứng dụng, không ghi vào Excel. Chỉ quản trị được chỉnh và lưu giá trị ở chế độ sửa.</p>}
          </div>}
        </div>)}
      </div>
      {layout.columns.some(c=>c.removed)&&<details className="column-manager-removed">
        <summary>Cột đã gỡ khỏi bảng ({layout.columns.filter(c=>c.removed).length})</summary>
        {layout.columns.filter(c=>c.removed).map(c=><div key={c.key} className="column-manager-restore">
          <span>{c.label}</span>
          <button type="button" className="button ghost" onClick={()=>update(c.key,{removed:false,visible:true})}>Khôi phục</button>
        </div>)}
      </details>}
      <details className="column-manager-page-width">
        <summary>Chiều rộng trang Danh sách (tùy chọn)</summary>
        <label className="layout-visibility">
          <input type="checkbox" checked={layout.frameWidth==='auto'||layout.frameWidth===undefined}
            onChange={e=>onChange({...layout,frameWidth:e.currentTarget.checked?'auto':1920})}/>
          Tự động theo màn hình
        </label>
        {layout.frameWidth!=='auto'&&layout.frameWidth!==undefined&&
          <DeferredWidthInput label="Chiều rộng trang (px)" value={layout.frameWidth} min={320} max={6000}
            onCommit={width=>onChange({...layout,frameWidth:width})}/>}
      </details>
    </div>
  </section>;
}
