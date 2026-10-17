import {useState} from 'react';
import type {ItemColumn,ItemLayout} from '../../data/item-preferences';
import {EXCEL_COLUMN_KEYS} from '../../data/item-preferences';
import {TEXT_FIELDS} from '../../../shared/field-definitions';
const editableSourceKeys=new Set(TEXT_FIELDS.map(f=>f.key));
import {DeferredWidthInput} from './DeferredWidthInput';

type Props={layout:ItemLayout;onChange:(next:ItemLayout)=>void;validationMessage?:string};

/** Compact column manager inspired by database-table field panels:
 * one row per field, advanced properties only for the selected field.
 * Width changes are made exclusively by dragging the column border in-table.
 */
export function ItemColumnPanel({layout,onChange,validationMessage}:Props){
  const [selected,setSelected]=useState<string|null>(null);
  const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
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
    <summary>Quản lý cột <span className="column-count">{active.length} cột · tùy chỉnh tên, kiểu nhập và thứ tự</span></summary>
    <div className="column-manager-body">
      {validationMessage&&<div className="layout-inline-error" role="alert">
        <strong>Chưa lưu được:</strong> {validationMessage}
      </div>}
      <div className="column-manager-toolbar">
        <span className="muted">{active.filter(c=>c.visible).length}/{active.length} cột đang hiển thị. Kéo cạnh tiêu đề trên bảng để đổi độ rộng.</span>
        <button type="button" className="button ghost" disabled={active.every(c=>c.visible)}
          onClick={()=>onChange({...layout,columns:layout.columns.map(c=>c.removed?c:{...c,visible:true})})}>Hiện tất cả</button>
        <button type="button" className="button" disabled={customCount>=20} onClick={add}>+ Thêm cột</button>
      </div>
      <div className="column-manager-grid" aria-label="Danh sách cột và kiểu dữ liệu">
        {active.map((column,index)=><div key={column.key} className={'column-manager-row'+(selected===column.key?' selected':'')}>
          <label className="column-manager-check"><input type="checkbox" checked={column.visible}
            aria-label={`Hiện cột ${column.label}`} onChange={e=>update(column.key,{visible:e.currentTarget.checked})}/></label>
          <span className="column-manager-label" title={column.label}>{column.label}</span>
          <span className="column-manager-type">{(column.kind??(column.origin==='custom'?'text':editableSourceKeys.has(column.key as never)&&column.key!=='content'&&column.key!=='note'?'select':'text'))==='select'?'Danh sách chọn':'Nhập tự do'}</span>
          <span className="column-manager-origin">{column.origin==='custom'?'Tự tạo':EXCEL_COLUMN_KEYS.includes(column.key)?'Excel':''}</span>
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
                disabled={column.origin!=='custom'&&!editableSourceKeys.has(column.key as never)}
                value={column.kind??(column.origin==='custom'?'text':editableSourceKeys.has(column.key as never)&&column.key!=='content'&&column.key!=='note'?'select':'text')}
                onChange={e=>update(column.key,{kind:e.currentTarget.value as 'text'|'select'})}>
                <option value="text">Nhập văn bản tự do</option><option value="select">Danh sách chọn</option>
              </select>
            </label>
            {(column.kind??(column.origin==='custom'?'text':editableSourceKeys.has(column.key as never)&&column.key!=='content'&&column.key!=='note'?'select':'text'))==='select'&&<label className="field column-manager-options">Các lựa chọn (mỗi dòng một giá trị)
              <textarea aria-label={`Các lựa chọn cột ${column.key}`} key={column.key+column.kind}
                rows={4} defaultValue={(column.options??[]).join('\n')}
                onBlur={e=>update(column.key,{kind:'select',options:[...new Set(e.currentTarget.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))].slice(0,50)})}/>
            </label>}
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
            {column.origin!=='custom'&&<p className="muted">Cột nguồn Excel: đổi tên chỉ ảnh hưởng cách hiển thị. Giá trị gốc vẫn đọc từ Excel.</p>}
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
