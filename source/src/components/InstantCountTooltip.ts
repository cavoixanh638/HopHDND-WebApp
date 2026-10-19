/** A prewarmed, compositor-positioned tooltip shared by all five reports.
 *
 * Pointer hover never creates/removes DOM, never reads layout and never asks
 * React/Preact to rerender. The tooltip uses transform to avoid layout thrash.
 * The only getBoundingClientRect is the keyboard-focus fallback, not hover.
 */
let tooltip:HTMLDivElement|null=null;
let activeButton:HTMLElement|null=null;
let activeCount=-1;
let listenersInstalled=false;

export function prewarmInstantCountTooltip():void {
  if(typeof document==='undefined'||!document.body)return;
  if(!tooltip||!tooltip.isConnected){
    tooltip=document.createElement('div');
    tooltip.id='report-instant-count-tooltip';
    tooltip.className='report-instant-count-tooltip';
    tooltip.setAttribute('role','tooltip');
    tooltip.dataset.visible='false';
    document.body.appendChild(tooltip);
    activeButton=null;
    activeCount=-1;
  }
  if(!listenersInstalled){
    // One set of listeners for the entire app, not one set per hovered cell.
    window.addEventListener('scroll',hideInstantCountTooltip,true);
    window.addEventListener('resize',hideInstantCountTooltip);
    listenersInstalled=true;
  }
}

export function hideInstantCountTooltip():void {
  if(!activeButton)return;
  if(activeButton.getAttribute('aria-describedby')==='report-instant-count-tooltip')
    activeButton.removeAttribute('aria-describedby');
  activeButton=null;
  if(tooltip)tooltip.dataset.visible='false';
}

export function showInstantCountTooltip(
  button:HTMLElement,count:number,pointer?:{clientX:number;clientY:number}
):void {
  if(activeButton===button)return;
  prewarmInstantCountTooltip();
  if(!tooltip)return;
  if(activeButton)activeButton.removeAttribute('aria-describedby');
  activeButton=button;
  button.setAttribute('aria-describedby',tooltip.id);
  if(activeCount!==count){
    tooltip.textContent=`Bấm để xem ${count} nội dung`;
    activeCount=count;
  }

  // Pointer events already contain viewport coordinates: no forced layout read.
  // For Tab focus alone we may measure the element once as a fallback.
  const anchor=pointer??(()=>{
    const rect=button.getBoundingClientRect();
    return {clientX:rect.left+rect.width/2,clientY:rect.bottom};
  })();
  const right=anchor.clientX>window.innerWidth-240;
  const bottom=anchor.clientY>window.innerHeight-76;
  const x=Math.max(8,Math.min(window.innerWidth-208,anchor.clientX+(right?-208:12)));
  const y=Math.max(8,Math.min(window.innerHeight-50,anchor.clientY+(bottom?-46:15)));
  // Compositor-only transform; no offsetWidth/Height or position readback.
  tooltip.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
  tooltip.dataset.visible='true';
}
