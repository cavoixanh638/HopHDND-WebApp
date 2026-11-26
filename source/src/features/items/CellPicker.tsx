import { useEffect, useMemo, useRef, useState } from 'react';
import {claimCellPicker,releaseCellPickerClaim} from './pr95-v5-l1-picker-coordinator';
import type {PickerViewport} from './pr95-v5-l1-picker-placement';
import {positionCellPickerPopover} from './CellPickerPositioning';
import { normalizeSearch } from '../../domain/search';
import {displayOrganisationName,organisationSearchText} from '../../domain/organisation-display';
import {SearchHighlight} from './SearchHighlight';
import {CellPickerPopupView} from './CellPickerPopupView';
import type {CellEditSessionManager,EditorKind} from '../../data/cell-edit-leases';
import type {EditableField} from '../../../shared/types';
import {directStatusCasField} from '../../data/status-direct-cas';
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
  /** false means the action was rejected before a draft was accepted. */
  onChange: (value: string) => boolean|void;
  leaseManager?:CellEditSessionManager;recordId?:string;field?:EditableField;editorKind?:EditorKind;
  /** True only after the matching server Rules have been activated and verified. */
  directStatusCas?:boolean;
};

export function CellPicker({ label, value, displayValue, options, searchable = false, disabled = false, highlightQuery, onChange, leaseManager,recordId,field,editorKind='status',directStatusCas=false }: CellPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [waiting,setWaiting]=useState(false);
  const [leaseError,setLeaseError]=useState('');
  const chosen=useRef(false);
  const requestEpoch=useRef(0);
  const pendingAcquire=useRef<Promise<void>|null>(null);
  // A canceled editing cycle owns ONE release Promise. Its late ACK must
  // finish before another picker on the same field may acquire a lease.
  const pendingRelease=useRef<Promise<void>|null>(null);
  const claimedInCycle=useRef(false);
  const placementRef=useRef<(()=>void)|null>(null);
  const switchingPointer=useRef(false);
  // Department choices must be searchable everywhere (List, compact cells,
  // report popup). Keep the existing specialist search unchanged.
  const departmentPicker=field==='department';
  const searchablePicker=searchable||departmentPicker;
  const departmentFiltering=departmentPicker&&normalizeSearch(query).length>0;
  // A discrete status selection accepts a local draft immediately. The server
  // enforces permissions, conflicts and row history in ONE guarded transaction.
  const direct=directStatusCas&&directStatusCasField(field);
  const leaseProps=!direct&&!!leaseManager&&!!recordId&&!!field;
  const cancelUnused=():Promise<void>=>{
    if(leaseProps&&!chosen.current&&!leaseManager!.isPending(recordId!,field!))
      return leaseManager!.cancel(recordId!,field!);
    return Promise.resolve();
  };
  const releaseAfterAcquire=():Promise<void>=>{
    // Share the same fence across close, unmount and stale callbacks.
    // A second cleanup must never cancel B's newly acquired same-field lease.
    if(pendingRelease.current)return pendingRelease.current;
    // An unused sibling/popup picker must never cancel a lease opened by B
    // on the same record/field after A's unmount.
    if(!claimedInCycle.current)return Promise.resolve();
    const inFlight=pendingAcquire.current;
    const release=inFlight?inFlight.catch(()=>{}).then(cancelUnused):cancelUnused();
    pendingRelease.current=release;
    return release;
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
      ? options.filter(option => normalizeSearch(organisationSearchText(field??'',option)).includes(normalizedQuery))
      : options;
  }, [open, options, query, field]);
  const selectedIsFilteredOut = open && value !== '' && !filteredOptions.includes(value);
  // Present choices ONLY: no visual field/record heading or explanatory row.
  // Preserve an unrecognized legacy current value as a selectable choice so
  // that opening the editor never silently rewrites saved source data.
  const visibleOptions = open ? [
    ...(cellPickerCanClear(field,options)&&!departmentFiltering ? [{ value: '', label: '—' }] : []),
    ...(selectedIsFilteredOut&&!departmentFiltering ? [{ value, label: displayOrganisationName(field??'',value) }] : []),
    ...filteredOptions.filter(option => option !== '').map(option => ({ value: option, label: displayOrganisationName(field??'',option) })),
  ] : [];

  const close = (restoreFocus = false):Promise<void> => {
    requestEpoch.current++;
    switchingPointer.current=false;
    setOpen(false);
    setQuery('');
    setWaiting(false);
    // A may still be awaiting a server ACK. Its eventual lease must be
    // canceled before another picker acquires the same record/field.
    const release=releaseAfterAcquire();
    releaseCellPickerClaim(triggerRef.current,release);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus({preventScroll:true}));
    return release;
  };

  const choose = (nextValue: string) => {
    // Non-direct editing cannot accept a draft before the server lease grants.
    // Direct status saves are validated by the server transaction instead.
    // The UI-only view cannot bypass edit entitlement or invent a selection:
    // only a currently offered value may reach the guarded onChange callback.
    if(waiting||externallyDisabledRef.current||
       !visibleOptions.some(option=>option.value===nextValue))return;
    if(nextValue===value){chosen.current=false;close(true);return;}
    try{
      chosen.current=onChange(nextValue)!==false;
    }catch(error){
      chosen.current=false;
      setLeaseError(error instanceof Error?error.message:'Không áp dụng được lựa chọn.');
    }
    void close(true);
  };

  useEffect(()=>{
    if(!leaseProps)return;
    const forced=()=>{void close();};
    window.addEventListener('hdnd:drain-editors',forced);
    return()=>window.removeEventListener('hdnd:drain-editors',forced);
  },[leaseProps,recordId,field]);
  // A late permission revocation closes the locally open selector immediately.
  useEffect(()=>{if(disabled&&open)void close();},[disabled]);
  // A popup may unmount during a role revoke, navigation or data generation
  // switch. Do not allow a late lease ACK to resurrect that editor.
  useEffect(()=>{
    const element=triggerRef.current;
    return()=>{
      requestEpoch.current++;
      // If popup unmounts before acquire ACK, cancel() must run AFTER ACK.
      // Reuse close's release (if any), not a second cancel that could revoke
      // the next picker after the global coordinator has handed off.
      releaseCellPickerClaim(element,releaseAfterAcquire());
    };
  },[]);
  useEffect(() => {
    if (!open) return;
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return;
    let frame=0;

    const placePopover=()=>{
      const vv=window.visualViewport;
      const viewport:PickerViewport={
        left:vv?.offsetLeft??0,top:vv?.offsetTop??0,
        width:vv?.width??document.documentElement.clientWidth,
        height:vv?.height??document.documentElement.clientHeight
      };
      // Presentation math is isolated; core retains authority to close an
      // editor that has scrolled outside its table or the visual viewport.
      if(positionCellPickerPopover(popover,trigger,viewport,departmentPicker)==='outside')
        void close();
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

    const onViewportScroll=(event:Event)=>{
      // Captured scroll events include the popover's own scroll. Its options
      // must remain a stable, independently scrollable area.
      if(event.target instanceof Node&&popover.contains(event.target))return;
      schedulePlace();
    };

    document.addEventListener('pointerdown', onOutsidePointer, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', schedulePlace);
    window.addEventListener('scroll', onViewportScroll, true);
    window.visualViewport?.addEventListener('resize',schedulePlace);
    window.visualViewport?.addEventListener('scroll',schedulePlace);
    const observer=typeof ResizeObserver==='function'
      ?new ResizeObserver(schedulePlace):null;
    const list=popover.querySelector('.cell-picker-options');
    if(list)observer?.observe(list);
    observer?.observe(trigger);
    const firstFocus=requestAnimationFrame(() => {
      if (searchablePicker) searchRef.current?.focus({preventScroll:true});
      else if(!waiting)focusFirstOption();
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
      window.removeEventListener('scroll', onViewportScroll, true);
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
    if(waiting)return;
    const next = Math.max(0, Math.min(index, visibleOptions.length - 1));
    optionRefs.current[next]?.focus();
  };
  // An option cannot be focused while disabled. Move focus into the list as
  // soon as the server grants the lease, preserving keyboard navigation.
  useEffect(()=>{
    if(!open||waiting||searchablePicker)return;
    const frame=requestAnimationFrame(()=>{
      const current=visibleOptions.findIndex(option=>option.value===value);
      optionRefs.current[current>=0?current:0]?.focus({preventScroll:true});
    });
    return()=>cancelAnimationFrame(frame);
  },[open,waiting,searchablePicker]);

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
        claimedInCycle.current=true;
        pendingRelease.current=null; // new claim, old fence stays in coordinator
        const epoch=++requestEpoch.current;
        setQuery('');
        setWaiting(!direct);
        // With matching direct-CAS Rules, choices are enabled immediately.
        // All other fields still wait for the authoritative lease.
        setOpen(true);
        // Claiming B synchronously closes A, then waits for A's safe lease
        // release. B still checks its own permission/lease before opening.
        const operation=claimCellPicker(trigger,()=>close()).then(async()=>{
          if(epoch!==requestEpoch.current)return;
          if(leaseProps)await leaseManager!.acquire(recordId!,field!,editorKind);
          // A dismissed/unmounted request does not cancel here; its
          // releaseAfterAcquire() fence owns that cancel exactly once.
          if(epoch!==requestEpoch.current)return;
          if(!trigger.isConnected||externallyDisabledRef.current){
            await cancelUnused();
            return;
          }
          setQuery('');setOpen(true);
        }).catch(error=>{
          if(epoch===requestEpoch.current){
            setOpen(false);
            releaseCellPickerClaim(trigger);
            setLeaseError(error instanceof Error?error.message:'Ô đang được sửa ở phiên khác.');
          }
        }).finally(()=>{
          if(epoch===requestEpoch.current)setWaiting(false);
        });
        pendingAcquire.current=operation;
        void operation.then(()=>{if(pendingAcquire.current===operation)pendingAcquire.current=null;});
      }}
    >
      <span className="cell-picker-value-text"><SearchHighlight value={(displayValue??displayOrganisationName(field??'',value)) || '—'} query={highlightQuery}/></span>
    </button>
    {leaseError&&<small className="error-text" role="alert">{leaseError}</small>}
    {open&&<CellPickerPopupView
      label={label}
      value={value}
      query={query}
      options={visibleOptions}
      searchable={searchablePicker}
      department={departmentPicker}
      waiting={waiting}
      selectedIsFilteredOut={selectedIsFilteredOut}
      popoverRef={popoverRef}
      searchRef={searchRef}
      optionRefs={optionRefs}
      onBlur={()=>requestAnimationFrame(()=>{
        const popover=popoverRef.current;
        if(popover&&!popover.contains(document.activeElement)&&
          document.activeElement!==triggerRef.current&&!switchingPointer.current)
          void close();
      })}
      onQueryChange={nextQuery=>{
        setQuery(nextQuery);
        const optionsList=popoverRef.current?.querySelector<HTMLElement>('.cell-picker-options');
        if(optionsList)optionsList.scrollTop=0;
      }}
      onQueryKeyDown={event=>{
        if(event.key==='ArrowDown'){event.preventDefault();focusOption(0);}
        else if(event.key==='ArrowUp'){event.preventDefault();focusOption(visibleOptions.length-1);}
        else if(event.key==='Enter'&&filteredOptions.length){
          event.preventDefault();choose(filteredOptions[0]);
        }
      }}
      onChoose={choose}
      onOptionKeyDown={(event,index,selected)=>{
        if(event.key==='ArrowDown'){event.preventDefault();focusOption(index+1);}
        else if(event.key==='ArrowUp'){event.preventDefault();focusOption(index-1);}
        else if(event.key==='Enter'||event.key===' '){
          event.preventDefault();choose(selected);
        }
      }}
    />}
  </>;
}
