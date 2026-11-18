import {useEffect,useId,useRef,useState,type CSSProperties,type KeyboardEvent} from 'react';
import {Modal} from '../../components/Modal';
import {STATUS_PALETTE_GROUPS,MAX_STATUS_PALETTES,defaultStatusPalette,
  type StatusPaletteStore,type StatusPalette,type StatusPaletteGroup} from '../../data/status-palettes';
import './inline-g06-status-palette.css';

type Props={
  store:StatusPaletteStore;
  onStoreChange:(next:StatusPaletteStore)=>boolean;
  compact?:boolean;
};
type ColorField='text'|'background';
const HEX=/^#[0-9a-f]{6}$/i;
const codeFor=(group:StatusPaletteGroup,field:ColorField)=>group+'.'+field;

/** Keep the preview local; only an explicit end of editing invokes the existing localStorage callback. */
export function inlineG06PreviewPalette(active:StatusPalette,drafts:Record<string,string>):StatusPalette{
  const preview={...active};
  for(const {key} of STATUS_PALETTE_GROUPS){
    const text=drafts[codeFor(key,'text')];
    const background=drafts[codeFor(key,'background')];
    if(text!==undefined&&HEX.test(text)||background!==undefined&&HEX.test(background)){
      preview[key]={
        text:text!==undefined&&HEX.test(text)?text.toUpperCase():active[key].text,
        background:background!==undefined&&HEX.test(background)?background.toUpperCase():active[key].background,
      };
    }
  }
  return preview;
}

function quickPosition(anchor:HTMLElement|null):CSSProperties{
  if(!anchor||typeof window==='undefined')return {};
  const rect=anchor.getBoundingClientRect();
  const width=Math.min(410,Math.max(0,window.innerWidth-16));
  const height=Math.min(560,Math.max(80,window.innerHeight-16));
  const left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8));
  let top=rect.bottom+8;
  if(top+height>window.innerHeight-8)top=rect.top-height-8;
  if(top<8||top+height>window.innerHeight-8)top=8;
  return {top,left,width,maxHeight:height};
}

