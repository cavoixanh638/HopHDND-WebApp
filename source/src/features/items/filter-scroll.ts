/** Keep an already scrolled grid still when focusing controls inside its sticky
 * filter header. Native pointer focus may scroll the original (non-sticky)
 * DOM position back into view, jumping all visible data rows.
 *
 * Only protect activation/focus. After an actual filter VALUE change the browser
 * may clamp scrollTop to the remaining content size, as it should.
 */
export function preserveStickyFilterViewport(element:HTMLInputElement|HTMLSelectElement):void {
  const viewport=element.closest<HTMLElement>('.item-table-scroll');
  if(!viewport)return;
  const top=viewport.scrollTop,left=viewport.scrollLeft;
  // Avoid the UA's implicit 'scroll focused element into view' at its
  // normal-flow position, rather than the painted sticky position.
  element.focus({preventScroll:true});
  if(typeof requestAnimationFrame!=='function')return;
  requestAnimationFrame(()=>{
    if(!viewport.isConnected||!element.isConnected||document.activeElement!==element)return;
    if(Math.abs(viewport.scrollTop-top)>1)viewport.scrollTop=top;
    if(Math.abs(viewport.scrollLeft-left)>1)viewport.scrollLeft=left;
  });
}
