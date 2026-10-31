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
  {code:'A01',selector:'.primary-section-switcher .primary-section-card:first-child'},
  {code:'A02',selector:'.primary-section-switcher .primary-section-card:nth-child(2)'},
  {code:'A03',selector:'.v3-settings-menu > summary, .pr95-preview-gear'},
  {code:'B00',selector:'.item-summary-card[data-summary-card="total"] .item-summary-total-lead'},
  {code:'B01',selector:'.item-summary-kind-chip[data-summary-kind="qppl"]'},
  {code:'B02',selector:'.item-summary-kind-chip[data-summary-kind="hc"]'},
  {code:'B03',selector:'.item-summary-kind-chip[data-summary-kind="bc"]'},
  {code:'C01',selector:'.item-summary-card[data-summary-card="party"]'},
  {code:'C02',selector:'.item-summary-card[data-summary-card="build"]'},
  {code:'C03',selector:'.item-summary-card[data-summary-card="council"]'},
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
  {report:'council',code:'C03',steps:['source','office','completed']},
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
    document.body.appendChild(layer);
    const tags=new Map<string,HTMLSpanElement>();
    const hover=document.createElement('span');
    hover.className='ui-reference-hover';
    hover.dataset.uiReferenceHover='';
    hover.hidden=true;
    layer.appendChild(hover);
    let activeDialog:HTMLDialogElement|null=null;
    let disposed=false,frame=0,anchors:UiReferenceAnchor[]=[];
    const clipRect=(element:Element):DOMRect|null=>{
      const r=element.getBoundingClientRect();
      if(r.width<6||r.height<6)return null;
      let top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);
      let left=Math.max(0,r.left),right=Math.min(innerWidth,r.right);
      // Hidden table cells may have a large off-screen bounding rectangle
      // inside scroll containers: intersect all clipping ancestors.
      for(let ancestor=element.parentElement;ancestor&&ancestor!==root.parentElement;
        ancestor=ancestor.parentElement){
        const css=getComputedStyle(ancestor);
        if(/auto|scroll|hidden|clip/.test(css.overflowX+css.overflowY)){
          const b=ancestor.getBoundingClientRect();
          top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);
          left=Math.max(left,b.left);right=Math.min(right,b.right);
        }
        if(ancestor===root)break;
      }
      if(right-left<6||bottom-top<6)return null;
      return new DOMRect(left,top,right-left,bottom-top);
    };
    const position=(span:HTMLElement,r:DOMRect,occupied:{x:number;y:number}[])=>{
      const width=span.offsetWidth||39,height=span.offsetHeight||17;
      // Prefer outside the left/right border of the referenced element.
      const candidates=[
        {x:r.left-width-3,y:r.top+2},
        {x:r.right+3,y:r.top+2},
        {x:r.left+2,y:r.top-height-3},
        {x:r.left+2,y:r.bottom+3},
      ];
      const valid=candidates.find(p=>p.x>=3&&p.x+width<innerWidth-3&&p.y>=3&&
        p.y+height<innerHeight-3&&!occupied.some(q=>
          Math.abs(p.x-q.x)<width+4&&Math.abs(p.y-q.y)<height+4));
      if(!valid){span.hidden=true;return;}
      span.hidden=false;span.style.left=valid.x+'px';span.style.top=valid.y+'px';
      occupied.push(valid);
    };
    const redraw=()=>{
      frame=0;
      if(disposed||!root.isConnected)return;
      const dialog=root.querySelector<HTMLDialogElement>('dialog.report-grid-modal[open]');
      if(dialog!==activeDialog){
        activeDialog=dialog;
        (activeDialog??document.body).appendChild(layer);
      }
      const matches=resolveUiReferenceAnchors(root).filter(item=>
        activeDialog?activeDialog.contains(item.element):!item.element.closest('dialog'));
      if(!same(anchors,matches))anchors=matches;
      const activeCodes=new Set(matches.map(item=>item.code));
      for(const [key,element] of tags){
        if(!activeCodes.has(key)){element.remove();tags.delete(key);}
      }
      const occupied:{x:number;y:number}[]=[];
      for(const item of matches){
        const rect=clipRect(item.element);
        let span=tags.get(item.code);
        if(!rect){if(span)span.hidden=true;continue;}
        if(!span){
          span=document.createElement('span');span.className='ui-reference-tag';
          span.dataset.uiRefCode=item.code;span.textContent=item.code;
          layer.appendChild(span);tags.set(item.code,span);
        }
        position(span,rect,occupied);
      }
      if(hover.textContent){
        hover.hidden=false;
        hover.style.right='10px';hover.style.bottom='10px';
      }else hover.hidden=true;
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
      document.removeEventListener('scroll',schedule,true);
      window.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('scroll',schedule);
      layer.remove();tags.clear();
    };
  },[enabled,rootRef]);
  return null;
}
