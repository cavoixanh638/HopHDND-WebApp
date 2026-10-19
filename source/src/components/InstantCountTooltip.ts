/** Native HTML title tooltips wait for browser hover dwell time. This single
 * body-mounted tooltip appears synchronously on pointer entry and never causes a
 * React render of the report grid. It also escapes the scrolling table viewport. */
let active: {button:HTMLElement;node:HTMLDivElement}|null=null;

const closeForMovement=()=>hideInstantCountTooltip();

export function hideInstantCountTooltip():void {
  if(!active)return;
  const {button,node}=active;
  active=null;
  if(button.getAttribute('aria-describedby')===node.id)button.removeAttribute('aria-describedby');
  node.remove();
  window.removeEventListener('scroll',closeForMovement,true);
  window.removeEventListener('resize',closeForMovement);
}

export function showInstantCountTooltip(button:HTMLElement,count:number):void {
  if(active?.button===button)return;
  hideInstantCountTooltip();
  const node=document.createElement('div');
  node.id='report-instant-count-tooltip';
  node.className='report-instant-count-tooltip';
  node.setAttribute('role','tooltip');
  node.textContent=`Bấm để xem ${count} nội dung`;
  document.body.appendChild(node);
  button.setAttribute('aria-describedby',node.id);
  active={button,node};
  // Use viewport coordinates so scrolling containers cannot clip the tooltip.
  const rect=button.getBoundingClientRect();
  const width=node.offsetWidth,height=node.offsetHeight;
  const left=Math.max(8,Math.min(window.innerWidth-width-8,rect.left+(rect.width-width)/2));
  const above=rect.top-height-8;
  node.style.left=`${left}px`;
  node.style.top=`${above>=8?above:Math.min(window.innerHeight-height-8,rect.bottom+8)}px`;
  window.addEventListener('scroll',closeForMovement,true);
  window.addEventListener('resize',closeForMovement);
}
