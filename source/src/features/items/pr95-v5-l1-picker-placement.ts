/** UI V5 L1: placement uses the actual measured rendered menu height.
 * All coordinates are CSS pixels in the layout viewport. visualViewport
 * offset/size bounds the currently visible area during pinch zoom/IME.
 * No trigger, palette or outer stage layout is styled here. */
export type PickerViewport={left:number;top:number;width:number;height:number};
export type PickerAnchor={left:number;top:number;bottom:number;width:number};
export type PickerPlacement={
  side:'above'|'below';top:number;left:number;width:number;maxHeight:number;
  gap:number;spaceAbove:number;spaceBelow:number;
};
export function placeCellPicker(anchor:PickerAnchor,renderedHeight:number,
  viewport:PickerViewport):PickerPlacement{
  const margin=8,gap=6;
  const leftBound=viewport.left+margin,rightBound=viewport.left+viewport.width-margin;
  const topBound=viewport.top+margin,bottomBound=viewport.top+viewport.height-margin;
  const width=Math.max(1,Math.min(360,Math.max(anchor.width,260),rightBound-leftBound));
  const left=Math.max(leftBound,Math.min(anchor.left,rightBound-width));
  const above=Math.max(0,anchor.top-gap-topBound);
  const below=Math.max(0,bottomBound-anchor.bottom-gap);
  const natural=Math.max(1,Math.ceil(renderedHeight));
  const side=natural<=below?'below':natural<=above?'above':
    below>=above?'below':'above';
  const available=side==='below'?below:above;
  const maxHeight=Math.max(1,Math.min(natural,available));
  const top=side==='below'?anchor.bottom+gap:anchor.top-gap-maxHeight;
  return {side,top,left,width,maxHeight,
    gap,spaceAbove:above,spaceBelow:below};
}
