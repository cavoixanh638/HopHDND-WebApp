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

/** Owner R04 (review 010): source default ID stays 68px; view default is
 * 52px. The monotonic 52/68 projection also scales user-customized source
 * widths, without touching persisted Firebase/localStorage layouts.
 * A single inverse is used ONLY when ID is the trailing resize reservoir. */
export const ID_SOURCE_DEFAULT_WIDTH=68;
export const ID_VIEW_DEFAULT_WIDTH=52;
export const projectedIdWidth=(sourceWidth:number)=>
  Math.round(sourceWidth*ID_VIEW_DEFAULT_WIDTH/ID_SOURCE_DEFAULT_WIDTH);
export const idSourceForPhysicalWidth=(physicalWidth:number)=>
  Math.min(1600,Math.max(60,
    Math.round(physicalWidth*ID_SOURCE_DEFAULT_WIDTH/ID_VIEW_DEFAULT_WIDTH)));
type Extras=Readonly<Record<string,number>>;
const extraFor=(key:string,extras:Extras)=>extras[key]??0;
/** The SAME 1600px rendered cap as compactVisibleColumns. Source group widths
 * above (1600-extra) are valid, but all project to the same physical width. */
export const projectedGroupWidth=(sourceWidth:number,extraWidth:number)=>
  Math.min(1600,sourceWidth+extraWidth);
export const projectedPhysicalWidth=(sourceWidth:number,key:string,extras:Extras={},idCompact=true)=>
  idCompact&&key==='displayCode'?projectedIdWidth(sourceWidth):
  projectedGroupWidth(sourceWidth,extraFor(key,extras));
export const projectedPhysicalLimits=(key:string,extras:Extras={},idCompact=true)=>{
  if(idCompact&&key==='displayCode')return {min:projectedIdWidth(60),max:projectedIdWidth(1600)};
  const extra=extraFor(key,extras);
  return {min:60+extra,max:1600};
};

/** Same constraints used by the DOM drag preview AND the eventual CAS commit.
 * If ID is the last reservoir its bounds are projected from raw 60..1600;
 * the stored 60..1600px value is inverted only at commit. */
export function projectedTrailingBounds(layout:ItemLayout,keys:readonly string[],target:string,
  extras:Extras={},idCompact=true):{min:number;max:number}|null{
  const last=keys.at(-1);
  if(!last||last===target||!keys.includes(target))return null;
  const first=layout.columns.find(c=>c.key===target),tail=layout.columns.find(c=>c.key===last);
  if(!first||!tail)return null;
  const total=projectedPhysicalWidth(first.width,target,extras,idCompact)+
    projectedPhysicalWidth(tail.width,last,extras,idCompact);
  const a=projectedPhysicalLimits(target,extras,idCompact),z=projectedPhysicalLimits(last,extras,idCompact);
  const lower=Math.max(a.min,total-z.max),upper=Math.min(a.max,total-z.min);
  return lower<=upper?{min:lower,max:upper}:null;
}

export function resizeProjectedWithLastColumn(layout:ItemLayout,keys:readonly string[],
  target:string,desiredPhysicalWidth:number,extras:Extras={},idCompact=true):ItemLayout{
  const bounds=projectedTrailingBounds(layout,keys,target,extras,idCompact);
  if(!bounds||!Number.isFinite(desiredPhysicalWidth))return layout;
  const last=keys[keys.length-1],first=layout.columns.find(c=>c.key===target)!;
  const tail=layout.columns.find(c=>c.key===last)!;
  const before=projectedPhysicalWidth(first.width,target,extras,idCompact);
  const oldLast=projectedPhysicalWidth(tail.width,last,extras,idCompact);
  const after=Math.round(Math.max(bounds.min,Math.min(bounds.max,desiredPhysicalWidth)));
  if(after===before)return layout;
  // Do not commit when the *visible* width did not change (at a cap).
  // For an over-cap source group, crossing below the cap can require a
  // larger raw-width change; only the rendered delta is transferred.
  const newSourceWidth=after-extraFor(target,extras);
  const physicalLast=oldLast-(after-before);
  const newTailWidth=idCompact&&last==='displayCode'
    ?idSourceForPhysicalWidth(physicalLast):physicalLast-extraFor(last,extras);
  if(newSourceWidth<60||newSourceWidth>1600||newTailWidth<60||newTailWidth>1600||
    projectedPhysicalWidth(newSourceWidth,target,extras,idCompact)!==after||
    projectedPhysicalWidth(newTailWidth,last,extras,idCompact)!==physicalLast)return layout;
  return {...layout,columns:layout.columns.map(c=>c.key===target?{...c,width:newSourceWidth}:
    c.key===last?{...c,width:newTailWidth}:c)};
}

/** UI 019: physical pair-first transfer. The next visible column absorbs drag
 * delta before the last displayed column is used as a fallback. Never ask the
 * last column twice if it is also the adjacent one.
 *
 * The contract applies to both DOM preview and persisted CAS values.
 */
