/** UI V4 reference codes — admin-only, ephemeral inspection overlay.
 * No business data changes, no storage, no network, no write permissions.
 * The registry uses semantic data keys rather than cell text or column order.
 */
import {useEffect,type RefObject} from 'react';
import './ui-reference-codes.css';

export const UI_REFERENCE_LEGEND:readonly {prefix:string;meaning:string}[]=[
  {prefix:'A',meaning:'Điều hướng và cài đặt'},
  {prefix:'B',meaning:'Tổng và loại nội dung'},
  {prefix:'C',meaning:'Ba thẻ tiến độ và các nhóm lọc'},
  {prefix:'F',meaning:'Bộ lọc Danh sách'},
  {prefix:'L',meaning:'Bảng và các trường Danh sách'},
  {prefix:'P',meaning:'Popup chi tiết báo cáo'},
  {prefix:'R',meaning:'Năm bảng báo cáo'},
];

type Area={code:string;selector:string};
export const UI_REFERENCE_AREAS:readonly Area[]=[
  {code:'A01',selector:'.primary-section-switcher [data-ui-reference-nav="overview"], .primary-section-switcher [data-ui-reference-nav="reports"]'},
  {code:'A02',selector:'.primary-section-switcher [data-ui-reference-nav="items"]'},
  {code:'A03',selector:'.v3-settings-menu > summary, .pr95-preview-gear'},
  {code:'B00',selector:'.item-summary-card[data-summary-card="total"] .item-summary-total-lead'},
  {code:'B01',selector:'.item-summary-kind-chip[data-summary-kind="qppl"]'},
  {code:'B02',selector:'.item-summary-kind-chip[data-summary-kind="hc"]'},
  {code:'B03',selector:'.item-summary-kind-chip[data-summary-kind="bc"]'},
  {code:'C01',selector:'.item-summary-card[data-summary-card="party"]'},
  {code:'C02',selector:'.item-summary-card[data-summary-card="build"]'},
  {code:'C03',selector:'.item-summary-card[data-summary-card="nq"]'},
  {code:'F01',selector:'.list-filter-search'},
  {code:'F02',selector:'.list-filter-organisation[aria-label="Lọc Sở, ngành"]'},
  {code:'F03',selector:'.list-filter-organisation[aria-label="Lọc Phòng"]'},
  {code:'F04',selector:'.list-filter-other > summary'},
  {code:'F05',selector:'.list-filter-clear'},
  {code:'L00',selector:'.item-data-table'},
  {code:'L01',selector:'.item-data-table thead th[data-column-key="displayCode"]'},
  {code:'L02',selector:'.item-data-table thead th[data-column-key="content"]'},
  {code:'L03',selector:'.item-data-table thead th[data-column-key="partyLevel"], .item-data-table thead th[data-column-key="progressParty"]'},
  {code:'L04',selector:'.item-data-table thead th[data-column-key="room"], .item-data-table thead th[data-column-key="ubndLeader"], .item-data-table thead th[data-column-key="vpLeader"], .item-data-table thead th[data-column-key="specialist"]'},
  {code:'L05',selector:'.item-data-table thead th[data-column-key="specificProgress"]'},
  {code:'L06',selector:'.item-data-table thead th[data-column-key="note"]'},
  {code:'P00',selector:'.report-detail-grid'},
  {code:'P01',selector:'.report-detail-grid thead th[data-column-key="displayCode"]'},
  {code:'P02',selector:'.report-detail-grid thead th[data-column-key="content"]'},
  {code:'P03',selector:'.report-detail-grid thead th[data-column-key="partyLevel"], .report-detail-grid thead th[data-column-key="progressParty"]'},
  {code:'P04',selector:'.report-detail-grid thead th[data-column-key="room"], .report-detail-grid thead th[data-column-key="ubndLeader"], .report-detail-grid thead th[data-column-key="vpLeader"], .report-detail-grid thead th[data-column-key="specialist"]'},
  {code:'P05',selector:'.report-detail-grid thead th[data-column-key="specificProgress"]'},
  {code:'P06',selector:'.report-detail-grid thead th[data-column-key="note"]'},
];
const stages=[
  {report:'party',code:'C01',steps:['source','office','next','completed']},
  {report:'build',code:'C02',steps:['source','office','next','completed']},
  {report:'nq',code:'C03',steps:['source','office','completed']},
] as const;
export const UI_REFERENCE_REPORT_IDS:Readonly<Record<string,string>>={
  party:'R01',build:'R02',council:'R03',nq:'R04',bc:'R05'
};
const identityFields:Readonly<Record<string,string>>={
  displayCode:'01',content:'02',partyLevel:'03.1',progressParty:'03.1',
  progressBuild:'03.2',progressCouncil:'03.3',
  ubndLeader:'04',vpLeader:'04',room:'04',specialist:'04',
  specificProgress:'05',note:'06'
};

