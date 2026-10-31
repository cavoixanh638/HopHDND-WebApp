import {outsideCellTooltipPosition} from './TooltipPlacement';

/** One immediate editing hint for all authorized source cells (including popup).
 * Event delegation and a manual popover avoid browser title delay and per-row
 * event handlers. Popover is in the top layer above modal dialogs.
 */
const WIDTH=112,HISTORY_WIDTH=182,HEIGHT=26;
let tooltip:HTMLDivElement|null=null;
let active:HTMLElement|null=null;
let refs=0;
let keyboard=false;
export function editTooltipPosition(rect:Pick<DOMRect,'left'|'right'|'top'|'bottom'>,
  vw:number,vh:number):{left:number;top:number}{
  return outsideCellTooltipPosition(rect,vw,vh,WIDTH,HEIGHT);
}
function fromTarget(target:EventTarget|null):HTMLElement|null{
  if(!(target instanceof Element))return null;
  const locked=target.closest('.business-build-locked[data-quick-tooltip]');
  if(locked instanceof HTMLElement&&locked.closest('table.item-data-table,table.report-detail-grid'))return locked;
  const history=target.closest('button.cell-history-action[data-quick-tooltip]');
  if(history instanceof HTMLButtonElement&&
    history.closest('table.item-data-table,table.report-detail-grid'))return history;
  // Within a merged display cell only its separately authorized source controls
  // provide edit hints; hovering the other read-only field must not suggest editing.
  const merged=target.closest('td.compact-merged-cell');
  if(merged){
    const editable=target.closest('.compact-part-editable');
    return editable instanceof HTMLElement?editable:null;
  }
  const td=target.closest('td.editable-cell');
  return td instanceof HTMLTableCellElement&&
    !!td.closest('table.item-data-table,table.report-detail-grid')?td:null;
}
function hide():void{
  if(keyboard&&tooltip&&active?.getAttribute('aria-describedby')===tooltip.id)
    active.removeAttribute('aria-describedby');
  active=null;keyboard=false;
  if(tooltip?.matches(':popover-open'))tooltip.hidePopover();
}
function show(target:HTMLElement,focus:boolean):void{
  if(!tooltip)return;
  if(active===target){
    if(focus&&!keyboard){target.setAttribute('aria-describedby',tooltip.id);keyboard=true;}
    return;
  }
  hide();
  active=target;keyboard=focus;
  const text=target.getAttribute('data-quick-tooltip')||'Bấm để sửa';
  const isLocked=target.classList.contains('business-build-locked');
  const width=isLocked?Math.min(450,Math.max(160,window.innerWidth-24)):
    target.classList.contains('cell-history-action')?HISTORY_WIDTH:WIDTH;
  tooltip.textContent=text;
  tooltip.style.setProperty('--edit-tooltip-width',width+'px');
  // This longer explanation wraps and is measured AFTER entering the top
  // layer. Existing short edit/history hints keep their original 26px geometry.
  tooltip.style.height=isLocked?'auto':'26px';
  tooltip.style.minHeight=isLocked?'34px':'';
  tooltip.style.whiteSpace=isLocked?'normal':'nowrap';
  tooltip.style.textAlign=isLocked?'left':'center';
  if(focus)target.setAttribute('aria-describedby',tooltip.id);
  tooltip.style.visibility='hidden';
  tooltip.showPopover();
  const height=isLocked?Math.max(HEIGHT,tooltip.getBoundingClientRect().height):HEIGHT;
  const pos=outsideCellTooltipPosition(target.getBoundingClientRect(),
    window.innerWidth,window.innerHeight,width,height);
  tooltip.style.transform=`translate3d(${pos.left}px,${pos.top}px,0)`;
  tooltip.style.visibility='visible';
}
function over(event:PointerEvent):void{
  if(event.pointerType==='touch')return;
  const element=fromTarget(event.target);
  if(element)show(element,false);
}
function out(event:PointerEvent):void{
  if(fromTarget(event.target)!==active)return;
  if(fromTarget(event.relatedTarget)===active)return;
  if(keyboard&&active?.contains(document.activeElement))return;
  hide();
}
function focus(event:FocusEvent):void{
  const td=fromTarget(event.target);
  if(td&&event.target instanceof Element&&
    (event.target.matches(':focus-visible')||td.classList.contains('business-build-locked')))show(td,true);
}
function blur(event:FocusEvent):void{if(fromTarget(event.target)===active)hide();}
/** Keep a keyboard-focused locked explanation legible while the browser
 * scrolls the source cell into view; pointer hints retain hide-on-scroll.
 * Reposition the ONE shared top-layer tooltip, never create row listeners. */
function scrollTooltip():void{
  if(keyboard&&active?.classList.contains('business-build-locked')&&
    document.activeElement===active&&tooltip?.matches(':popover-open')){
    const width=tooltip.getBoundingClientRect().width;
    const height=tooltip.getBoundingClientRect().height;
    const pos=outsideCellTooltipPosition(active.getBoundingClientRect(),
      window.innerWidth,window.innerHeight,width,height);
    tooltip.style.transform=`translate3d(${pos.left}px,${pos.top}px,0)`;
    return;
  }
  hide();
}
function attach():void{
  document.addEventListener('pointerover',over,true);
  document.addEventListener('pointerout',out,true);
  document.addEventListener('focusin',focus,true);
  document.addEventListener('focusout',blur,true);
  document.addEventListener('pointerdown',hide,true);
  window.addEventListener('scroll',scrollTooltip,true);
  window.addEventListener('resize',hide);
}
function detach():void{
  document.removeEventListener('pointerover',over,true);
  document.removeEventListener('pointerout',out,true);
  document.removeEventListener('focusin',focus,true);
  document.removeEventListener('focusout',blur,true);
  document.removeEventListener('pointerdown',hide,true);
  window.removeEventListener('scroll',scrollTooltip,true);
  window.removeEventListener('resize',hide);
}
export function mountSharedEditTooltip():()=>void{
  if(typeof document==='undefined'||!document.body)return ()=>{};
  refs++;
  if(refs===1){
    tooltip=document.createElement('div');
    tooltip.id='edit-shared-tooltip';
    tooltip.className='edit-shared-tooltip';
    tooltip.setAttribute('role','tooltip');
    tooltip.setAttribute('popover','manual');
    tooltip.textContent='Bấm để sửa';
    document.body.appendChild(tooltip);
    attach();
  }
  return ()=>{refs=Math.max(0,refs-1);if(!refs){hide();detach();tooltip?.remove();tooltip=null;}};
}
