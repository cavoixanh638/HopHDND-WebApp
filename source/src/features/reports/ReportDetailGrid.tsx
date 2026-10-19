import {useMemo,useState,type ReactNode} from 'react';
import type {Changes,Item,TextField} from '../../../shared/types';
import {TEXT_FIELDS,STATUS_OPTIONS} from '../../../shared/field-definitions';
import type {CatalogConfig} from '../../data/catalogs';
import {EXCEL_SOURCE_COLUMNS,type ItemLayout} from '../../data/item-preferences';
import {loadDetailGridPreferences,saveDetailGridPreferences,defaultDetailGridPreferences,
  type DetailGridPreferences,type DetailColumnKey} from '../../data/report-detail-preferences';
import {normalizeSearch} from '../../domain/search';
import {sortItems,type ColumnSort} from '../../domain/sort-items';
import {displayId} from '../../domain/display-id';
import {Modal} from '../../components/Modal';
import {ColumnResizeHandle} from '../../components/ColumnResizeHandle';
import {ColumnHeader} from '../items/ColumnHeader';
import {ColumnFilterCell,filterValue} from '../items/ColumnFilterCell';
import {CellPicker} from '../items/CellPicker';
import {ContentEditor} from '../items/ContentEditor';
import {reorderByKey} from '../../domain/reorder-columns';
import {assignmentIssue} from '../../data/catalogs';
import {itemColor,validateColorRules,type ColorRule} from '../../data/list-views';
import {loadDetailPresets,saveDetailPresets,loadDetailColors,saveDetailColors,type ReportDetailPreset} from '../../data/report-detail-presets';

type Props={
  title:string; selectedIds:string[];items:Item[];sourceKey:string;
  catalog:CatalogConfig;
  listLayout?:ItemLayout;
  allowDraft:boolean;
  canEditCell:(id:string,field:TextField)=>boolean;
  onUpdate:(id:string,changes:Changes)=>void;
  onKeepDraft:()=>boolean;
  onHistory?:(item:Item)=>void;
  onOpenFullList?:()=>void;
  dirtyIds:Set<string>;
  errors:Record<string,string>;
  onClose:()=>void;
};

