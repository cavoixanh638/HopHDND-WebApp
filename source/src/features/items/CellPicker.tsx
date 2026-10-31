import { useEffect, useMemo, useRef, useState } from 'react';
import {claimCellPicker,releaseCellPickerClaim} from './pr95-v5-l1-picker-coordinator';
import {placeCellPicker, type PickerViewport} from './pr95-v5-l1-picker-placement';
import { normalizeSearch } from '../../domain/search';
import {SearchHighlight} from './SearchHighlight';
import type {CellEditSessionManager,EditorKind} from '../../data/cell-edit-leases';
import type {EditableField} from '../../../shared/types';
import './cell-picker.css';

/** R-V3-01: List intentionally strips empty catalog values before passing
 * options, while the Report popup may supply an explicit empty value.
 * Only optional non-status assignments can be cleared. Status/partyLevel and
 * the withdrawn flag must never gain an invented fifth/sixth choice. */
const STATUS_PICKER_FIELDS:ReadonlySet<EditableField>=new Set([
  'partyLevel','progressParty','progressBuild','progressCouncil','isDropped'
]);
const OPTIONAL_ASSIGNMENT_FIELDS:ReadonlySet<EditableField>=new Set([
  'department','type','specialist','room','vpLeader','ubndLeader'
]);
export function cellPickerCanClear(field:EditableField|undefined,options:readonly string[]):boolean{
  if(field&&STATUS_PICKER_FIELDS.has(field))return false;
  return !!(field&&OPTIONAL_ASSIGNMENT_FIELDS.has(field))||options.includes('');
}

type CellPickerProps = {
  label: string;
  value: string;
  displayValue?: string;
  options: string[];
  searchable?: boolean;
  highlightQuery?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  leaseManager?:CellEditSessionManager;recordId?:string;field?:EditableField;editorKind?:EditorKind;
};