export type AdjacentCompensator={width:number;min:number;max:number};
export type AdjacentTransfer={
  target:number;adjacent:number;last?:number;min:number;max:number;
};
export function planAdjacentTransfer(current:number,desired:number,limits:{min:number;max:number},
  adjacent:AdjacentCompensator,last?:AdjacentCompensator):AdjacentTransfer{
  const spareShrink=Math.max(0,adjacent.width-adjacent.min)+
    (last?Math.max(0,last.width-last.min):0);
  const spareGrow=Math.max(0,adjacent.max-adjacent.width)+
    (last?Math.max(0,last.max-last.width):0);
  const min=Math.max(limits.min,current-spareGrow);
  const max=Math.min(limits.max,current+spareShrink);
  const target=Math.round(Math.max(min,Math.min(max,Number.isFinite(desired)?desired:current)));
  const delta=target-current;
  const adjacentDelta=delta>0
    ?Math.min(delta,Math.max(0,adjacent.width-adjacent.min))
    :Math.max(delta,-Math.max(0,adjacent.max-adjacent.width));
  return {target,adjacent:adjacent.width-adjacentDelta,
    ...(last?{last:last.width-(delta-adjacentDelta)}:{}),min,max};
}

/** The projected view may include auto-fit growth absent from the saved raw
 * widths. At a manual resize, materialize that *already visible* growth once:
 * otherwise a 600px-wide neighbor with raw width 60 could not give any room.
 * Nonparticipating columns retain their exact rendered pixels. Subsequent
 * viewport increases still expand normally; smaller viewports scroll inside.
 */
export function resizeProjectedWithAdjacent(layout:ItemLayout,keys:readonly string[],
  target:string,desiredWidth:number,extras:Extras={},idCompact=true,
  groupExtras:Extras={}):ItemLayout{
  const index=keys.indexOf(target);
  if(index<0||index>=keys.length-1||!Number.isFinite(desiredWidth))return layout;
  const keyNext=keys[index+1],keyLast=keys.at(-1)!;
  const get=(key:string)=>layout.columns.find(c=>c.key===key);
  if(!get(target)||!get(keyNext)||!get(keyLast))return layout;
  const old=(key:string)=>projectedPhysicalWidth(get(key)!.width,key,extras,idCompact);
  const bounds=(key:string)=>projectedPhysicalLimits(key,groupExtras,idCompact);
  const limits=bounds(target);
  const beside={width:old(keyNext),...bounds(keyNext)};
  const tail=keyNext===keyLast?undefined:{width:old(keyLast),...bounds(keyLast)};
  const plan=planAdjacentTransfer(old(target),desiredWidth,limits,beside,tail);
  if(plan.target===old(target))return layout;
  const changed=new Map([[target,plan.target],[keyNext,plan.adjacent],
    ...(tail?[[keyLast,plan.last!]]:[])] as [string,number][]);
  const visible=new Set(keys);
  const raw=(physical:number,key:string)=>idCompact&&key==='displayCode'
    ?idSourceForPhysicalWidth(physical):physical-extraFor(key,groupExtras);
  const columns=layout.columns.map(column=>{
    if(!visible.has(column.key))return column;
    const physical=changed.get(column.key)??old(column.key);
    // Preserve a source over-cap group if neither it nor auto-fit growth moved;
    // its exact raw width is still needed by historical R02 custom layouts.
    const original=projectedPhysicalWidth(column.width,column.key,groupExtras,idCompact);
    if(!changed.has(column.key)&&physical===original)return column;
    const next=raw(physical,column.key);
    if(!Number.isInteger(next)||next<60||next>1600||
      projectedPhysicalWidth(next,column.key,groupExtras,idCompact)!==physical)
      return null;
    return {...column,width:next};
  });
  if(columns.some(c=>c===null))return layout;
  return {...layout,columns:columns as ItemLayout['columns']};
}

/** Preview bounds use the physical rendered widths, not the saved raw widths
 * plus auto-fit growth. Pass base group extras for accurate 60..1600 limits. */
export function projectedAdjacentBounds(layout:ItemLayout,keys:readonly string[],
  target:string,extras:Extras={},idCompact=true,groupExtras:Extras={}):
  {min:number;max:number}|null {
  const index=keys.indexOf(target);
  if(index<0||index>=keys.length-1)return null;
  const get=(key:string)=>layout.columns.find(c=>c.key===key);
  const next=keys[index+1],last=keys.at(-1)!;
  if(!get(target)||!get(next)||!get(last))return null;
  const physical=(key:string)=>projectedPhysicalWidth(get(key)!.width,key,extras,idCompact);
  const plan=planAdjacentTransfer(physical(target),physical(target),
    projectedPhysicalLimits(target,groupExtras,idCompact),
    {width:physical(next),...projectedPhysicalLimits(next,groupExtras,idCompact)},
    next===last?undefined:{width:physical(last),...projectedPhysicalLimits(last,groupExtras,idCompact)});
  return {min:plan.min,max:plan.max};
}