export type UiReferenceAnchor={code:string;element:Element};
export function resolveUiReferenceAnchors(root:ParentNode):UiReferenceAnchor[]{
  const result:UiReferenceAnchor[]=[];
  const add=(code:string,selector:string)=>{
    const element=root.querySelector(selector);
    if(element)result.push({code,element});
  };
  for(const area of UI_REFERENCE_AREAS)add(area.code,area.selector);
  for(const stage of stages){
    for(let index=0;index<stage.steps.length;index++)
      add(stage.code+'.'+(index+1),
        '.item-summary-bucket[data-summary-report="'+stage.report+
        '"][data-summary-stage="'+stage.steps[index]+'"]');
  }
  // Report ids are stable even after a user edits names, order or visibility.
  for(const [id,code] of Object.entries(UI_REFERENCE_REPORT_IDS))
    add(code,'.report-surface[data-ui-reference-report="'+id+'"] > .card-header');
  // Row-level stages are shown ON HOVER instead of a badge per record.
  // This prevents hundreds of markers from covering the table.
  return result;
}

/** Resolve the semantic field of a hovered cell; never use displayed value
 * or the column's physical position. The ID comes only from a visible ID cell.
 */
export function uiReferenceForCell(target:Element,root:Element):string|null{
  const cell=target.closest('td[data-col-key]');
  if(!cell||!root.contains(cell))return null;
  const table=cell.closest('table');
  const isPopup=!!table?.matches('.report-detail-grid');
  if(!isPopup&&!table?.matches('.item-data-table'))return null;
  const prefix=isPopup?'P':'L';
  const stage=target.closest('[data-stage-field]')?.getAttribute('data-stage-field');
  const key=stage||cell.getAttribute('data-col-key')||'';
  const member=target.closest('.compact-stage-level');
  const number=member?'03.1':identityFields[key];
  if(!number)return prefix+'00';
  const row=cell.closest('tr');
  // If the ID column is not visible in this layout, do not invent or use STT.
  const rawId=row?.querySelector<HTMLElement>('td[data-col-key="displayCode"] .code, .report-grid-id .code');
  const shownId=rawId&&rawId.getClientRects().length?rawId.textContent?.trim():'';
  return prefix+number+(shownId?' · '+shownId:'');
}

function isInsideOverlay(node:Node):boolean{
  return node instanceof Element?!!node.closest('[data-ui-reference-layer]'):
    !!node.parentElement?.closest('[data-ui-reference-layer]');
}
const same=(a:readonly UiReferenceAnchor[],b:readonly UiReferenceAnchor[])=>a.length===b.length&&
  a.every((item,i)=>item.code===b[i].code&&item.element===b[i].element);

