/** Place the shared cue at the upper-right *outside* its source cell.
 * Prefer the empty side of the active cell, fall back above/below if neither
 * horizontal side fits. One geometry read per new cell, no pointermove.
 */
export function outsideCellTooltipPosition(
 rect:Pick<DOMRect,'left'|'right'|'top'|'bottom'>,
 viewportWidth:number,viewportHeight:number,width:number,height:number
):{left:number;top:number} {
 const gap=9,edge=6;
 const maxLeft=Math.max(edge,viewportWidth-width-edge);
 const maxTop=Math.max(edge,viewportHeight-height-edge);
 // The vertical offset makes the bubble look diagonal rather than centered.
 const diagonalTop=Math.min(maxTop,Math.max(edge,rect.top-height*0.72));
 if(rect.right+gap+width<=viewportWidth-edge)
   return {left:Math.round(rect.right+gap),top:Math.round(diagonalTop)};
 if(rect.left-gap-width>=edge)
   return {left:Math.round(rect.left-gap-width),top:Math.round(diagonalTop)};
 // Narrow viewport: put bubble above the cell with an upper-right bias.
 const left=Math.min(maxLeft,Math.max(edge,rect.right-width*.7));
 if(rect.top-height-gap>=edge)
   return {left:Math.round(left),top:Math.round(rect.top-height-gap)};
 if(rect.bottom+height+gap<=viewportHeight-edge)
   return {left:Math.round(left),top:Math.round(rect.bottom+gap)};
 // Degenerate tiny viewports: keep it onscreen, minimize occlusion.
 return {left:Math.round(left),top:Math.round(maxTop)};
}
