import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MAX_SAVED_LAYOUTS,type SavedLayoutPreset} from '../../data/item-preferences';
import {placeCompactMenu,type CompactMenuPlacement} from './compact-menu-placement';

type Props={
  presets:readonly SavedLayoutPreset[];activeId?:string;dirty:boolean;busy:boolean;
  onSelect:(id:string)=>Promise<boolean>;onCreate:(name:string)=>Promise<boolean>;
  onRename:(id:string,name:string)=>Promise<boolean>;onRemove:(id:string)=>Promise<boolean>;
};
/** Same compact trigger, anchored body portal, colors and focus behavior as Tùy chọn cột.
 * Single-choice tick list; management actions live beside the relevant preset. */
export function SavedLayoutMenu({presets,activeId,dirty,busy,onSelect,onCreate,onRename,onRemove}:Props){
  const [open,setOpen]=useState(false);
  const [placement,setPlacement]=useState<CompactMenuPlacement|null>(null);
  const [nameEdit,setNameEdit]=useState<{id?:string;name:string}|null>(null);
  const [error,setError]=useState('');
  const trigger=useRef<HTMLButtonElement>(null);
  const panel=useRef<HTMLDivElement>(null);
  const nameInput=useRef<HTMLInputElement>(null);
  const close=(focus=false)=>{
    setOpen(false);setPlacement(null);setNameEdit(null);setError('');
    if(focus)trigger.current?.focus({preventScroll:true});
  };
  useEffect(()=>{
    if(!open)return;
    let frame=0;
    const place=()=>{
      if(!trigger.current)return;
      const next=placeCompactMenu(trigger.current.getBoundingClientRect(),innerWidth,innerHeight);
      setPlacement(previous=>previous&&JSON.stringify(previous)===JSON.stringify(next)?previous:next);
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
    const outside=(event:PointerEvent)=>{
      if(event.target instanceof Node&&!trigger.current?.contains(event.target)&&!panel.current?.contains(event.target))close();
    };
    const escape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault();event.stopPropagation();close(true);
      }
    };
    place();window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
    document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);
      window.removeEventListener('scroll',schedule,true);document.removeEventListener('pointerdown',outside,true);
      document.removeEventListener('keydown',escape,true);};
  },[open]);
  useEffect(()=>{if(open&&placement)panel.current?.focus({preventScroll:true});},[open,!!placement]);
  useEffect(()=>{if(nameEdit){nameInput.current?.focus({preventScroll:true});nameInput.current?.select();}},[nameEdit?.id,!!nameEdit]);
  const apply=async(action:()=>Promise<boolean>,closeOnSuccess=true)=>{
    if(busy)return;
    setError('');
    try{
      if(await action()){if(closeOnSuccess)close(true);else setNameEdit(null);}
      else setError('Chưa lưu được thay đổi. Kiểm tra thông báo trên bảng rồi thử lại.');
    }catch(e){setError(e instanceof Error?e.message:'Chưa lưu được thay đổi.');}
  };
  return <div className="saved-layout-menu">
    <button type="button" className="saved-layout-trigger" ref={trigger}
      aria-label="Chọn giao diện" aria-controls="hdnd-saved-layout-popup" aria-expanded={open}
      title={presets.find(p=>p.id===activeId)?.name??'Giao diện hiện tại chưa đặt tên'}
      onClick={()=>open?close():setOpen(true)}>Chọn giao diện <span aria-hidden="true">▾</span></button>
    {open&&placement&&createPortal(<div id="hdnd-saved-layout-popup" ref={panel} tabIndex={-1}
      className="compact-columns-options compact-columns-options-floating saved-layout-popup"
      role="group" aria-label="Giao diện đã lưu" data-popover-side={placement.side}
      style={{top:placement.top,left:placement.left,width:placement.width,maxHeight:placement.maxHeight}}>
      <div className="column-options-section-heading saved-layout-heading">
        <strong>Giao diện đã lưu</strong>
        <button type="button" className="saved-layout-icon saved-layout-add" aria-label="Lưu giao diện mới"
          title="Lưu giao diện hiện tại thành mẫu mới" disabled={busy||presets.length>=MAX_SAVED_LAYOUTS}
          onClick={()=>{setError('');setNameEdit({name:''});}}>+</button>
      </div>
      <div className="saved-layout-list" role="group" aria-label="Danh sách mẫu giao diện">
        {!activeId&&<div className="saved-layout-current"><span aria-hidden="true">✓</span> Giao diện hiện tại (chưa đặt tên)</div>}
        {presets.map(p=><div className="saved-layout-row" key={p.id} data-layout-id={p.id}>
          <button type="button" className="saved-layout-choice" aria-pressed={activeId===p.id}
            disabled={busy||dirty} onClick={()=>{if(activeId===p.id)close(true);else void apply(()=>onSelect(p.id));}}>
            <span aria-hidden="true" className="saved-layout-tick">{activeId===p.id?'✓':''}</span>
            <span>{p.name}</span>
          </button>
          <button type="button" className="saved-layout-icon" aria-label={'Đổi tên mẫu '+p.name}
            title="Đổi tên mẫu" disabled={busy||dirty}
            onClick={()=>{setError('');setNameEdit({id:p.id,name:p.name});}}>✎</button>
          <button type="button" className="saved-layout-icon saved-layout-delete" aria-label={'Xóa mẫu '+p.name}
            title="Xóa mẫu" disabled={busy||dirty}
            onClick={()=>{if(window.confirm('Xóa mẫu “'+p.name+'”? Bố cục đang hiển thị và dữ liệu hồ sơ vẫn được giữ.'))
              void apply(()=>onRemove(p.id),false);}}>×</button>
        </div>)}
      </div>
      {nameEdit&&<form className="saved-layout-name-form" aria-label={nameEdit.id?'Đổi tên mẫu':'Lưu giao diện mới'}
        onSubmit={event=>{
          event.preventDefault();
          const name=nameEdit.name.trim().normalize('NFC');
          if(!name||name.length>60){setError('Tên giao diện cần từ 1 đến 60 ký tự.');return;}
          if(presets.some(p=>p.id!==nameEdit.id&&p.name.toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi'))){
            setError('Tên giao diện đã tồn tại.');return;
          }
          const id=nameEdit.id;
          void apply(()=>id?onRename(id,name):onCreate(name));
        }}>
        <label>{nameEdit.id?'Tên mới':'Tên giao diện'}<input ref={nameInput} aria-label="Tên giao diện"
          maxLength={60} required value={nameEdit.name} disabled={busy}
          onChange={event=>{setError('');setNameEdit({...nameEdit,name:event.currentTarget.value});}}/></label>
        <div><button type="submit" className="button primary" disabled={busy||!nameEdit.name.trim()}>Lưu</button>
          <button type="button" className="button ghost" disabled={busy} onClick={()=>{setNameEdit(null);setError('');}}>Hủy</button></div>
      </form>}
      {dirty&&<small className="column-options-note">Lưu hoặc hủy thay đổi đang chỉnh trước khi chuyển mẫu. Dấu + lưu bố cục nháp thành mẫu mới.</small>}
      {error&&<small className="error-text" role="alert">{error}</small>}
    </div>,document.body)}
  </div>;
}
