import { useEffect, useRef, useState, type ReactNode } from 'react';

type ColumnHeaderProps = {
  columnKey: string; disabled?: boolean; previousKey?: string; nextKey?: string;
  onMove: (fromKey: string, toKey: string) => void; onSort?: (key:string)=>void;
  sortDirection?: 'asc'|'desc'|null;sortLabel?:string; children: ReactNode;
  /** Provided only for an authorized administrator in visual-edit mode. */
  inlineEditing?:boolean; canHide?:boolean; saving?:boolean;
  /** Admin-only quick hide/show outside the advanced layout edit mode. */
  quickVisibility?:boolean; hiddenColumns?:ReadonlyArray<{key:string;label:string}>;
  onShow?:(key:string)=>void; onShowAll?:()=>void;
  onRename?:(key:string,label:string)=>Promise<boolean>|boolean;
  onHide?:(key:string)=>void;
  onOpenColumnSettings?:(key:string)=>void;
};

/** Pointer capture supports embedded browsers and touch without native HTML drag/drop. */
export function ColumnHeader({ columnKey, disabled = false, previousKey, nextKey, onMove,onSort,sortDirection,sortLabel, children,
  inlineEditing=false,canHide=false,saving=false,onRename,onHide,onOpenColumnSettings,
  quickVisibility=false,hiddenColumns=[],onShow,onShowAll }: ColumnHeaderProps) {
  const start=useRef<{x:number;y:number;pointer:number}|null>(null);
  const [dragging,setDragging]=useState(false);
  const justDragged=useRef(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [renaming,setRenaming]=useState(false);
  const [name,setName]=useState('');
  const [renameError,setRenameError]=useState('');
  const renameRef=useRef<HTMLInputElement>(null);
  const menuRef=useRef<HTMLButtonElement>(null);
  const toolsRef=useRef<HTMLSpanElement>(null);
  const visibilityEnabled=inlineEditing||quickVisibility;
  const editingAllowed=inlineEditing&&!saving&&!!onRename;
  useEffect(()=>{if(renaming)renameRef.current?.focus();},[renaming]);
  useEffect(()=>{if(!visibilityEnabled){setMenuOpen(false);setRenaming(false);}},[visibilityEnabled]);
  useEffect(()=>{
    if(!menuOpen)return;
    const outside=(event:PointerEvent)=>{
      if(event.target instanceof Node&&!toolsRef.current?.contains(event.target))setMenuOpen(false);
    };
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[menuOpen]);
  const cleanup=()=>{start.current=null;setDragging(false);};
  const beginRename=()=>{
    if(!editingAllowed)return;
    setName(typeof children==='string'?children:sortLabel??columnKey);
    setRenameError('');setRenaming(true);setMenuOpen(false);
  };
  const closeRename=()=>{if(saving)return;setRenaming(false);setRenameError('');menuRef.current?.focus();};
  return <th scope="col" aria-sort={onSort?(sortDirection?(sortDirection==='asc'?'ascending':'descending'):'none'):undefined} data-column-key={columnKey} tabIndex={onSort||!disabled?0:undefined}
    className={disabled?undefined:`column-movable ${dragging?'column-dragging':''}`}
    onContextMenu={visibilityEnabled&&!saving?event=>{
      if(typeof Element!=='undefined'&&event.target instanceof Element&&event.target.closest('.column-resizer'))return;
      event.preventDefault();event.stopPropagation();setRenaming(false);setMenuOpen(true);
    }:undefined}
    title={onSort
      ?(disabled?'Bấm tiêu đề để sắp xếp':'Bấm để sắp xếp; giữ và kéo để chuyển cột; Alt+← hoặc Alt+→ để chuyển cột.')
      :disabled?undefined:'Giữ và kéo để chuyển cột; Alt+← hoặc Alt+→ để chuyển cột.'}
    onClick={event=>{
      if(!onSort)return;
      if(justDragged.current){justDragged.current=false;return;}
      if((event.target as HTMLElement).closest('.column-resizer,.column-sort-button,.inline-g01-column-tools'))return;
      onSort(columnKey);
    }}
    onPointerDown={event=>{
      if(disabled||event.button!==0||(event.target instanceof Element&&event.target.closest('.column-resizer,.column-sort-button,.inline-g01-column-tools')))return;
      justDragged.current=false;
      start.current={x:event.clientX,y:event.clientY,pointer:event.pointerId};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event=>{const drag=start.current;if(drag&&drag.pointer===event.pointerId&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5){justDragged.current=true;setDragging(true);}}}
    onPointerUp={event=>{
      const drag=start.current;
      if(!disabled&&drag&&drag.pointer===event.pointerId&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5){
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('th[data-column-key]');
        const to=target?.getAttribute('data-column-key');
        if(to&&to!==columnKey&&target?.closest('table')===event.currentTarget.closest('table'))onMove(columnKey,to);
      }
      cleanup();
    }}
    onPointerCancel={cleanup} onLostPointerCapture={cleanup}
    onKeyDown={event=>{
      if(event.target!==event.currentTarget)return;
      if(visibilityEnabled&&!saving&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')){

        event.preventDefault();setRenaming(false);setMenuOpen(true);menuRef.current?.focus();return;

      }

      if(!event.altKey&&(event.key==='Enter'||event.key===' ')){
        if(onSort){event.preventDefault();onSort(columnKey);}return;
      }
      if(disabled||!event.altKey)return;
      const to=event.key==='ArrowLeft'?previousKey:event.key==='ArrowRight'?nextKey:undefined;
      if(to){event.preventDefault();onMove(columnKey,to);}
    }}><span className={'column-heading-content'+(onSort?' has-sort':'')}><span className="column-heading-label">{children}</span>
      {onSort&&<button type="button" className={'column-sort-button'+(sortDirection?' active':'')}
        aria-label={'Sắp xếp cột '+(sortLabel??columnKey)+(sortDirection?(sortDirection==='asc'?', hiện tăng dần':', hiện giảm dần'):', chưa sắp xếp')}
        title={sortDirection==='asc'?'Đang tăng dần · bấm để giảm dần':sortDirection==='desc'?'Đang giảm dần · bấm để trở về thứ tự nguồn':'Sắp xếp tăng dần'}
        onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();onSort(columnKey);}}>
          {sortDirection==='asc'?'↑':sortDirection==='desc'?'↓':'↕'}
        </button>}
      {visibilityEnabled&&<span ref={toolsRef} className="inline-g01-column-tools" onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        onKeyDown={e=>{
          e.stopPropagation();
          if(e.key==='Escape'&&!renaming){e.preventDefault();setMenuOpen(false);menuRef.current?.focus();}
        }}>
        <button ref={menuRef} type="button" className="inline-g01-column-menu-trigger"
          aria-label={'Tùy chọn cột '+(sortLabel??columnKey)}
          aria-expanded={menuOpen} aria-haspopup="true"
          disabled={saving} onClick={()=>{setMenuOpen(open=>!open);setRenaming(false);}}>
        </button>
        {menuOpen&&<span className="inline-g01-column-menu" role="group" aria-label={'Thao tác cột '+(sortLabel??columnKey)}>
          {inlineEditing&&<button type="button" onClick={beginRename}>Đổi tên cột</button>}
          {onHide&&<button type="button" aria-label={'Ẩn cột '+(sortLabel??columnKey)} disabled={!canHide||saving}
            onClick={()=>{setMenuOpen(false);onHide(columnKey);}}>Ẩn cột (không xóa)</button>}
          {onShow&&<span className="inline-g01-hidden-section" role="group" aria-label="Hiện lại cột đã ẩn">
            <strong>Cột đã ẩn ({hiddenColumns.length})</strong>
            {hiddenColumns.length===0?<span>Không có cột ẩn</span>:hiddenColumns.map(column=><button type="button" key={column.key}
              disabled={saving} aria-label={'Hiện cột '+column.label}
              onClick={()=>{setMenuOpen(false);onShow(column.key);}}>+ Hiện {column.label}</button>)}
            {hiddenColumns.length>1&&onShowAll&&<button type="button" disabled={saving}
              onClick={()=>{setMenuOpen(false);onShowAll();}}>Hiện tất cả cột</button>}
          </span>}
          {inlineEditing&&onOpenColumnSettings&&<button type="button" onClick={()=>{
            setMenuOpen(false);onOpenColumnSettings(columnKey);
          }}>Thiết lập cột và danh sách chọn…</button>}
          <button type="button" onClick={()=>{setMenuOpen(false);menuRef.current?.focus();}}>Đóng</button>
        </span>}
        {renaming&&<form className="inline-g01-column-rename"
          onSubmit={event=>{event.preventDefault();if(!editingAllowed)return;
            const result=onRename?.(columnKey,name);
            void Promise.resolve(result).then(saved=>{
              if(saved){setRenaming(false);setRenameError('');menuRef.current?.focus();}
              else setRenameError('Chưa lưu được tên cột. Kiểm tra thông báo bên dưới bảng.');
            }).catch(error=>setRenameError(error instanceof Error?error.message:'Chưa lưu được.'));
          }}>
          <input ref={renameRef} value={name} maxLength={100} aria-label={'Tên mới cột '+(sortLabel??columnKey)}
            onChange={e=>{setName(e.currentTarget.value);setRenameError('');}}
            onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeRename();}}}
            disabled={saving}/>
          <button type="submit" disabled={saving}>Lưu</button>
          <button type="button" disabled={saving} onClick={closeRename}>Hủy</button>
          {renameError&&<span role="alert">{renameError}</span>}
        </form>}
      </span>}
    </span></th>;
}