export function CellPicker({ label, value, displayValue, options, searchable = false, disabled = false, highlightQuery, onChange, leaseManager,recordId,field,editorKind='status' }: CellPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [waiting,setWaiting]=useState(false);
  const [leaseError,setLeaseError]=useState('');
  const chosen=useRef(false);
  const requestEpoch=useRef(0);
  const placementRef=useRef<(()=>void)|null>(null);
  const switchingPointer=useRef(false);
  const leaseProps=!!leaseManager&&!!recordId&&!!field;
  const cancelUnused=():Promise<void>=>{
    if(leaseProps&&!chosen.current&&!leaseManager!.isPending(recordId!,field!))
      return leaseManager!.cancel(recordId!,field!);
    return Promise.resolve();
  };
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Waiting disables this button temporarily: only external revoke/lock
  // should invalidate a successfully authorized open request.
  const externallyDisabledRef=useRef(disabled);
  externallyDisabledRef.current=disabled;
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Most dropdowns are closed. With ~60 rows, eagerly rendering their hidden
  // popovers creates thousands of offscreen option buttons whenever a cleared
  // search brings all rows back. Build options and mount the dialog only OPEN.
  const filteredOptions = useMemo(() => {
    if (!open) return [];
    const normalizedQuery = normalizeSearch(query);
    return normalizedQuery
      ? options.filter(option => normalizeSearch(option).includes(normalizedQuery))
      : options;
  }, [open, options, query]);
  const selectedIsFilteredOut = open && value !== '' && !filteredOptions.includes(value);
  // Present choices ONLY: no visual field/record heading or explanatory row.
  // Preserve an unrecognized legacy current value as a selectable choice so
  // that opening the editor never silently rewrites saved source data.
  const visibleOptions = open ? [
    ...(cellPickerCanClear(field,options) ? [{ value: '', label: '—' }] : []),
    ...(selectedIsFilteredOut ? [{ value, label: value }] : []),
    ...filteredOptions.filter(option => option !== '').map(option => ({ value: option, label: option })),
  ] : [];

  const close = (restoreFocus = false):Promise<void> => {
    requestEpoch.current++;
    switchingPointer.current=false;
    setOpen(false);
    setQuery('');
    setWaiting(false);
    const release=cancelUnused();
    releaseCellPickerClaim(triggerRef.current,release);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus({preventScroll:true}));
    return release;
  };

  const choose = (nextValue: string) => {
    if(nextValue===value){chosen.current=false;close(true);return;}
    chosen.current=true;
    onChange(nextValue);
    close(true);
  };

  useEffect(()=>{
    if(!leaseProps)return;
    const forced=()=>{void close();};
    window.addEventListener('hdnd:drain-editors',forced);
    return()=>window.removeEventListener('hdnd:drain-editors',forced);
  },[leaseProps,recordId,field]);
  // A popup may unmount during a role revoke, navigation or data generation
  // switch. Do not allow a late lease ACK to resurrect that editor.
  useEffect(()=>{
    const element=triggerRef.current;
    return()=>{requestEpoch.current++;releaseCellPickerClaim(element,cancelUnused());};
  },[]);
  useEffect(() => {
    if (!open) return;
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return;
    let frame=0;

    const placePopover=()=>{
      if (!popover.isConnected || !trigger.isConnected) return;
      const rect=trigger.getBoundingClientRect();
      const vv=window.visualViewport;
      const viewport:PickerViewport={
        left:vv?.offsetLeft??0,top:vv?.offsetTop??0,
        width:vv?.width??document.documentElement.clientWidth,
        height:vv?.height??document.documentElement.clientHeight
      };
      // A scrolled-away table cell cannot retain a floating editor.
      const scrollbox=trigger.closest('.item-table-scroll,.report-grid-scroll');
      const clip=scrollbox?.getBoundingClientRect();
      const insideViewport=rect.right>viewport.left+4&&
        rect.left<viewport.left+viewport.width-4&&
        rect.bottom>viewport.top+4&&rect.top<viewport.top+viewport.height-4;
      const insideTable=!clip||(rect.right>clip.left+2&&rect.left<clip.right-2&&
        rect.bottom>clip.top+2&&rect.top<clip.bottom-2);
      if(!insideViewport||!insideTable){void close();return;}
      // Compute the natural rendered height, NOT the former 360px cap.
      // This also recomputes after searchable option lists shrink.
      popover.style.maxHeight='none';
      const borders=parseFloat(getComputedStyle(popover).borderTopWidth||'0')+
        parseFloat(getComputedStyle(popover).borderBottomWidth||'0');
      const natural=Math.ceil(popover.scrollHeight+borders);
      const next=placeCellPicker(rect,natural,viewport);
      popover.style.left=next.left+'px';
      popover.style.top=next.top+'px';
      popover.style.width=next.width+'px';
      popover.style.maxHeight=next.maxHeight+'px';
      popover.dataset.placement=next.side;
    };
    const schedulePlace=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{frame=0;placePopover();});
    };
    placementRef.current=schedulePlace;
    if (!popover.matches(':popover-open')) popover.showPopover();
    placePopover();
    const onOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (popover.contains(target) || trigger.contains(target))) return;
      // Leave a real pointer sequence for the NEXT picker; its onClick
      // transfers the lease before it opens. Closing here destroys the
      // pointer's click target in certain table/popup layouts.
      const peer=target instanceof Element?target.closest('button.cell-picker-trigger'):null;
      if(peer instanceof HTMLButtonElement&&!peer.disabled){
        switchingPointer.current=true;
        return;
      }
      void close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void close(true);
      }
    };
    const focusFirstOption = () => {
      const current = visibleOptions.findIndex(option => option.value === value);
      optionRefs.current[current >= 0 ? current : 0]?.focus({preventScroll:true});
    };

    document.addEventListener('pointerdown', onOutsidePointer, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', schedulePlace);
    window.addEventListener('scroll', schedulePlace, true);
    window.visualViewport?.addEventListener('resize',schedulePlace);
    window.visualViewport?.addEventListener('scroll',schedulePlace);
    const observer=typeof ResizeObserver==='function'
      ?new ResizeObserver(schedulePlace):null;
    const list=popover.querySelector('.cell-picker-options');
    if(list)observer?.observe(list);
    observer?.observe(trigger);
    const firstFocus=requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus({preventScroll:true});
      else focusFirstOption();
      schedulePlace();
    });

    return () => {
      cancelAnimationFrame(firstFocus);
      if(frame)cancelAnimationFrame(frame);
      if(placementRef.current===schedulePlace)placementRef.current=null;
      observer?.disconnect();
      document.removeEventListener('pointerdown', onOutsidePointer, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', schedulePlace);
      window.removeEventListener('scroll', schedulePlace, true);
      window.visualViewport?.removeEventListener('resize',schedulePlace);
      window.visualViewport?.removeEventListener('scroll',schedulePlace);
      if (popover.matches(':popover-open')) popover.hidePopover();
    };
  }, [open]);
  useEffect(()=>{
    if(!open)return;
    placementRef.current?.();
  },[open,query,visibleOptions.length]);

  const focusOption = (index: number) => {
    const next = Math.max(0, Math.min(index, visibleOptions.length - 1));
    optionRefs.current[next]?.focus();
  };

  return <>
    <button
      ref={triggerRef}
      type="button"
      className="cell-value-button cell-picker-trigger"
      disabled={disabled||waiting}
      aria-busy={waiting}
      aria-label={displayValue?`${label}: ${value}`:label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={()=>{
        setLeaseError('');
        if(open){void close();return;}
        const trigger=triggerRef.current;
        if(!trigger||disabled||waiting)return;
        chosen.current=false;
        const epoch=++requestEpoch.current;
        setWaiting(true);
        // Claiming B synchronously closes A, then waits for A's safe lease
        // release. B still checks its own permission/lease before opening.
        void claimCellPicker(trigger,()=>close()).then(async()=>{
          if(epoch!==requestEpoch.current)return;
          if(leaseProps)await leaseManager!.acquire(recordId!,field!,editorKind);
          if(epoch!==requestEpoch.current||!trigger.isConnected||externallyDisabledRef.current){
            if(leaseProps&&!leaseManager!.isPending(recordId!,field!))
              await leaseManager!.cancel(recordId!,field!);
            return;
          }
          setQuery('');setOpen(true);
        }).catch(error=>{
          if(epoch===requestEpoch.current){
            releaseCellPickerClaim(trigger);
            setLeaseError(error instanceof Error?error.message:'Ô đang được sửa ở phiên khác.');
          }
        }).finally(()=>{
          if(epoch===requestEpoch.current)setWaiting(false);
        });
      }}
    >
      <span className="cell-picker-value-text"><SearchHighlight value={(displayValue??value) || '—'} query={highlightQuery}/></span>
    </button>
    {waiting&&<small className="cell-picker-note cell-picker-feedback" role="status">Đang xác nhận quyền sửa ô…</small>}
    {leaseError&&<small className="error-text" role="alert">{leaseError}</small>}
    {open && <div
      ref={popoverRef}
      className="cell-picker-popover"
      data-choices-only={!searchable ? 'true' : undefined}
      popover="manual"
      role="dialog"
      aria-label={label}
      onBlur={() => requestAnimationFrame(() => {
        const popover = popoverRef.current;
        if (popover && !popover.contains(document.activeElement)&&
            document.activeElement!==triggerRef.current&&!switchingPointer.current)
          void close();
      })}
    >
      {searchable && <label className="cell-picker-search">Tìm lựa chọn<input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(0); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(visibleOptions.length - 1); }
        else if (event.key === 'Enter' && filteredOptions.length) { event.preventDefault(); choose(filteredOptions[0]); }
      }} placeholder="Nhập để lọc" /></label>}
      <div className="cell-picker-options" role="listbox" aria-label={label}>
        {visibleOptions.map((option, index) => (
          <button
            key={`${option.value}:${index}`}
            ref={element => { optionRefs.current[index] = element; }}
            type="button"
            role="option"
            aria-selected={value === option.value}
            className="cell-picker-option"
            onClick={() => choose(option.value)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(index + 1); }
              else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(index - 1); }
            }}
          >
            {option.label}
          </button>
        ))}
        {!visibleOptions.length && <p className="cell-picker-empty">Không có lựa chọn phù hợp.</p>}
      </div>
    </div>}
  </>;
}
