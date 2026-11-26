import type {PartyTrackWidths} from '../../data/item-preferences';

/** Screen-only measured lower bounds. Never save these derived pixels in Firebase. */
export interface ListContentMinimums {
  columns:Record<string,number>;
  party:PartyTrackWidths;
}
export const emptyListContentMinimums=():ListContentMinimums=>({
  columns:{},party:{readonly:{label:0,status:0},editable:{label:0,level:0,status:0}}
});
const px=(value:string)=>Number.parseFloat(value)||0;
const chrome=(node:Element)=>{
  const s=getComputedStyle(node);
  return px(s.paddingLeft)+px(s.paddingRight)+px(s.borderLeftWidth)+px(s.borderRightWidth);
};
const excluded='.error-text,.warning-text,.cell-history-action,.inline-g08-overlay,[role="alert"],[role="status"],[hidden],.cell-picker-popover';
/** Text ranges measure the actual loaded font, including Vietnamese accents,
 * font weight, letter spacing and split SearchHighlight spans. No hidden clones
 * or per-cell observers. Widths remain independent of assigned column pixels. */
function measureText(node:Element,includeInlineGaps=false):number{
  const walker=node.ownerDocument.createTreeWalker(node,NodeFilter.SHOW_TEXT);
  const range=node.ownerDocument.createRange();
  if(typeof range.getClientRects!=='function')return 0;
  let width=0,left=Infinity,right=-Infinity;
  for(let text=walker.nextNode();text;text=walker.nextNode()){
    if(!text.textContent||text.parentElement?.closest(excluded))continue;
    range.selectNodeContents(text);
    for(const rect of Array.from(range.getClientRects())){
      width+=rect.width;
      if(rect.width>0){left=Math.min(left,rect.left);right=Math.max(right,rect.right);}
    }
  }
  return includeInlineGaps&&Number.isFinite(left)?Math.max(width,right-left):width;
}
function measureMember(node:Element):number{
  let width=measureText(node)+chrome(node);
  for(const control of Array.from(node.querySelectorAll<HTMLElement>('button.cell-picker-trigger,input.custom-cell-input'))){
    if(control.closest(excluded))continue;
    const css=getComputedStyle(control);
    width+=chrome(control);
    if(control instanceof HTMLInputElement){
      const ctx=node.ownerDocument.createElement('canvas').getContext('2d');
      if(ctx){ctx.font=css.fontStyle+' '+css.fontWeight+' '+css.fontSize+' '+css.fontFamily;
        width+=ctx.measureText(control.value).width;}
    }else{
      const caret=getComputedStyle(control,'::after');
      if(caret.content!=='none'&&caret.display!=='none'){
        width+=Math.max(5,px(caret.width)+px(caret.borderLeftWidth)+px(caret.borderRightWidth))+
          Math.max(3,px(css.columnGap))+px(caret.marginLeft)+px(caret.marginRight);
      }
    }
  }
  if(node.classList.contains('compact-staff-inline-values')){
    width+=Math.max(0,node.children.length-1)*px(getComputedStyle(node).columnGap);
  }
  return Math.ceil(width+2);
}
const PROTECTED_KEYS=['room','specialist','vpLeader','ubndLeader','partyLevel','progressParty','progressBuild','progressCouncil'];
const selector='tbody td[data-l03-layout],'+PROTECTED_KEYS.map(key=>'tbody td[data-col-key="'+key+'"]').join(',');
export function measureListContentMinimums(table:HTMLTableElement):ListContentMinimums{
  const result=emptyListContentMinimums();
  for(const td of Array.from(table.querySelectorAll<HTMLTableCellElement>(selector))){
    const key=td.dataset.colKey!;
    const stages=td.querySelector<HTMLElement>('.compact-stages[data-rev2="true"]');
    if(stages){
      const mode=stages.dataset.levelLayout==='editable'?'editable':'readonly';
      const floor=result.party[mode];
      for(const label of Array.from(stages.querySelectorAll('.compact-stage-title')))
        floor.label=Math.max(floor.label,Math.ceil(measureText(label,true)));
      for(const state of Array.from(stages.querySelectorAll('.compact-stage-state')))
        floor.status=Math.max(floor.status,measureMember(state));
      if(mode==='editable')for(const level of Array.from(stages.querySelectorAll('.compact-stage-level[data-level-editor="true"]')))
        result.party.editable.level=Math.max(result.party.editable.level,measureMember(level));
      continue;
    }
    const staff=td.querySelector('.compact-pair-lines');
    if(staff){
      let width=0;
      for(const row of Array.from(staff.children)){
        const label=row.querySelector('.compact-pair-tag');
        const value=row.querySelector(':scope > .compact-highlight-member,:scope > .compact-staff-inline-values');
        if(!label||!value)continue;
        const labelWidth=Math.max(label.getBoundingClientRect().width,measureMember(label));
        width=Math.max(width,labelWidth+px(getComputedStyle(row).columnGap)+measureMember(value));
      }
      if(width)result.columns[key]=Math.max(result.columns[key]??0,Math.ceil(width+chrome(td)+2));
    }else{
      result.columns[key]=Math.max(result.columns[key]??0,measureMember(td));
    }
  }
  return result;
}
export function withPartyContentMinimums(saved:PartyTrackWidths,minimum:PartyTrackWidths):PartyTrackWidths{
  return {readonly:{label:Math.max(saved.readonly.label,minimum.readonly.label),
    status:Math.max(saved.readonly.status,minimum.readonly.status)},
    editable:{label:Math.max(saved.editable.label,minimum.editable.label),
      level:Math.max(saved.editable.level,minimum.editable.level),
      status:Math.max(saved.editable.status,minimum.editable.status)}};
}

/** Preserve picker chrome while layout edit temporarily renders cells read-only.
 * Recompute when font, grouping or source visibility actually changes. */
export function preserveListContentMinimums(measured:ListContentMinimums,normal:ListContentMinimums):ListContentMinimums{
  const columns={...measured.columns};
  for(const [key,width] of Object.entries(normal.columns))
    columns[key]=Math.max(columns[key]??0,width);
  return {columns,party:withPartyContentMinimums(measured.party,normal.party)};
}
