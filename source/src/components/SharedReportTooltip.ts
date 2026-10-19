/**
 * Single pre-mounted tooltip shared by all report count cells.
 *
 * Browser A/B (36 real Chrome pointer moves x 2, 7,976 DOM nodes) found CSS
 * body:has()+anchor positioning costs ~32ms layout and ~10.7ms style per sweep.
 * Delegated pointerover below does zero layout reads, never changes text,
 * reuses one node and updates position only when moving to a DIFFERENT cell.
 * Pointer paths do not mutate aria-describedby (accessibility tree churn).
 */
const SELECTOR='button.count-drill';
let tooltip:HTMLDivElement|null=null;
let active:HTMLButtonElement|null=null;
let hosts=0;
let shown=false;
let keyboard=false;
const WIDTH=190;
const HEIGHT=32;

function buttonFrom(target:EventTarget|null):HTMLButtonElement|null {
  if(!(target instanceof Element))return null;
  const button=target.closest(SELECTOR);
  return button instanceof HTMLButtonElement&&!!button.closest('.report-surface .report-table')?button:null;
}
function hide():void {
  if(!tooltip||!active)return;
  if(keyboard&&active.getAttribute('aria-describedby')===tooltip.id)
    active.removeAttribute('aria-describedby');
  active=null;
  keyboard=false;
  if(shown){tooltip.dataset.visible='false';shown=false;}
}
function show(button:HTMLButtonElement,x:number,y:number,fromKeyboard:boolean):void {
  if(!tooltip)return;
  if(active===button)return;
  if(keyboard&&active?.getAttribute('aria-describedby')===tooltip.id)
    active.removeAttribute('aria-describedby');
  active=button;
  keyboard=fromKeyboard;
  // Pointer path: no geometry/style reads; no text/ARIA changes.
  // Fixed 190x32 bounding box, flip based only on viewport coordinates.
  const left=x+WIDTH+18>window.innerWidth?x-WIDTH-10:x+12;
  const top=y+HEIGHT+22>window.innerHeight?y-HEIGHT-11:y+14;
  tooltip.style.transform=`translate3d(${Math.round(Math.max(6,left))}px,${Math.round(Math.max(6,top))}px,0)`;
  if(fromKeyboard)button.setAttribute('aria-describedby',tooltip.id);
  if(!shown){tooltip.dataset.visible='true';shown=true;}
}
function onPointerOver(event:PointerEvent):void {
  if(event.pointerType==='touch')return;
  const button=buttonFrom(event.target);
  if(button)show(button,event.clientX,event.clientY,false);
}
function onPointerOut(event:PointerEvent):void {
  if(!active||buttonFrom(event.target)!==active)return;
  const next=buttonFrom(event.relatedTarget);
  if(next===active||next)return;
  // Keep tooltip for a keyboard-focused button even as pointer leaves it.
  if(document.activeElement===active&&keyboard)return;
  hide();
}
function onFocusIn(event:FocusEvent):void {
  const button=buttonFrom(event.target);
  if(!button||!button.matches(':focus-visible'))return;
  const rect=button.getBoundingClientRect(); // One read, keyboard only.
  show(button,rect.left+rect.width/2,rect.bottom,true);
}
function onFocusOut(event:FocusEvent):void {
  if(buttonFrom(event.target)===active)hide();
}
function onPointerDown():void {hide();}
function onKeyDown(event:KeyboardEvent):void {if(event.key==='Escape')hide();}
function attach():void {
  document.addEventListener('pointerover',onPointerOver,true);
  document.addEventListener('pointerout',onPointerOut,true);
  document.addEventListener('focusin',onFocusIn,true);
  document.addEventListener('focusout',onFocusOut,true);
  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('keydown',onKeyDown,true);
  window.addEventListener('scroll',hide,true);
  window.addEventListener('resize',hide);
}
function detach():void {
  document.removeEventListener('pointerover',onPointerOver,true);
  document.removeEventListener('pointerout',onPointerOut,true);
  document.removeEventListener('focusin',onFocusIn,true);
  document.removeEventListener('focusout',onFocusOut,true);
  document.removeEventListener('pointerdown',onPointerDown,true);
  document.removeEventListener('keydown',onKeyDown,true);
  window.removeEventListener('scroll',hide,true);
  window.removeEventListener('resize',hide);
}
/** All five tables mount this host; only the first creates the shared tooltip. */
export function mountSharedReportTooltip():()=>void {
  if(typeof document==='undefined'||!document.body)return ()=>{};
  hosts++;
  if(hosts===1){
    tooltip=document.createElement('div');
    tooltip.id='report-shared-tooltip';
    tooltip.className='report-shared-tooltip';
    tooltip.setAttribute('role','tooltip');
    tooltip.dataset.visible='false';
    tooltip.dataset.mode='delegated';
    tooltip.textContent='Click để xem chi tiết';
    document.body.appendChild(tooltip);
    attach();
  }
  return ()=>{
    hosts=Math.max(0,hosts-1);
    if(hosts===0){
      hide();detach();tooltip?.remove();tooltip=null;
    }
  };
}
