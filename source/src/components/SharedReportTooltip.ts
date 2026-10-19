/**
 * One stable tooltip shared by five report tables.
 *
 * Modern browsers use CSS anchor positioning + :has(:hover). That path has
 * ZERO JS event handlers, coordinate calculations, style writes or React work
 * on hover. The browser places one static tooltip relative to the hovered cell.
 * Older browsers use a small delegated pointer/focus fallback.
 */
const SELECTOR='.report-surface .report-table button.count-drill';
const TEXT='Click để xem chi tiết';
let node:HTMLDivElement|null=null;
let active:HTMLButtonElement|null=null;
let hosts=0;
let pointerActive=false;
let fallbackAttached=false;

function supportsNativeAnchorHover():boolean {
  return typeof CSS!=='undefined'&&
    CSS.supports('anchor-name','--report-hover-anchor')&&
    CSS.supports('position-anchor','--report-hover-anchor')&&
    CSS.supports('position-area','bottom center')&&
    CSS.supports('selector(body:has(.count-drill:hover))');
}

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
/** Fallback only; modern CSS mode never enters this function. */
function show(button:HTMLButtonElement,x:number,y:number,pointer:boolean):void {
  if(!node)return;
  if(active===button){if(pointer)pointerActive=true;return;}
  if(active)active.removeAttribute('aria-describedby');
  active=button;
  pointerActive=pointer;
  button.setAttribute('aria-describedby',node.id);
  const left=x+202>window.innerWidth?x-200:x+12;
  const top=y+52>window.innerHeight?y-43:y+15;
  node.style.transform=`translate3d(${Math.round(Math.max(6,left))}px,${Math.round(Math.max(6,top))}px,0)`;
  node.dataset.visible='true';
}
function onPointerOver(event:PointerEvent):void {
  if(event.pointerType==='touch')return;
  const button=buttonFrom(event.target);
  if(button)show(button,event.clientX,event.clientY,true);
}
function onPointerOut(event:PointerEvent):void {
  if(!active||!pointerActive||buttonFrom(event.target)!==active)return;
  const next=buttonFrom(event.relatedTarget);
  if(next===active||next)return;
  if(document.activeElement!==active)hide();
  else pointerActive=false;
}
function onFocusIn(event:FocusEvent):void {
  const button=buttonFrom(event.target);
  if(!button)return;
  const rect=button.getBoundingClientRect();
  show(button,rect.left+rect.width/2,rect.bottom,false);
}
function onFocusOut(event:FocusEvent):void {
  if(buttonFrom(event.target)===active&&!pointerActive)hide();
}
function onPointerDown():void {hide();}
function onKeyDown(event:KeyboardEvent):void {if(event.key==='Escape')hide();}
function attachFallback():void {
  if(fallbackAttached)return;
  document.addEventListener('pointerover',onPointerOver,true);
  document.addEventListener('pointerout',onPointerOut,true);
  document.addEventListener('focusin',onFocusIn,true);
  document.addEventListener('focusout',onFocusOut,true);
  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('keydown',onKeyDown,true);
  window.addEventListener('scroll',hide,true);
  window.addEventListener('resize',hide);
  fallbackAttached=true;
}
function detachFallback():void {
  if(!fallbackAttached)return;
  document.removeEventListener('pointerover',onPointerOver,true);
  document.removeEventListener('pointerout',onPointerOut,true);
  document.removeEventListener('focusin',onFocusIn,true);
  document.removeEventListener('focusout',onFocusOut,true);
  document.removeEventListener('pointerdown',onPointerDown,true);
  document.removeEventListener('keydown',onKeyDown,true);
  window.removeEventListener('scroll',hide,true);
  window.removeEventListener('resize',hide);
  fallbackAttached=false;
}
/** One mounted host (and at most one fallback listener set) for all reports. */
export function mountSharedReportTooltip():()=>void {
  if(typeof document==='undefined'||!document.body)return ()=>{};
  hosts++;
  if(hosts===1){
    node=document.createElement('div');
    node.id='report-shared-tooltip';
    node.className='report-shared-tooltip';
    node.setAttribute('role','tooltip');
    node.dataset.visible='false';
    node.dataset.mode=supportsNativeAnchorHover()?'native':'fallback';
    node.textContent=TEXT;
    document.body.appendChild(node);
    if(node.dataset.mode==='fallback')attachFallback();
  }
  return ()=>{
    hosts=Math.max(0,hosts-1);
    if(hosts===0){hide();detachFallback();node?.remove();node=null;}
  };
}
