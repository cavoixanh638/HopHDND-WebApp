import {placeCellPicker,type PickerViewport} from './pr95-v5-l1-picker-placement';

/** DOM-only viewport calculations for the presentation layer.
 * This module has NO knowledge of users, save callbacks, leases or Firebase.
 * Callers retain responsibility for closing an offscreen editor and enforcing
 * editing permissions. Changing the visual geometry cannot grant access.
 */
export type PickerDomPositionResult='positioned'|'outside'|'detached';

export function positionCellPickerPopover(
  popover:HTMLDivElement,
  trigger:HTMLButtonElement,
  viewport:PickerViewport,
  department:boolean
):PickerDomPositionResult{
  if(!popover.isConnected||!trigger.isConnected)return 'detached';
  const rect=trigger.getBoundingClientRect();
  const scrollbox=trigger.closest('.item-table-scroll,.report-grid-scroll');
  const clip=scrollbox?.getBoundingClientRect();
  const insideViewport=rect.right>viewport.left+4&&
    rect.left<viewport.left+viewport.width-4&&
    rect.bottom>viewport.top+4&&rect.top<viewport.top+viewport.height-4;
  const insideTable=!clip||(rect.right>clip.left+2&&rect.left<clip.right-2&&
    rect.bottom>clip.top+2&&rect.top<clip.bottom-2);
  if(!insideViewport||!insideTable)return 'outside';

  // The search is a fixed flex header; ONLY the options list scrolls.
  // A capped popover.scrollHeight loses the content beyond that inner list.
  const list=popover.querySelector<HTMLElement>('.cell-picker-options');
  if(!list)return 'detached';
  const rows=Array.from(list.querySelectorAll<HTMLButtonElement>(':scope > .cell-picker-option'));
  const extraRows=rows.filter(row=>row.dataset.pickerAux==='true').length;
  const count=Math.min(rows.length,(department?7:4)+extraRows);
  const gap=parseFloat(getComputedStyle(list).rowGap)||0;
  const search=popover.querySelector<HTMLElement>('.cell-picker-search');
  const searchMargin=search?parseFloat(getComputedStyle(search).marginBottom)||0:0;
  const css=getComputedStyle(popover);
  const borders=(parseFloat(css.borderTopWidth)||0)+(parseFloat(css.borderBottomWidth)||0);
  const padding=(parseFloat(css.paddingTop)||0)+(parseFloat(css.paddingBottom)||0)+borders;
  const headerHeight=(search?.offsetHeight??0)+searchMargin;
  const natural=Math.ceil(padding+headerHeight+list.scrollHeight);
  // Owner rule: below only if seven department names plus search fit, or
  // four ordinary choices fit. Row wrapping increases the measured height.
  const wantedHeight=count===0?natural:Math.ceil(padding+headerHeight+
    rows.slice(0,count).reduce((sum,row)=>sum+row.offsetHeight,0)+
    Math.max(0,count-1)*gap);
  const next=placeCellPicker(rect,natural,viewport,{
    minBelowHeight:Math.min(natural,wantedHeight),
    maxMenuHeight:department?420:360
  });
  popover.style.left=next.left+'px';
  popover.style.top=next.top+'px';
  popover.style.width=next.width+'px';
  const maxHeight=next.maxHeight+'px';
  if(popover.style.maxHeight!==maxHeight)popover.style.maxHeight=maxHeight;
  popover.dataset.placement=next.side;
  return 'positioned';
}
