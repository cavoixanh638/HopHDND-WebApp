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

/** View-only column projection. Raw Excel widths (including ID >=60) never
 * change on page load; 1/3 is applied once to the rendered physical ID.
 * Group extra widths affect only the rendered anchor, not the source field. */
export const projectedIdWidth=(sourceWidth:number)=>Math.round(sourceWidth/3);
export const idSourceForPhysicalWidth=(physicalWidth:number)=>
  Math.min(1600,Math.max(60,Math.round(physicalWidth*3)));
type Extras=Readonly<Record<string,number>>;
const extraFor=(key:string,extras:Extras)=>extras[key]??0;
const physicalWidth=(sourceWidth:number,key:string,extras:Extras,idCompact:boolean)=>
  idCompact&&key==='displayCode'?projectedIdWidth(sourceWidth):sourceWidth+extraFor(key,extras);
const physicalLimits=(key:string,extras:Extras,idCompact:boolean)=>{
  if(idCompact&&key==='displayCode')return {min:20,max:projectedIdWidth(1600)};
  const extra=extraFor(key,extras);return {min:60+extra,max:1600+extra};
};

/** Same constraints used by the DOM drag preview AND the eventual CAS commit.
 * If ID is the last reservoir it contributes its 20..533 PHYSICAL pixels;
 * the stored 60..1600px value is inverted only at commit. */
export function projectedTrailingBounds(layout:ItemLayout,keys:readonly string[],target:string,
  extras:Extras={},idCompact=true):{min:number;max:number}|null{
  const last=keys.at(-1);
  if(!last||last===target||!keys.includes(target))return null;
  const first=layout.columns.find(c=>c.key===target),tail=layout.columns.find(c=>c.key===last);
  if(!first||!tail)return null;
  const total=physicalWidth(first.width,target,extras,idCompact)+
    physicalWidth(tail.width,last,extras,idCompact);
  const a=physicalLimits(target,extras,idCompact),z=physicalLimits(last,extras,idCompact);
  const lower=Math.max(a.min,total-z.max),upper=Math.min(a.max,total-z.min);
  return lower<=upper?{min:lower,max:upper}:null;
}

export function resizeProjectedWithLastColumn(layout:ItemLayout,keys:readonly string[],
  target:string,desiredPhysicalWidth:number,extras:Extras={},idCompact=true):ItemLayout{
  const bounds=projectedTrailingBounds(layout,keys,target,extras,idCompact);
  if(!bounds||!Number.isFinite(desiredPhysicalWidth))return layout;
  const last=keys[keys.length-1],first=layout.columns.find(c=>c.key===target)!;
  const tail=layout.columns.find(c=>c.key===last)!;
  const before=physicalWidth(first.width,target,extras,idCompact);
  const oldLast=physicalWidth(tail.width,last,extras,idCompact);
  const after=Math.round(Math.max(bounds.min,Math.min(bounds.max,desiredPhysicalWidth)));
  if(after===before)return layout;
  const newSourceWidth=after-extraFor(target,extras);
  const physicalLast=oldLast-(after-before);
  const newTailWidth=idCompact&&last==='displayCode'
    ?idSourceForPhysicalWidth(physicalLast):physicalLast-extraFor(last,extras);
  if(newSourceWidth<60||newSourceWidth>1600||newTailWidth<60||newTailWidth>1600)return layout;
  return {...layout,columns:layout.columns.map(c=>c.key===target?{...c,width:newSourceWidth}:
    c.key===last?{...c,width:newTailWidth}:c)};
}
