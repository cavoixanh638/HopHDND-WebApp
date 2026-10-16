import {useState} from 'react';
import type {ItemLayout} from '../../data/item-preferences';
import {defaultItemLayout} from '../../data/item-preferences';
import {emptyListFilters,loadListViews,saveListViews,loadActiveListView,saveActiveListView,type ListFilters,type SavedListView,type ColorRule} from '../../data/list-views';

export function ListViewTools({sourceKey,filters,layout,colors,onLoad,onColors,disabled,customizing}:{
  sourceKey:string;filters:ListFilters;layout:ItemLayout;colors:ColorRule[];
  onLoad:(view:SavedListView|null)=>boolean;onColors:(rules:ColorRule[])=>void;
  disabled:boolean;customizing:boolean;
}){
  const [views,setViews]=useState(()=>loadListViews(sourceKey));
  const [selected,setSelected]=useState(()=>loadActiveListView(sourceKey));
  const [name,setName]=useState('');
  const [message,setMessage]=useState('');
  const [field,setField]=useState('progressCouncil');
  const [value,setValue]=useState('');
  const [color,setColor]=useState<ColorRule['color']>('amber');
  const persist=(next:SavedListView[])=>{
    if(!saveListViews(sourceKey,next)){setMessage('Không thể lưu mẫu hoặc đã đạt giới hạn 20 mẫu.');return false;}
    setViews(next);return true;
  };
  const choose=(id:string)=>{
    const view=views.find(v=>v.id===id)??null;
    if(!onLoad(view)){setMessage('Cần lưu hoặc bỏ thay đổi đang sửa trước khi đổi mẫu.');return;}
    setSelected(view?.id??'');saveActiveListView(sourceKey,view?.id??'');setMessage(view?'Đã mở mẫu '+view.name:'Đã mở giao diện chung.');
  };
  const save=()=>{
    if(!name.trim()){setMessage('Nhập tên mẫu trước khi lưu.');return;}
    const view:SavedListView={id:crypto.randomUUID(),name:name.trim().slice(0,60),layout,filters,colors};
    if(persist([...views,view])){setSelected(view.id);saveActiveListView(sourceKey,view.id);setName('');setMessage('Đã lưu mẫu trên trình duyệt này.');}
  };
  const update=()=>{
    if(persist(views.map(v=>v.id===selected?{...v,layout,filters,colors}:v)))setMessage('Đã cập nhật mẫu cá nhân.');
  };
  const remove=()=>{if(persist(views.filter(v=>v.id!==selected)))choose('');};
  return <div className="list-view-box">
    <div className="list-view-toolbar">
      <label className="field">Mẫu giao diện
        <select aria-label="Mẫu giao diện đã lưu" disabled={disabled} value={selected} onChange={e=>choose(e.target.value)}>
          <option value="">Giao diện chung</option>
          {views.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}
        </select>
      </label>
      <label className="field">Tên mẫu mới<input aria-label="Tên mẫu giao diện" maxLength={60} value={name} placeholder="Ví dụ: Phòng tôi" onChange={e=>setName(e.target.value)}/></label>
      <button type="button" className="button" onClick={save} disabled={disabled||views.length>=20}>Lưu mẫu mới</button>
      {selected&&<><button type="button" className="button ghost" onClick={update} disabled={disabled}>Cập nhật mẫu</button><button type="button" className="button ghost" onClick={remove} disabled={disabled}>Xóa mẫu</button></>}
      <span className="muted">Lưu tối đa 20 mẫu cá nhân trên trình duyệt, không thay bố trí chung.</span>
    </div>
    {message&&<p className="muted" role="status">{message}</p>}
    {customizing&&<details className="list-color-editor"><summary>Màu theo điều kiện ({colors.length} quy tắc)</summary>
      <div className="list-view-toolbar">
        <label className="field">Cột<select value={field} onChange={e=>setField(e.target.value)}>{defaultItemLayout().columns.filter(c=>c.key!=='history').map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
        <label className="field">Giá trị bằng<input aria-label="Giá trị kích hoạt màu" value={value} onChange={e=>setValue(e.target.value)} placeholder="Ví dụ: Hoàn thành"/></label>
        <label className="field">Màu<select value={color} onChange={e=>setColor(e.target.value as ColorRule['color'])}><option value="mint">Xanh lá</option><option value="amber">Vàng</option><option value="rose">Đỏ nhạt</option><option value="blue">Xanh dương</option></select></label>
        <button type="button" className="button" disabled={disabled||!value.trim()||colors.length>=30} onClick={()=>{onColors([...colors,{id:crypto.randomUUID(),field,value:value.trim(),color}]);setValue('');}}>Thêm quy tắc</button>
      </div>
      {colors.map(rule=><span className="filter-chip" key={rule.id}><span className={'color-dot color-'+rule.color}/> {layout.columns.find(c=>c.key===rule.field)?.label??rule.field} = {rule.value}<button type="button" className="chip-remove" aria-label={'Xóa quy tắc '+rule.value} onClick={()=>onColors(colors.filter(v=>v.id!==rule.id))}>×</button></span>)}
      <p className="muted">Quy tắc đầu tiên khớp sẽ tô màu dòng; không sửa dữ liệu nguồn.</p>
    </details>}
  </div>;
}