export function StatusPaletteManager({store,onStoreChange,compact=false}:Props){
  const [open,setOpen]=useState(false);
  const [quickOpen,setQuickOpen]=useState(false);
  const [group,setGroup]=useState<StatusPaletteGroup>('not-submitted');
  const [position,setPosition]=useState<CSSProperties>({});
  const [name,setName]=useState('');
  const [edits,setEdits]=useState<Record<string,string>>({});
  const pending=useRef<Record<string,string>>({});
  const trigger=useRef<HTMLButtonElement>(null);
  const popover=useRef<HTMLDivElement>(null);
  const popoverId=useId();
  const [message,setMessage]=useState('');
  const [confirmDelete,setConfirmDelete]=useState(false);
  const current=store.active;
  const preview=inlineG06PreviewPalette(current,edits);
  const selected=store.presets.find(p=>p.id===store.activePresetId);
  const clearEdits=()=>{pending.current={};setEdits({});};
  const clearEdit=(id:string)=>{
    delete pending.current[id];
    setEdits(old=>{const next={...old};delete next[id];return next;});
  };
  const update=(next:StatusPaletteStore,success:string)=>{
    if(!onStoreChange(next)){
      setMessage('Không lưu được bảng màu trên trình duyệt. Kiểm tra dung lượng hoặc chế độ duyệt riêng tư.');
      return false;
    }
    setMessage(success);return true;
  };
  const colorChanged=(key:StatusPaletteGroup,field:ColorField,raw:string)=>{
    const id=codeFor(key,field);
    pending.current[id]=raw;
    setEdits(old=>({...old,[id]:raw}));
    setMessage('');
  };
  const commitColor=(key:StatusPaletteGroup,field:ColorField)=>{
    const id=codeFor(key,field),raw=pending.current[id];
    if(raw===undefined)return;
    if(!HEX.test(raw)){
      clearEdit(id);
      setMessage('Mã HEX không hợp lệ đã được hoàn lại. Nhập dạng #RRGGBB.');
      return;
    }
    const hex=raw.toUpperCase();
    if(hex!==current[key][field]||(key==='other'&&!current.otherEnabled)){
      update({...store,active:{...current,[key]:{...current[key],[field]:hex},
        otherEnabled:key==='other'?true:current.otherEnabled}},
      'Đã áp dụng màu trên trình duyệt; bộ màu có tên chưa thay đổi.');
    }
    clearEdit(id);
  };
  const fieldKeyDown=(event:KeyboardEvent<HTMLInputElement>,key:StatusPaletteGroup,field:ColorField)=>{
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();clearEdit(codeFor(key,field));
      setMessage('Đã hủy thay đổi màu chưa lưu.');
    }else if(event.key==='Enter'){
      event.preventDefault();event.stopPropagation();commitColor(key,field);
    }
  };
  const choose=(id:string)=>{
    setConfirmDelete(false);clearEdits();
    const palette=store.presets.find(p=>p.id===id);
    if(!palette){update({...store,active:defaultStatusPalette(),activePresetId:''},'Đã dùng màu mặc định V5.');return;}
    update({...store,active:palette.colors,activePresetId:id},'Đã chọn bộ màu “'+palette.name+'”.');
  };
  const resetGroup=(key:StatusPaletteGroup)=>{
    clearEdits();
    const defaults=defaultStatusPalette();
    update({...store,active:{...current,[key]:defaults[key],
      otherEnabled:key==='other'?false:current.otherEnabled}},
    'Đã khôi phục màu mặc định cho nhóm “'+STATUS_PALETTE_GROUPS.find(g=>g.key===key)?.label+'”.');
  };
  const saveNew=()=>{
    const title=name.trim();
    if(!title){setMessage('Nhập tên bộ màu trước khi lưu.');return;}
    if(title.length>60){setMessage('Tên bộ màu không vượt quá 60 ký tự.');return;}
    if(store.presets.length>=MAX_STATUS_PALETTES){setMessage('Đã đạt tối đa 20 bộ màu đã lưu.');return;}
    if(store.presets.some(p=>p.name.toLocaleLowerCase('vi-VN')===title.toLocaleLowerCase('vi-VN'))){
      setMessage('Tên bộ màu đã tồn tại. Hãy chọn tên khác hoặc cập nhật bộ hiện có.');return;
    }
    const id='colors-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
    if(update({...store,presets:[...store.presets,{id,name:title,colors:current}],activePresetId:id},
      'Đã lưu bộ màu “'+title+'”.'))setName('');
  };
  const saveSelected=()=>{
    if(!selected)return;
    update({...store,presets:store.presets.map(p=>p.id===selected.id?{...p,colors:current}:p)},
      'Đã cập nhật bộ màu “'+selected.name+'”.');
  };
  const deleteSelected=()=>{
    if(!selected)return;
    if(!confirmDelete){setConfirmDelete(true);setMessage('Nhấn “Xác nhận xóa bộ màu” để xóa bộ đã lưu; màu đang dùng vẫn giữ nguyên.');return;}
    if(update({...store,activePresetId:'',presets:store.presets.filter(p=>p.id!==selected.id)},
      'Đã xóa bộ màu đã lưu. Màu đang hiển thị không đổi.'))setConfirmDelete(false);
  };
  const openQuick=()=>{
    clearEdits();setMessage('');setConfirmDelete(false);
    setPosition(quickPosition(trigger.current));setQuickOpen(true);
  };
  const closeQuick=()=>{
    clearEdits();setQuickOpen(false);
    if(popover.current?.matches(':popover-open'))popover.current.hidePopover();
    trigger.current?.focus({preventScroll:true});
  };
  useEffect(()=>{
    const node=popover.current;
    if(!node||typeof node.showPopover!=='function')return;
    if(quickOpen){
      if(!node.matches(':popover-open'))node.showPopover();
      node.focus({preventScroll:true});
    }else if(node.matches(':popover-open'))node.hidePopover();
  },[quickOpen]);
  useEffect(()=>{
    if(!quickOpen)return;
    const reposition=()=>setPosition(quickPosition(trigger.current));
    window.addEventListener('resize',reposition);
    window.addEventListener('scroll',reposition,true);
    return ()=>{window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);};
  },[quickOpen]);
  const swatch=(key:StatusPaletteGroup)=><span className="status-palette-preview inline-g06-preview"
    style={{color:preview[key].text,backgroundColor:preview[key].background,
      opacity:key==='other'&&!current.otherEnabled?0.85:1}}>{STATUS_PALETTE_GROUPS.find(g=>g.key===key)?.label}</span>;
  const fields=(key:StatusPaletteGroup,mode:'quick'|'modal')=>(['text','background'] as const).map(field=>{
    const id=codeFor(key,field),raw=edits[id]??current[key][field];
    const invalid=!HEX.test(raw),label=(field==='text'?'màu chữ ':'màu nền ')+
      STATUS_PALETTE_GROUPS.find(g=>g.key===key)?.label;
    return <label key={mode+'-'+id} className="status-palette-color-field inline-g06-color-field">
      <span>{field==='text'?'Màu chữ':'Màu nền'}</span>
      <div className="status-palette-color-controls">
        <input type="color" value={preview[key][field]} aria-label={'Chọn '+label}
          onChange={e=>colorChanged(key,field,e.currentTarget.value)}
          onBlur={()=>commitColor(key,field)}
          onKeyDown={e=>fieldKeyDown(e,key,field)}/>
        <input type="text" inputMode="text" spellCheck={false} maxLength={7}
          aria-label={'Mã '+label} aria-invalid={invalid}
          value={raw} onChange={e=>colorChanged(key,field,e.currentTarget.value)}
          onBlur={()=>commitColor(key,field)}
          onKeyDown={e=>fieldKeyDown(e,key,field)}/>
      </div>
      {invalid&&<small className="inline-g06-invalid">Mã màu phải có dạng #RRGGBB.</small>}
    </label>;
  });
  const toggleOther=(enabled:boolean)=>{
    clearEdits();update({...store,active:{...current,otherEnabled:enabled}},
      enabled?'Đã bật màu cho các trạng thái khác.':'Đã tắt màu cho các trạng thái khác.');
  };
  return <>
    <button ref={trigger} type="button" className="button ghost status-palette-trigger inline-g06-trigger"
      aria-haspopup="dialog" aria-controls={popoverId} aria-expanded={quickOpen}
      onClick={()=>quickOpen?closeQuick():openQuick()}>
      <span aria-hidden="true">🎨</span> {compact?'Bộ màu':'Bộ màu trạng thái'}
    </button>
    <div ref={popover} id={popoverId} popover="auto" role="dialog" tabIndex={-1}
      aria-label="Tô màu trạng thái nhanh" className="inline-g06-popover"
      style={position} data-open={quickOpen}
      onToggle={event=>{if(!event.currentTarget.matches(':popover-open')){clearEdits();setQuickOpen(false);}}}
      onKeyDown={event=>{if(event.key==='Escape'){
        event.stopPropagation();closeQuick();
      }}}>
      <div className="inline-g06-popover-head">
        <strong>Tô màu trạng thái</strong>
        <button type="button" className="button ghost" onClick={closeQuick} aria-label="Đóng bộ màu nhanh">×</button>
      </div>
      <p className="inline-g06-help">Xem trước ngay; lưu màu khi rời ô hoặc nhấn Enter. Chỉ lưu trên trình duyệt này.</p>
      <div className="inline-g06-groups" role="group" aria-label="Nhóm trạng thái cần tô màu">
        {STATUS_PALETTE_GROUPS.map(item=><button type="button" key={item.key}
          aria-pressed={group===item.key} onClick={()=>{clearEdits();setGroup(item.key);}}
          className="inline-g06-group">
          <span className="inline-g06-dot" style={{background:current[item.key].background,
            borderColor:current[item.key].text}} aria-hidden="true"/>{item.label}
        </button>)}
      </div>
      <section className="inline-g06-editor" aria-label={'Tô màu '+STATUS_PALETTE_GROUPS.find(g=>g.key===group)?.label}>
        {fields(group,'quick')}
        {swatch(group)}
        {group==='other'&&<label className="status-palette-other-toggle inline-g06-other-toggle">
          <input type="checkbox" checked={current.otherEnabled}
            onChange={e=>toggleOther(e.currentTarget.checked)}/>Tô màu trạng thái khác
        </label>}
      </section>
      <div className="inline-g06-actions">
        <button type="button" className="button ghost" onClick={()=>resetGroup(group)}>Đặt lại nhóm</button>
        <button type="button" className="button ghost" onClick={()=>choose('')}>Mặc định V5</button>
        <button type="button" className="button primary" onClick={()=>{closeQuick();setOpen(true);setMessage('');}}>
          Quản lý bộ màu…
        </button>
      </div>
      {store.presets.length>0&&<label className="inline-g06-preset-choice">Bộ màu đã lưu
        <select value={store.activePresetId} onChange={event=>choose(event.currentTarget.value)}
          aria-label="Chọn bộ màu nhanh">
          <option value="">Mặc định / màu tự chỉnh</option>
          {store.presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>}
      {message&&<p className="inline-g06-feedback" role="status">{message}</p>}
    </div>
    {open&&<Modal title="Bộ màu trạng thái · Bảng dữ liệu & popup" className="status-palette-modal"
      onClose={()=>{setOpen(false);clearEdits();}}>
      <div className="modal-body status-palette-body">
        <p className="muted">Bốn nhóm trạng thái chỉ đổi màu hiển thị, không đổi ý nghĩa hay dữ liệu nghiệp vụ.
          Nhập HEX để xem trước, nhấn Enter hoặc rời ô để áp dụng vào Bảng dữ liệu và popup.
          Bộ màu lưu trên <strong>trình duyệt này</strong>, không ghi Excel/Firebase.</p>
        <div className="status-palette-savebar">
          <label>Bộ màu đã lưu
            <select value={store.activePresetId}
              onChange={event=>choose(event.currentTarget.value)} aria-label="Chọn bộ màu trạng thái đã lưu">
              <option value="">Màu mặc định / tùy chỉnh chưa đặt tên</option>
              {store.presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <button type="button" className="button ghost" onClick={()=>choose('')}>Khôi phục màu V5 mặc định</button>
        </div>
        <div className="status-palette-grid">
          {STATUS_PALETTE_GROUPS.map(({key,label,description})=><section className="status-palette-row" key={key}>
            <div className="status-palette-row-heading">
              <strong>{label}</strong><small>{description}</small>
              {key==='other'&&<label className="status-palette-other-toggle">
                <input type="checkbox" checked={current.otherEnabled}
                  onChange={e=>toggleOther(e.currentTarget.checked)}/>Tô màu trạng thái khác
              </label>}
            </div>
            {fields(key,'modal')}
            {swatch(key)}
            <button type="button" className="button ghost inline-g06-row-reset"
              onClick={()=>resetGroup(key)}>Đặt lại màu nhóm</button>
          </section>)}
        </div>
        <section className="status-palette-presets" aria-label="Lưu và quản lý bộ màu">
          <h3>Lưu bộ màu để dùng lại</h3>
          <div className="status-palette-presets-actions">
            <label>Tên bộ màu mới
              <input type="text" value={name} maxLength={60}
                placeholder="Ví dụ: Màu rõ nét - tháng 10"
                onChange={event=>setName(event.currentTarget.value)}/>
            </label>
            <button type="button" className="button primary" onClick={saveNew}
              disabled={!name.trim()||store.presets.length>=MAX_STATUS_PALETTES}>Lưu bộ mới</button>
            {selected&&<>
              <button type="button" className="button ghost" onClick={saveSelected}>Cập nhật bộ “{selected.name}”</button>
              <button type="button" className="button danger" onClick={deleteSelected}>
                {confirmDelete?'Xác nhận xóa bộ màu':'Xóa bộ đã chọn'}</button>
            </>}
          </div>
          <small>Đã lưu {store.presets.length}/{MAX_STATUS_PALETTES} bộ màu · Màu đang dùng không tự sửa bộ có tên; dùng “Cập nhật bộ” để ghi đè.</small>
        </section>
        {message&&<p className="notice" role="status">{message}</p>}
      </div>
      <div className="modal-footer">
        <button type="button" className="button primary" onClick={()=>{setOpen(false);clearEdits();}}>Xong</button>
      </div>
    </Modal>}
  </>;
}
