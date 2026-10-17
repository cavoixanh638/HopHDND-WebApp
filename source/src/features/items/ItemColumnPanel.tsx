import {useEffect,useRef,useState} from 'react';
import type {Item} from '../../../shared/types';
import type {CellPermissions} from '../../data/firebase-repository';
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
  onSaveCatalog?:(next:CatalogConfig)=>Promise<void>;
  onSavePermissions?:(next:CellPermissions,expected:CellPermissions)=>Promise<void>;
  onDirtyChange?:(dirty:boolean)=>void;
  validationMessage?:string;
};

/** Compact column manager inspired by database-table field panels:
 * one row per field, advanced properties only for the selected field.
 * Width changes are made exclusively by dragging the column border in-table.
 */
export function ItemColumnPanel({layout,catalog,items=[],permissions,onChange,onSaveCatalog,onSavePermissions,onDirtyChange,validationMessage}:Props){
  const [selected,setSelected]=useState<string|null>(null);
  const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
  const [selectedSpecialist,setSelectedSpecialist]=useState('');
  const copyCatalog=(value:CatalogConfig):CatalogConfig=>({
    options:Object.fromEntries(Object.entries(value.options).map(([key,options])=>[key,[...options]])) as CatalogConfig['options'],
    specialistRooms:Object.fromEntries(Object.entries(value.specialistRooms).map(([key,rooms])=>[key,[...rooms]]))
  });
  const savedCatalog=useRef<CatalogConfig>(copyCatalog(catalog??catalogFromItems(items)));
  const [choiceDraft,setChoiceDraft]=useState<CatalogConfig>(()=>copyCatalog(savedCatalog.current));
  const catalogDirty=JSON.stringify(choiceDraft)!==JSON.stringify(savedCatalog.current);
  const savedPermissions=useRef<CellPermissions>({
    columns:{...(permissions?.columns??{})},
    rows:{...(permissions?.rows??{})},cells:{...(permissions?.cells??{})}
  });
  const [columnRights,setColumnRights]=useState({...savedPermissions.current.columns});
  const [clearExceptions,setClearExceptions]=useState(false);
  const exceptions=Object.keys(savedPermissions.current.rows??{}).length+
    Object.values(savedPermissions.current.cells??{}).reduce((sum,cells)=>sum+Object.keys(cells).length,0);
  const rightsDraft:CellPermissions={columns:columnRights,rows:{},cells:{}};
  const rightsDirty=!!onSavePermissions&&(
    !samePermissions({columns:columnRights},{columns:savedPermissions.current.columns})||
    (clearExceptions&&exceptions>0)
  );
  const [saveError,setSaveError]=useState('');
  const [savingChoices,setSavingChoices]=useState(false);
  const [savingRights,setSavingRights]=useState(false);
  useEffect(()=>{onDirtyChange?.(catalogDirty||rightsDirty);},[catalogDirty,rightsDirty,onDirtyChange]);
  const saveChoices=async()=>{
    if(!onSaveCatalog||!catalogDirty||savingChoices)return;
    setSavingChoices(true);setSaveError('');
    try{
      const valid=validateCatalog(choiceDraft);
      await onSaveCatalog(valid);
      savedCatalog.current=copyCatalog(valid);
      setChoiceDraft(copyCatalog(valid));
    }catch(cause){setSaveError(cause instanceof Error?cause.message:'Chưa lưu được danh sách lựa chọn.');}
    finally{setSavingChoices(false);}
  };
  const saveRights=async()=>{
    if(!onSavePermissions||!rightsDirty||savingRights)return;
    if(exceptions&&!clearExceptions){
      setSaveError('Đang có quyền riêng theo dòng/ô. Xác nhận bỏ các ngoại lệ cũ để chỉ dùng quyền theo cột trước khi lưu.');
      return;
    }
    setSavingRights(true);setSaveError('');
    try{
      await onSavePermissions(rightsDraft,savedPermissions.current);
      savedPermissions.current={columns:{...columnRights},rows:{},cells:{}};
      setClearExceptions(false);
    }catch(cause){setSaveError(cause instanceof Error?cause.message:'Chưa lưu được quyền chỉnh sửa.');}
    finally{setSavingRights(false);}
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
  return <details className="card item-column-panel column-manager">
    <summary>Quản lý cột <span className="column-count">{active.length} cột · tên, kiểu dữ liệu, dropdown, quyền sửa</span></summary>
    <div className="column-manager-body">
      {validationMessage&&<div className="layout-inline-error" role="alert">
        <strong>Chưa lưu được:</strong> {validationMessage}
      </div>}
      {saveError&&<p className="error-text" role="alert">{saveError}</p>}
      <div className="column-manager-savebar">
        <strong>Thiết lập ngay tại từng cột</strong>
        <span className="muted">Bố cục, danh sách chọn và quyền được lưu riêng; nội dung Excel không thay đổi.</span>
        {onSaveCatalog&&<button type="button" className="button primary" disabled={!catalogDirty||savingChoices}
          onClick={()=>void saveChoices()}>{savingChoices?'Đang lưu…':'Lưu danh sách chọn'}</button>}
        {onSavePermissions&&<button type="button" className="button primary" disabled={!rightsDirty||savingRights}
          onClick={()=>void saveRights()}>{savingRights?'Đang lưu…':'Lưu quyền cột'}</button>}
      </div>
      {onSavePermissions&&exceptions>0&&<label className="column-rights-warning">
        <input type="checkbox" checked={clearExceptions} onChange={e=>setClearExceptions(e.currentTarget.checked)}/>
        Bỏ {exceptions} quyền riêng theo dòng/ô đã lưu trước đây khi lưu quyền cột. Nếu chưa xác nhận, các quyền riêng cũ vẫn được giữ.
      </label>}
      <div className="column-manager-toolbar">
        <span className="muted">{active.filter(c=>c.visible).length}/{active.length} cột đang hiển thị. Kéo cạnh tiêu đề trên bảng để đổi độ rộng.</span>
        <button type="button" className="button ghost" disabled={active.every(c=>c.visible)}
          onClick={()=>onChange({...layout,columns:layout.columns.map(c=>c.removed?c:{...c,visible:true})})}>Hiện tất cả</button>
        <button type="button" className="button" disabled={customCount>=20} onClick={add}>+ Thêm cột</button>
      </div>
      <div className="column-manager-legend"><span>Hiện</span><span>Tên cột</span><span>Kiểu nhập</span><span>Cho sửa</span></div>
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
            {(column.kind??(column.origin==='custom'?'text':editableSourceKeys.has(column.key as never)&&column.key!=='content'&&column.key!=='note'?'select':'text'))==='select'&&
              (column.origin==='custom'||CATALOG_KEYS.includes(column.key as CatalogKey))&&
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
                {column.origin!=='custom'&&<p className="muted">Giá trị cột Excel được lưu ở danh mục chung; bấm “Lưu danh sách chọn” phía trên để áp dụng.</p>}
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
                :'Cột này không hỗ trợ cấp quyền nhập liệu cho khách. Cột tự tạo hiện do quản trị chỉnh và lưu trong cấu hình.'}
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
  </details>;
}
