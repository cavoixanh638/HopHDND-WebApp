/**
 * One static, fixed-size tooltip for every populated report cell.
 *
 * The visible string is allocated only when this host mounts, never per hover.
 * Document-level event delegation avoids thousands of per-cell handlers.
 * Pointer-enter placement uses event coordinates, with no DOM measurements,
 * timer, React state, popper library or network request. It does not follow
 * pointermove, so quickly traversing the table does not repaint each pixel.
 */
const SELECTOR='.report-surface .report-table button.count-drill';
const TEXT='Click để xem chi tiết';
let node:HTMLDivElement|null=null;
let active:HTMLButtonElement|null=null;
let hosts=0;
let pointerActive=false;

function buttonFrom(target:EventTarget|null):HTMLButtonElement|null {
  if(!(target instanceof Element))return null;
  const button=target.closest(SELECTOR);
  return button instanceof HTMLButtonElement?button:null;
}

function hide():void {
  if(!node||!active)return;
  active.removeAttribute('aria-describedby');
  active=null;
  pointerActive=false;
  node.dataset.visible='false';
}

function show(button:HTMLButtonElement,clientX:number,clientY:number,fromPointer:boolean):void {
  if(!node)return;
  if(active===button){
    if(fromPointer)pointerActive=true;
    return;
  }
  if(active)active.removeAttribute('aria-describedby');
  active=button;
  pointerActive=fromPointer;
  button.setAttribute('aria-describedby',node.id);
  // Fixed 190x32px panel; position from event coordinates only, no layout read.
  // Flip near screen edges. Placement updates only when the hovered CELL changes.
  const x=clientX+202>window.innerWidth?clientX-200:clientX+12;
  const y=clientY+52>window.innerHeight?clientY-43:clientY+15;
  node.style.transform=`translate3d(${Math.round(Math.max(6,x))}px,${Math.round(Math.max(6,y))}px,0)`;
  node.dataset.visible='true';
}

function onPointerOver(event:PointerEvent):void {
  if(event.pointerType==='touch')return;
  const button=buttonFrom(event.target);
  if(!button)return;
  show(button,event.clientX,event.clientY,true);
}
function onPointerOut(event:PointerEvent):void {
  if(!active||!pointerActive)return;
  const leaving=buttonFrom(event.target);
  if(leaving!==active)return;
  // Don't flicker between the number and other descendants of the same cell.
  const next=buttonFrom(event.relatedTarget);
  if(next===active)return;
  // Preserve the one visible tooltip when sweeping directly into another cell.
  if(next)return;
  if(document.activeElement!==active)hide();
  else pointerActive=false;
}
function onFocusIn(event:FocusEvent):void {
  const button=buttonFrom(event.target);
  if(!button)return;
  // Keyboard focus needs one trigger rect read; pointer path needs none.
  const rect=button.getBoundingClientRect();
  show(button,rect.left+rect.width/2,rect.bottom,false);
}
function onFocusOut(event:FocusEvent):void {
  if(buttonFrom(event.target)!==active)return;
  if(pointerActive)return;
  hide();
}
function onPointerDown():void {hide();}
function onKeyDown(event:KeyboardEvent):void {
  if(event.key==='Escape')hide();
}

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

/** Called by each mounted ReportTable; only the first call creates the panel. */
export function mountSharedReportTooltip():()=>void {
  if(typeof document==='undefined'||!document.body)return ()=>{};
  hosts++;
  if(hosts===1){
    node=document.createElement('div');
    node.id='report-shared-tooltip';
    node.className='report-shared-tooltip';
    node.setAttribute('role','tooltip');
    node.dataset.visible='false';
    node.textContent=TEXT;
    document.body.appendChild(node);
    attach();
  }
  return ()=>{
    hosts=Math.max(0,hosts-1);
    if(hosts===0){
      hide();detach();node?.remove();node=null;
    }
  };
}
