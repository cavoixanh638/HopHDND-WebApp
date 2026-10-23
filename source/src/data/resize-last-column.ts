import type {ItemLayout} from './item-preferences';

/** The LAST displayed column acts as the width reservoir. Dragging any earlier
 * visible column transfers pixels one-for-one with that last column, leaving
 * every other source width and total table width unchanged.
 *
 * The last displayed column itself is not resizable by the divider: its width
 * is derived by earlier operations, never redistributed implicitly.
 */
export function trailingWidthBounds(layout:ItemLayout,visibleKeys:readonly string[],target:string,
  min=60,max=1600):{min:number;max:number}|null {
  const last=visibleKeys.at(-1);
  if(!last||target===last||!visibleKeys.includes(target))return null;
  const firstCol=layout.columns.find(c=>c.key===target);
  const lastCol=layout.columns.find(c=>c.key===last);
  if(!firstCol||!lastCol)return null;
  const total=firstCol.width+lastCol.width;
  return {min:Math.max(min,total-max),max:Math.min(max,total-min)};
}
export function resizeWithLastColumn(layout:ItemLayout,visibleKeys:readonly string[],
  target:string,desiredWidth:number,min=60,max=1600):ItemLayout {
  const bounds=trailingWidthBounds(layout,visibleKeys,target,min,max);
  if(!bounds||!Number.isFinite(desiredWidth))return layout;
  const current=layout.columns.find(c=>c.key===target)!.width;
  const next=Math.round(Math.max(bounds.min,Math.min(bounds.max,desiredWidth)));
  if(current===next)return layout;
  const delta=next-current,last=visibleKeys[visibleKeys.length-1];
  return {...layout,columns:layout.columns.map(c=>c.key===target?{...c,width:next}:
    c.key===last?{...c,width:c.width-delta}:c)};
}
