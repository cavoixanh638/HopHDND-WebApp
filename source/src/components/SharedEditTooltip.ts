/** One immediate editing hint for all authorized source cells (including popup).
 * Event delegation and a manual popover avoid browser title delay and per-row
 * event handlers. Popover is in the top layer above modal dialogs.
 */
const WIDTH=112,HEIGHT=26;
let tooltip:HTMLDivElement|null=null;
let active:HTMLTableCellElement|null=null;
let refs=0;
let keyboard=false;
export function editTooltipPosition(rect:Pick<DOMRect,'left'|'right'|'top'|'bottom'>,
  vw:number,vh:number):{left:number;top:number}{
  const left=Math.max(6,Math.min((rect.left+rect.right)/2-WIDTH/2,Math.max(6,vw-WIDTH-6)));
  const above=rect.top-HEIGHT-6;
  const top=above>=6?above:rect.bottom+6;
  return {left:Math.round(left),top:Math.round(Math.max(6,Math.min(top,vh-HEIGHT-6)))};
}
function fromTarget(target:EventTarget|null):HTMLTableCellElement|null{
  if(!(target instanceof Element))return null;
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
function show(td:HTMLTableCellElement,focus:boolean):void{
  if(!tooltip)return;
  if(active===td){
    if(focus&&!keyboard){td.setAttribute('aria-describedby',tooltip.id);keyboard=true;}
    return;
  }
  hide();
  active=td;keyboard=focus;
  const pos=editTooltipPosition(td.getBoundingClientRect(),window.innerWidth,window.innerHeight);
  tooltip.style.transform=`translate3d(${pos.left}px,${pos.top}px,0)`;
  if(focus)td.setAttribute('aria-describedby',tooltip.id);
  tooltip.showPopover();
}
function over(event:PointerEvent):void{
  if(event.pointerType==='touch')return;
  const td=fromTarget(event.target);
  if(td&&!(event.target instanceof Element&&event.target.closest('.cell-history-action')))show(td,false);
}
function out(event:PointerEvent):void{
  if(fromTarget(event.target)!==active)return;
  if(fromTarget(event.relatedTarget)===active)return;
  if(keyboard&&active?.contains(document.activeElement))return;
  hide();
}
function focus(event:FocusEvent):void{
  const td=fromTarget(event.target);
  if(td&&event.target instanceof Element&&event.target.matches(':focus-visible'))show(td,true);
}
function blur(event:FocusEvent):void{if(fromTarget(event.target)===active)hide();}
function attach():void{
  document.addEventListener('pointerover',over,true);
  document.addEventListener('pointerout',out,true);
  document.addEventListener('focusin',focus,true);
  document.addEventListener('focusout',blur,true);
  document.addEventListener('pointerdown',hide,true);
  window.addEventListener('scroll',hide,true);
  window.addEventListener('resize',hide);
}
function detach():void{
  document.removeEventListener('pointerover',over,true);
  document.removeEventListener('pointerout',out,true);
  document.removeEventListener('focusin',focus,true);
  document.removeEventListener('focusout',blur,true);
  document.removeEventListener('pointerdown',hide,true);
  window.removeEventListener('scroll',hide,true);
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
