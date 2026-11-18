/** G04: window geometry only. Persisted widths always remain in the v1 640–2400px range.
 * The actual dialog may temporarily render narrower on a small visual viewport.
 * No data, list-layout or Firebase writer is involved here. */
export const INLINE_G04_WIDTH_MIN=640;
export const INLINE_G04_WIDTH_MAX=2400;
export type InlineG04Edge='left'|'right';

export function inlineG04ViewportWidth():number {
  if(typeof window==='undefined')return 1480;
  const width=window.visualViewport?.width??window.innerWidth;
  return typeof width==='number'&&Number.isFinite(width)&&width>0?width:1480;
}

export function inlineG04WidthBounds(viewportWidth:number):{min:number;max:number;canSave:boolean} {
  const visible=Number.isFinite(viewportWidth)&&viewportWidth>0?viewportWidth:1480;
  const max=Math.max(1,Math.min(INLINE_G04_WIDTH_MAX,Math.floor(visible)-20));
  return {min:Math.min(INLINE_G04_WIDTH_MIN,max),max,canSave:max>=INLINE_G04_WIDTH_MIN};
}

/** Clamp presentation to the visible viewport, including desktop zoom and VV resize. */
export function inlineG04ClampWidth(width:number,viewportWidth:number):number {
  const {min,max}=inlineG04WidthBounds(viewportWidth);
  const requested=Number.isFinite(width)?Math.round(width):min;
  return Math.max(min,Math.min(max,requested));
}

/** Edge and corner drags share one horizontal calculation; no autosave per pixel. */
export function inlineG04DragWidth(start:number,deltaX:number,edge:InlineG04Edge,viewportWidth:number):number {
  return inlineG04ClampWidth(start+(edge==='right'?deltaX:-deltaX),viewportWidth);
}
