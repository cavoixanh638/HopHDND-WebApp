import {PARTY_TRACK_WIDTH_LIMITS,type PartyTrackWidths} from '../../data/item-preferences';

/** Pure adjacent-track geometry, separate from admin/commit callbacks. */
export type L03WidthMode='readonly'|'editable';
type RailName='label'|'level'|'status';
export const RAILS:Record<L03WidthMode,readonly RailName[]>={
  readonly:['label','status'],editable:['label','level','status']
};

type BoundaryRange={minDelta:number;maxDelta:number};
export function l03BoundaryRange(widths:PartyTrackWidths,mode:L03WidthMode,
  boundary:number,minimums?:PartyTrackWidths):BoundaryRange {
  const names=RAILS[mode];
  if(!Number.isInteger(boundary)||boundary<0||boundary>=names.length-1)
    throw new RangeError('L03 boundary does not exist');
  const values=widths[mode] as unknown as Record<string,number>;
  const limits=PARTY_TRACK_WIDTH_LIMITS[mode] as Record<string,{min:number;max:number}>;
  const left=names[boundary],right=names[boundary+1];
  const floor=(name:string)=>Math.max(limits[name].min,
    (minimums?.[mode] as Record<string,number>|undefined)?.[name]??0);
  return {
    minDelta:Math.max(floor(left)-values[left],values[right]-Math.max(values[right],limits[right].max)),
    maxDelta:Math.min(Math.max(values[left],limits[left].max)-values[left],values[right]-floor(right))
  };
}

/** Adjacent-only transfer: sum of rails, physical L03 parent width, and all
 * neighbouring table columns remain EXACTLY unchanged. Never rewrite limits. */
export function l03ResizeBoundary(widths:PartyTrackWidths,mode:L03WidthMode,
  boundary:number,delta:number,minimums?:PartyTrackWidths):PartyTrackWidths {
  const range=l03BoundaryRange(widths,mode,boundary,minimums);
  if(!Number.isFinite(delta))return widths;
  const applied=Math.max(range.minDelta,Math.min(range.maxDelta,Math.round(delta)));
  if(applied===0)return widths;
  const left=RAILS[mode][boundary],right=RAILS[mode][boundary+1];
  const next:PartyTrackWidths={
    readonly:{...widths.readonly},editable:{...widths.editable}
  };
  const target=next[mode] as unknown as Record<string,number>;
  target[left]+=applied;
  target[right]-=applied;
  return next;
}