export function UiReferenceOverlay({enabled,rootRef}:{
  enabled:boolean;rootRef:RefObject<HTMLElement|null>;
}){
  useEffect(()=>{
    const root=rootRef.current;
    if(!enabled||!root)return;
    // A separate DOM/portal layer: labels do not change table text, values,
    // option choices, aria names, row layout, copy or Excel export.
    const layer=document.createElement('div');
    layer.className='ui-reference-layer';
    layer.dataset.uiReferenceLayer='';
    layer.setAttribute('aria-hidden','true');
    // Keep the primary layer in <body> for the ENTIRE admin session.
    // A dialog is a browser top-layer: its own secondary layer hosts markers
    // while open, but unmounting the dialog can never destroy the body layer.
    document.body.appendChild(layer);
    const popupLayer=document.createElement('div');
    popupLayer.className='ui-reference-layer';
    popupLayer.dataset.uiReferenceLayer='';
    popupLayer.setAttribute('aria-hidden','true');
    const tags=new Map<string,HTMLSpanElement>();
    const hover=document.createElement('span');
    hover.className='ui-reference-hover';
    hover.dataset.uiReferenceHover='';
    hover.hidden=true;
    layer.appendChild(hover);
    let activeDialog:HTMLDialogElement|null=null;
    let disposed=false,frame=0,anchors:UiReferenceAnchor[]=[];
    type Box={left:number;top:number;width:number;height:number};
    const overlap=(a:Box,b:Box,pad=2)=>a.left<b.left+b.width+pad&&
      a.left+a.width+pad>b.left&&a.top<b.top+b.height+pad&&
      a.top+a.height+pad>b.top;
    // Clip text and controls to their REAL scroll viewport, not their
    // unconstrained DOM rectangles (important for horizontally scrolled tables).
    const clip=(r:Box,element:Element):Box|null=>{
      let top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.top+r.height);
      let left=Math.max(0,r.left),right=Math.min(innerWidth,r.left+r.width);
      for(let a=element.parentElement;a;a=a.parentElement){
        const css=getComputedStyle(a);
        if(/auto|scroll|hidden|clip/.test(css.overflowX+' '+css.overflowY)){
          const bounds=a.getBoundingClientRect();
          top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom);
          left=Math.max(left,bounds.left);right=Math.min(right,bounds.right);
        }
        if(a===root)break;
      }
      if(right-left<1||bottom-top<1)return null;
      return {left,top,width:right-left,height:bottom-top};
    };
    const clipRect=(element:Element):Box|null=>{
      const r=element.getBoundingClientRect();
      if(r.width<6||r.height<6)return null;
      const visible=clip(r,element);
      return visible&&visible.width>=6&&visible.height>=6?visible:null;
    };
    // R-V4-01: DOM text and actual controls are obstacles, not just other
    // reference tags. Range rects protect glyphs, numbers and visible IDs;
    // buttons/inputs/SVG/carets protect interaction and arrow surfaces.
    const contentObstacles=(scope:Element):Box[]=>{
      const boxes:Box[]=[];
      const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
      const range=document.createRange();
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(!node.textContent?.trim())continue;
        const parent=node.parentElement;
        if(!parent||parent.closest('[data-ui-reference-layer],script,style,[hidden],[aria-hidden="true"]'))continue;
        const css=getComputedStyle(parent);
        if(css.display==='none'||css.visibility!=='visible'||Number(css.opacity)===0)continue;
        range.selectNodeContents(node);
        for(const r of range.getClientRects()){
          if(!r.width||!r.height)continue;
          const clipped=clip(r,parent);
          if(clipped)boxes.push(clipped);
        }
      }
      range.detach();
      for(const el of scope.querySelectorAll(
        'button,input,select,textarea,summary,[role="button"],[role="combobox"],svg,'+
        '.cell-picker-caret,[class*="caret"],[class*="chevron"]')){
        if(el.closest('[data-ui-reference-layer],[hidden],[aria-hidden="true"]'))continue;
        // A nested icon is already protected by its enclosing control.
        if(el.matches('svg')&&el.closest('button,[role="button"]'))continue;
        const css=getComputedStyle(el);
        if(css.display==='none'||css.visibility!=='visible'||Number(css.opacity)===0)continue;
        const rect=clipRect(el);
        if(rect)boxes.push(rect);
      }
      return boxes;
    };
    const measure=(span:HTMLElement)=>{
      // hidden=true makes offsetWidth zero: measure the actual font, including
      // mobile breakpoints, before testing any position.
      span.hidden=false;
      span.style.left='-10000px';span.style.top='-10000px';
      const r=span.getBoundingClientRect();
      return {width:r.width||39,height:r.height||17};
    };
    const fits=(candidate:Box,blocked:readonly Box[],placed:readonly Box[])=>
      candidate.left>=3&&candidate.top>=3&&
      candidate.left+candidate.width<=innerWidth-3&&
      candidate.top+candidate.height<=innerHeight-3&&
      !blocked.some(r=>overlap(candidate,r))&&!placed.some(r=>overlap(candidate,r,4));
    const position=(span:HTMLElement,r:Box,blocked:readonly Box[],placed:Box[])=>{
      const {width,height}=measure(span);
      // All candidates lie COMPLETELY outside their own anchor. If every
      // location touches another region's content, suppress the badge.
      const points=[
        {left:r.left-width-4,top:r.top+2},
        {left:r.left+r.width+4,top:r.top+2},
        {left:r.left+2,top:r.top-height-4},
        {left:r.left+r.width-width-2,top:r.top-height-4},
        {left:r.left+2,top:r.top+r.height+4},
        {left:r.left+r.width-width-2,top:r.top+r.height+4},
        {left:r.left-width-4,top:r.top+r.height-height-2},
        {left:r.left+r.width+4,top:r.top+r.height-height-2},
      ];
      const found=points.map(p=>({...p,width,height})).find(candidate=>
        fits(candidate,blocked,placed));
      if(!found){span.hidden=true;span.dataset.uiRefPlacement='suppressed';return;}
      span.style.left=found.left+'px';span.style.top=found.top+'px';
      span.dataset.uiRefPlacement='visible';
      placed.push(found);
    };
    const positionHover=(blocked:readonly Box[],placed:Box[])=>{
      if(!hover.textContent){hover.hidden=true;return;}
      const {width,height}=measure(hover);
      const points:Box[]=[];
      // Find a true empty gutter: this is diagnostic information, never a
      // floating label allowed to obscure somebody else's text or caret.
      for(const y of [6,innerHeight-height-6,Math.round(innerHeight/2-height/2)]){
        for(let x=6;x+width<=innerWidth-6;x+=Math.max(20,Math.round(width/2)))
          points.push({left:x,top:y,width,height});
        points.push({left:innerWidth-width-6,top:y,width,height});
      }
      for(let y=25;y+height<innerHeight-6;y+=Math.max(28,height+7)){
        for(const x of [6,innerWidth-width-6])
          points.push({left:x,top:y,width,height});
      }
      const found=points.find(p=>fits(p,blocked,placed));
      if(!found){hover.hidden=true;return;}
      hover.style.left=found.left+'px';hover.style.top=found.top+'px';
      hover.style.right='auto';hover.style.bottom='auto';
      hover.hidden=false;
    };
    const redraw=()=>{
      frame=0;
      if(disposed||!root.isConnected)return;
      const dialog=root.querySelector<HTMLDialogElement>('dialog.report-grid-modal[open]');
      if(dialog!==activeDialog){
        activeDialog=dialog;
        if(activeDialog)activeDialog.appendChild(popupLayer);
        else popupLayer.remove();
      }
      const targetLayer=activeDialog?popupLayer:layer;
      if(hover.parentElement!==targetLayer)targetLayer.appendChild(hover);
      const matches=resolveUiReferenceAnchors(root).filter(item=>
        activeDialog?activeDialog.contains(item.element):!item.element.closest('dialog'));
      if(!same(anchors,matches))anchors=matches;
      const activeCodes=new Set(matches.map(item=>item.code));
      for(const [key,element] of tags){
        if(!activeCodes.has(key)){element.remove();tags.delete(key);}
      }
      const blocked=contentObstacles(activeDialog??root);
      const occupied:Box[]=[];
      // Prefer the broad semantic areas to dense neighboring bucket/chip
      // labels. Suppressed tags remain in the DOM (hidden), never mistaken
      // for visible markers by diagnostics.
      const ordered=[...matches].sort((a,b)=>{
        const priority=(code:string)=>/^C0[123]\.\d+$/.test(code)?3:
          /^B0[123]$/.test(code)?2:/^[LP]0[1-6]$/.test(code)?1:0;
        return priority(a.code)-priority(b.code);
      });
      for(const item of ordered){
        const rect=clipRect(item.element);
        let span=tags.get(item.code);
        if(!rect){if(span){span.hidden=true;span.dataset.uiRefPlacement='clipped';}continue;}
        if(!span){
          span=document.createElement('span');span.className='ui-reference-tag';
          span.dataset.uiRefCode=item.code;span.textContent=item.code;
          targetLayer.appendChild(span);tags.set(item.code,span);
        }else if(span.parentElement!==targetLayer)targetLayer.appendChild(span);
        position(span,rect,blocked,occupied);
      }
      positionHover(blocked,occupied);
    };
    const schedule=()=>{
      if(!disposed&&!frame)frame=requestAnimationFrame(redraw);
    };
    const onMove=(event:PointerEvent)=>{
      const target=event.target;
      const popup=!!activeDialog;
      const relevant=target instanceof Element&&root.contains(target)&&
        (!popup||activeDialog!.contains(target));
      const current=relevant?uiReferenceForCell(target as Element,root):null;
      if(current!==hover.textContent){hover.textContent=current??'';schedule();}
    };
    const onMouseOut=()=>{if(hover.textContent){hover.textContent='';schedule();}};
    const observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>!isInsideOverlay(m.target)&&(
        m.type==='attributes'||![...m.addedNodes].every(isInsideOverlay)||
        ![...m.removedNodes].every(isInsideOverlay))))schedule();
    });
    observer.observe(root,{subtree:true,childList:true,attributes:true,
      attributeFilter:['class','style','open','data-column-key','data-col-key']});
    const size=new ResizeObserver(schedule);size.observe(root);
    const move=onMove as EventListener;
    root.addEventListener('pointermove',move,{passive:true});
    root.addEventListener('pointerleave',onMouseOut,{passive:true});
    root.addEventListener('click',schedule,true);
    document.addEventListener('close',schedule,true);
    document.addEventListener('scroll',schedule,true);
    window.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
    schedule();
    return()=>{
      disposed=true;if(frame)cancelAnimationFrame(frame);
      observer.disconnect();size.disconnect();
      root.removeEventListener('pointermove',move);
      root.removeEventListener('pointerleave',onMouseOut);
      root.removeEventListener('click',schedule,true);
      document.removeEventListener('close',schedule,true);
      document.removeEventListener('scroll',schedule,true);
      window.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('scroll',schedule);
      layer.remove();popupLayer.remove();tags.clear();
    };
  },[enabled,rootRef]);
  return null;
}