export function ReportDetailGrid({title,selectedIds,items,sourceKey,catalog,listLayout,allowDraft,canEditCell,
  onUpdate,onKeepDraft,onHistory,onOpenFullList,dirtyIds,errors,onClose}:Props){
  // One dialog per click; settings persist separately from both list/report layouts.
  const [applied,setApplied]=useState<DetailGridPreferences>(()=>loadDetailGridPreferences(sourceKey));
  const [pending,setPending]=useState<DetailGridPreferences>(applied);
  const [settings,setSettings]=useState(false);
  const [notice,setNotice]=useState('');
  const [editing,setEditing]=useState(false);
  const [query,setQuery]=useState('');
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [sort,setSort]=useState<ColumnSort>(null);
  const [showAll,setShowAll]=useState(false);
  const [contentItem,setContentItem]=useState<{item:Item;field:'content'|'note'}|null>(null);
  const [presets,setPresets]=useState(()=>loadDetailPresets(sourceKey));
  const [selectedPreset,setSelectedPreset]=useState('');
  const [presetName,setPresetName]=useState('');
  const [colors,setColors]=useState<ColorRule[]>(()=>loadDetailColors(sourceKey));
  const [colorField,setColorField]=useState('progressCouncil');
  const [colorValue,setColorValue]=useState('');
  const [color,setColor]=useState<ColorRule['color']>('amber');
  const labelByKey=useMemo(()=>new Map<string,string>(EXCEL_SOURCE_COLUMNS.map(c=>[c.key,
    listLayout?.columns.find(col=>col.key===c.key)?.label??c.label])),[listLayout]);
  const ids=useMemo(()=>new Set(selectedIds),[selectedIds]);
  const subset=useMemo(()=>items.filter(item=>ids.has(item.recordId)),[items,ids]);
  // Preview pending column changes while the settings panel is open.
  const displayedLayout=settings?pending:applied;
  const shownColumns=useMemo(()=>displayedLayout.columns.filter(c=>c.visible||showAll),
    [displayedLayout,showAll]);
  const gridWidth=shownColumns.reduce((sum,c)=>sum+c.width,0);
  const [confirmSettingsExit,setConfirmSettingsExit]=useState(false);
  const settingsDirty=settings&&JSON.stringify(pending)!==JSON.stringify(applied);
  const visible=useMemo(()=>{
    const q=normalizeSearch(query);
    return sortItems(subset.filter(item=>{
      if(q&&!EXCEL_SOURCE_COLUMNS.some(col=>normalizeSearch(filterValue(item,col.key)).includes(q)))return false;
      return Object.entries(filters).every(([key,value])=>!value.trim()||
        normalizeSearch(filterValue(item,key)).includes(normalizeSearch(value)));
    }),sort);
  },[subset,query,filters,sort]);
  const editableFields=new Set<string>(TEXT_FIELDS.map(f=>f.key));
  const editable=allowDraft&&subset.some(item=>TEXT_FIELDS.some(field=>canEditCell(item.recordId,field.key)));
  const move=(index:number,offset:number)=>{
    const next=index+offset;
    if(next<0||next>=pending.columns.length)return;
    setPending(previous=>{
      const columns=[...previous.columns];
      [columns[index],columns[next]]=[columns[next],columns[index]];
      return {...previous,columns};
    });
  };
  const patch=(key:DetailColumnKey,changes:Partial<{visible:boolean;width:number}>)=>{
    setPending(previous=>({...previous,columns:previous.columns.map(c=>c.key===key?{...c,...changes}:c)}));
  };
  const commitWidth=(key:DetailColumnKey,width:number)=>{
    if(settings){patch(key,{width});return;}
    const next={...applied,columns:applied.columns.map(c=>c.key===key?{...c,width}:c)};
    if(!saveDetailGridPreferences(sourceKey,next)){
      setNotice('Không lưu được độ rộng mới trên trình duyệt. Cột chưa thay đổi.');return;
    }
    setApplied(next);setPending(next);
    setNotice('Đã giữ độ rộng cột của bảng popup trên trình duyệt.');
  };
  const moveHeader=(from:string,to:string)=>{
    if(!settings)return;
    setPending(old=>({...old,columns:reorderByKey(old.columns,c=>c.key,from,to)}));
  };
  const closeSettings=()=>{
    if(settingsDirty){setConfirmSettingsExit(true);return;}
    setSettings(false);
  };
  const toggleSettings=()=>{
    if(settings){closeSettings();return;}
    setPending(applied);setSettings(true);setNotice('');
  };
  const cycleSort=(key:string)=>setSort(old=>old?.key!==key
    ?{key,direction:'asc'}:old.direction==='asc'?{key,direction:'desc'}:null);
  const clearFilters=()=>{setFilters({});setQuery('');setSort(null);};
  const loadPreset=(id:string)=>{
    const next=presets.find(v=>v.id===id);
    if(next){
      setApplied(next.layout);setPending(next.layout);setFilters({...next.filters});
      setColors(next.colors);if(!saveDetailColors(sourceKey,next.colors))setNotice('Không lưu được màu popup trên máy.');setSelectedPreset(id);setShowAll(false);
      setSettings(false);setNotice('Đã áp dụng mẫu hiển thị cá nhân. Bấm Lưu cấu hình cột để đặt làm mặc định.');
    }else{
      const original=loadDetailGridPreferences(sourceKey);
      setApplied(original);setPending(original);setFilters({});setColors([]);
      setSelectedPreset('');setShowAll(false);setNotice('Đã trở về cách hiển thị mặc định của popup.');
    }
  };
  const createPreset=()=>{
    if(!presetName.trim()){setNotice('Nhập tên mẫu trước khi lưu.');return;}
    if(presets.length>=12){setNotice('Đã đạt tối đa 12 mẫu của bảng popup.');return;}
    const next:ReportDetailPreset={id:crypto.randomUUID(),name:presetName.trim().slice(0,60),
      layout:applied,filters,colors};
    const list=[...presets,next];
    if(!saveDetailPresets(sourceKey,list)){setNotice('Không lưu được mẫu trên trình duyệt.');return;}
    setPresets(list);setSelectedPreset(next.id);setPresetName('');setNotice('Đã lưu mẫu popup cá nhân.');
  };
  const updatePreset=()=>{
    if(!selectedPreset)return;
    const list=presets.map(v=>v.id===selectedPreset?{...v,layout:applied,filters,colors}:v);
    if(!saveDetailPresets(sourceKey,list)){setNotice('Không cập nhật được mẫu.');return;}
    setPresets(list);setNotice('Đã cập nhật mẫu cá nhân.');
  };
  const removePreset=()=>{
    if(!selectedPreset)return;
    const list=presets.filter(v=>v.id!==selectedPreset);
    if(!saveDetailPresets(sourceKey,list)){setNotice('Không xóa được mẫu.');return;}
    setPresets(list);setSelectedPreset('');setNotice('Đã xóa mẫu. Cấu hình popup đang hiển thị không đổi.');
  };
  const saveSettings=()=>{
    if(!pending.columns.some(c=>c.visible)){setNotice('Cần giữ ít nhất một cột được hiển thị.');return;}
    if(!saveDetailGridPreferences(sourceKey,pending)){setNotice('Chưa lưu được cấu hình cột trên trình duyệt.');return;}
    setApplied(pending);setSettings(false);
    setNotice('Đã lưu cấu hình cột riêng của bảng chi tiết trên trình duyệt này. Không thay đổi Danh sách nội dung hoặc dữ liệu nguồn.');
  };
  const options=(field:TextField,current:string)=>{
    const optionsFromCatalog=(catalog.options as Partial<Record<TextField,string[]>>)[field]??[];
    // Council completion is labelled exactly as the current Excel/HĐND report,
    // not the obsolete generic "Hoàn thành" option in the older list editor.
    const standard=field==='progressCouncil'
      ?['Sở chưa trình','VP đang thực hiện','Đã trình HĐND thành phố']
      :(STATUS_OPTIONS as Partial<Record<TextField,string[]>>)[field]??[];
    const safeCatalog=field==='progressCouncil'?optionsFromCatalog.filter(v=>v!=='Hoàn thành'||v===current):optionsFromCatalog;
    return [...new Set(['',...safeCatalog,...standard,current])];
  };
  const cell=(item:Item,key:DetailColumnKey):ReactNode=>{
    const raw=String(item[key]??'');
    if(key==='displayCode')return <div className="report-grid-id">
      <strong className="code" title={item.displayCode}>{displayId(item)}</strong>
      {onHistory&&<button type="button" className="item-history-action"
        aria-label={'Xem lịch sử '+displayId(item)} onClick={()=>onHistory(item)}>↺</button>}
      {dirtyIds.has(item.recordId)&&<small>Chưa lưu</small>}
      {errors[item.recordId]&&<small className="error-text" role="alert">{errors[item.recordId]}</small>}
    </div>;
    if(!editing||!editableFields.has(key)||!canEditCell(item.recordId,key as TextField))return raw||'—';
    const field=key as TextField;
    if(field==='content'||field==='note')
      return <button type="button" className="cell-value-button"
        aria-label={'Sửa '+labelByKey.get(key)+' · '+displayId(item)}
        onClick={()=>setContentItem({item,field})}>{raw||'—'}</button>;
    if(listLayout?.columns.find(c=>c.key===key)?.kind==='text')
      return <input type="text" className="custom-cell-input" maxLength={1000}
        aria-label={labelByKey.get(key)+' · '+displayId(item)} value={raw}
        onChange={e=>onUpdate(item.recordId,{[field]:e.currentTarget.value})}/>;
    return <CellPicker label={labelByKey.get(key)+' · '+displayId(item)} value={raw}
      searchable={field==='specialist'} options={options(field,raw).filter(value=>
        field!=='specialist'||value===item.specialist||!item.room||
        !value||catalog.specialistRooms[value]?.includes(item.room))}
      onChange={value=>onUpdate(item.recordId,{[field]:value})}/>;
  };
  const inGroupDirty=subset.filter(item=>dirtyIds.has(item.recordId)).length;
  const canClose=()=>{
    if(settingsDirty){setConfirmSettingsExit(true);return;}
    onClose();
  };
  return <Modal title={title} onClose={canClose} className="report-detail-modal report-grid-modal">
    <div className="report-grid-toolbar">
      <div className="report-grid-summary">
        <strong>{selectedIds.length} nội dung trong ô báo cáo</strong>
        <span className="muted">Đang hiển thị {visible.length} nội dung · {shownColumns.length}/15 cột nguồn</span>
        {inGroupDirty>0&&<span className="report-grid-draft">Có {inGroupDirty} nội dung đang sửa nháp</span>}
      </div>
      <label className="report-grid-search">Tìm trong nội dung của ô
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="Tìm mã, nội dung, tiến độ, sở…"/>
      </label>
      <div className="report-grid-actions">
        <button type="button" className="button ghost" aria-pressed={showAll}
          onClick={()=>setShowAll(v=>!v)}>{showAll?'Theo cột đã chọn':'Hiện đủ cột Excel'}</button>
        <button type="button" className="button ghost" onClick={clearFilters}
          disabled={!query&&Object.keys(filters).length===0&&!sort}>Xóa bộ lọc</button>
        <button type="button" className="button ghost" aria-expanded={settings}
          onClick={toggleSettings}>Cấu hình cột riêng</button>
        <button type="button" className="button ghost" aria-pressed={editing} disabled={!editable}
          title={!editable?'Chưa có quyền sửa nháp với những hồ sơ thuộc ô này':undefined}
          onClick={()=>setEditing(v=>!v)}>{editing?'Kết thúc sửa nháp':'Chỉnh sửa nháp'}</button>
        {onOpenFullList&&<button type="button" className="button ghost"
          onClick={onOpenFullList}>Mở Danh sách dữ liệu</button>}
      </div>
    </div>
    <div className="report-grid-presets" role="group" aria-label="Mẫu hiển thị riêng của bảng popup">
      <label>Mẫu bảng popup <select aria-label="Mẫu hiển thị popup" value={selectedPreset}
        onChange={e=>loadPreset(e.target.value)}>
        <option value="">Mặc định</option>
        {presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
      <label>Tên mẫu mới <input type="text" maxLength={60} value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Ví dụ: Tiến độ nghị quyết"/></label>
      <button type="button" className="button ghost" disabled={!presetName.trim()||presets.length>=12}
        onClick={createPreset}>Lưu mẫu mới</button>
      {selectedPreset&&<><button type="button" className="button ghost"
        onClick={updatePreset}>Cập nhật mẫu</button>
        <button type="button" className="button ghost" onClick={removePreset}>Xóa mẫu</button></>}
    </div>
    {settings&&<section className="report-grid-settings" aria-label="Tùy chỉnh cột bảng chi tiết">
      <div className="report-grid-settings-intro">
        <strong>Cột của bảng chi tiết (độc lập)</strong>
        <p>Chọn hiện/ẩn, kéo mép phải của tiêu đề cột để chỉnh độ rộng trực tiếp (hoặc nhập px bên dưới), giữ/kéo tiêu đề để chuyển cột, dùng Alt+←/→. Thay đổi đang xem trước và chỉ lưu khi chọn Lưu cấu hình cột. Thiết lập riêng của popup.</p>
      </div>
      <div className="report-grid-settings-list">
        {pending.columns.map((c,index)=><div className="report-grid-settings-row" key={c.key}>
          <label><input type="checkbox" checked={c.visible}
            onChange={event=>patch(c.key,{visible:event.target.checked})}/> {labelByKey.get(c.key)}</label>
          <div className="report-grid-settings-buttons">
            <button type="button" className="button ghost" aria-label={'Đưa cột '+labelByKey.get(c.key)+' lên'} disabled={index===0} onClick={()=>move(index,-1)}>↑</button>
            <button type="button" className="button ghost" aria-label={'Đưa cột '+labelByKey.get(c.key)+' xuống'} disabled={index===pending.columns.length-1} onClick={()=>move(index,1)}>↓</button>
            <label>Rộng <input type="number" min={70} max={800} step={10} aria-label={'Độ rộng '+labelByKey.get(c.key)}
              value={c.width} onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>=70&&value<=800)patch(c.key,{width:value});}}/> px</label>
          </div>
        </div>)}
      </div>
      <div className="report-grid-settings-footer">
        <button type="button" className="button ghost" onClick={()=>{setPending(defaultDetailGridPreferences());setNotice('');}}>Khôi phục mặc định</button>
        <button type="button" className="button ghost" onClick={closeSettings}>Đóng tùy chỉnh</button>
        <button type="button" className="button primary" onClick={saveSettings} disabled={!pending.columns.some(c=>c.visible)}>Lưu cấu hình cột</button>
      </div>
      <details className="report-grid-color-config">
        <summary>Màu theo điều kiện (chỉ trong bảng popup · {colors.length} quy tắc)</summary>
        <div className="report-grid-color-editor">
          <label>Cột <select value={colorField} onChange={e=>setColorField(e.target.value)}>
            {EXCEL_SOURCE_COLUMNS.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
          </select></label>
          <label>Giá trị bằng <input maxLength={200} value={colorValue} onChange={e=>setColorValue(e.target.value)} placeholder="Giá trị đúng"/></label>
          <label>Màu <select value={color} onChange={e=>setColor(e.target.value as ColorRule['color'])}>
            <option value="mint">Xanh lá</option><option value="amber">Vàng</option>
            <option value="rose">Đỏ nhạt</option><option value="blue">Xanh dương</option>
          </select></label>
          <button type="button" className="button ghost" disabled={!colorValue.trim()||colors.length>=30}
            onClick={()=>{const next=validateColorRules([...colors,{
              id:crypto.randomUUID(),field:colorField,value:colorValue.trim(),color
            }]);if(saveDetailColors(sourceKey,next)){setColors(next);setColorValue('');}else setNotice('Không lưu được màu popup trên trình duyệt.');}}>Thêm quy tắc</button>
        </div>
        {colors.map(rule=><span className="report-grid-color-chip" key={rule.id}>
          {labelByKey.get(rule.field)} = {rule.value} · {rule.color}
          <button type="button" aria-label={'Xóa màu '+rule.value}
            onClick={()=>{const next=colors.filter(v=>v.id!==rule.id);if(saveDetailColors(sourceKey,next))setColors(next);else setNotice('Không lưu được thay đổi màu popup.');}}>×</button>
        </span>)}
        <p className="muted">Màu của popup được tự lưu riêng trên trình duyệt khi thêm/xóa; cũng được lưu trong mẫu cá nhân. Không ảnh hưởng màu của Danh sách hoặc báo cáo.</p>
      </details>
    </section>}
    {confirmSettingsExit&&<div className="report-grid-settings-confirm" role="alertdialog" aria-label="Có thay đổi cột chưa lưu">
      <strong>Cột của popup có thay đổi chưa lưu.</strong>
      <button type="button" className="button ghost" onClick={()=>setConfirmSettingsExit(false)}>Tiếp tục tùy chỉnh</button>
      <button type="button" className="button ghost" onClick={()=>{
        setPending(applied);setSettings(false);setConfirmSettingsExit(false);
      }}>Bỏ thay đổi cột</button>
      <button type="button" className="button primary" onClick={()=>{
        saveSettings();setConfirmSettingsExit(false);
      }}>Lưu cấu hình cột</button>
    </div>}
    <div className="report-grid-notices">
      <p className="muted">{editing?'Thay đổi sử dụng bản nháp chung với Danh sách nội dung. Chỉnh sửa một ô không ghi Excel/Firebase.':'Bảng hiển thị từ cùng dữ liệu nguồn với Danh sách nội dung; bộ lọc chỉ áp dụng trong cửa sổ.'} Cấu hình cột được lưu riêng.</p>
      {!editable&&<p className="muted">Chế độ xem: không có quyền sửa nháp đối với các nội dung đang chọn.</p>}
      {notice&&<p className="notice" role="status">{notice}</p>}
    </div>
    <div className="report-grid-scroll" role="region" tabIndex={0} aria-label="Bảng chi tiết các nội dung trong ô báo cáo">
      <table className="data-table report-detail-grid"
        style={{width:gridWidth+'px',minWidth:gridWidth+'px',tableLayout:'fixed'}}>
        <colgroup>{shownColumns.map(c=><col key={c.key} style={{width:c.width+'px'}}/>)}</colgroup>
        <thead>
          <tr className="report-grid-heading-row">{shownColumns.map((c,index)=>
            <ColumnHeader key={c.key} columnKey={c.key} sortLabel={labelByKey.get(c.key)}
              sortDirection={sort?.key===c.key?sort.direction:null} onSort={cycleSort}
              disabled={!settings} previousKey={shownColumns[index-1]?.key}
              nextKey={shownColumns[index+1]?.key} onMove={moveHeader}>
              {labelByKey.get(c.key)}
              <ColumnResizeHandle columnIndex={index} label={labelByKey.get(c.key)??c.key}
                width={c.width} min={70} max={800} windowDragFallback
                onCommit={width=>commitWidth(c.key,width)}/>
            </ColumnHeader>)}</tr>
          <tr className="report-grid-filter-row">{shownColumns.map(c=>
            <ColumnFilterCell key={c.key} field={c.key} label={labelByKey.get(c.key)??c.key}
              items={subset} value={filters[c.key]??''} onChange={value=>setFilters(old=>{
                const next={...old};if(value)next[c.key]=value;else delete next[c.key];return next;
              })}/>)}</tr>
        </thead>
        <tbody>
          {visible.map(item=><tr key={item.recordId} className={[dirtyIds.has(item.recordId)?'report-grid-row-dirty':'',
            itemColor(item,colors)?'report-grid-color-'+itemColor(item,colors):''].join(' ')}>
            {shownColumns.map(c=><td key={c.key}>{cell(item,c.key)}{c.key==='specialist'&&assignmentIssue(item,catalog)&&
              <small className="warning-text">{assignmentIssue(item,catalog)}</small>}</td>)}
          </tr>)}
          {!visible.length&&<tr><td colSpan={shownColumns.length} className="empty">Không có nội dung phù hợp với bộ lọc.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="modal-footer report-grid-footer">
      <span className="muted">Nháp ở đây và tại Danh sách nội dung dùng chung. Báo cáo chỉ tính theo dữ liệu nguồn đã xác nhận.</span>
      <button type="button" className="button ghost" onClick={canClose}>Đóng</button>
      {inGroupDirty>0&&<button type="button" className="button primary" onClick={()=>{
        setNotice(onKeepDraft()?'Đã giữ nháp trên trình duyệt, chưa ghi Excel/Firebase.':'Chưa lưu được nháp trên trình duyệt. Không đóng trang để tránh mất thay đổi.');
      }}>Giữ nháp trên máy</button>}
    </div>
    {contentItem&&<ContentEditor key={contentItem.item.recordId+':'+contentItem.field}
      sourceKey={sourceKey} item={contentItem.item} field={contentItem.field}
      draftOnly sourceKind="google" onSave={value=>
        onUpdate(contentItem.item.recordId,{[contentItem.field]:value})}
      onClose={()=>setContentItem(null)}/>}
  </Modal>;
}
