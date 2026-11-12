/** Viewport-safe geometry for the "Tùy chọn người phụ trách" floating panel.
 * The panel is portaled to body to escape .list-fit-page overflow:hidden.
 * It always fits the chosen side and scrolls internally if content is longer.
 */
export type CompactMenuSide='above'|'below';
export interface CompactMenuPlacement {
  top:number;
  left:number;
  width:number;
  maxHeight:number;
  side:CompactMenuSide;
}
type Anchor=Pick<DOMRect,'top'|'bottom'|'right'>;
export function placeCompactMenu(anchor:Anchor,viewportWidth:number,viewportHeight:number):
  CompactMenuPlacement {
  const margin=12,gap=6,idealHeight=560;
  const width=Math.min(viewportWidth<=650?340:365,Math.max(1,viewportWidth-2*margin));
  const left=Math.max(margin,Math.min(anchor.right-width,viewportWidth-margin-width));
  const above=Math.max(0,anchor.top-gap-margin);
  const below=Math.max(0,viewportHeight-anchor.bottom-gap-margin);
  const side:CompactMenuSide=below<idealHeight&&above>below?'above':'below';
  const maxHeight=Math.max(0,Math.min(idealHeight,side==='above'?above:below));
  const top=side==='above'
    ?Math.max(margin,anchor.top-gap-maxHeight)
    :anchor.bottom+gap;
  return {top,left,width,maxHeight,side};
}
