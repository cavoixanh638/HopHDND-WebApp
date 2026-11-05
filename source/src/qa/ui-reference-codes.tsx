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
  {code:'L07',selector:'.item-data-table thead th[data-column-key="stt"]'},
  {code:'L08',selector:'.item-data-table thead th[data-column-key="isDropped"]'},
  {code:'L09',selector:'.item-data-table thead th[data-column-key="partyMeeting"]'},
  {code:'L10',selector:'.item-data-table thead th[data-column-key="examined"]'},
  {code:'L01',selector:'.item-data-table thead th[data-column-key="displayCode"]'},
  {code:'L02',selector:'.item-data-table thead th[data-column-key="content"]'},
  {code:'L03',selector:'.item-data-table thead th[data-column-key="partyLevel"], .item-data-table thead th[data-column-key="progressParty"], .item-data-table thead th[data-column-key="progressBuild"], .item-data-table thead th[data-column-key="progressCouncil"]'},
  {code:'L04',selector:'.item-data-table thead th[data-column-key="room"], .item-data-table thead th[data-column-key="ubndLeader"], .item-data-table thead th[data-column-key="vpLeader"], .item-data-table thead th[data-column-key="specialist"]'},
  {code:'L05',selector:'.item-data-table thead th[data-column-key="specificProgress"]'},
  {code:'L06',selector:'.item-data-table thead th[data-column-key="note"]'},
  {code:'P00',selector:'dialog.report-grid-modal'},
  {code:'P10',selector:'.report-grid-toolbar'},
  {code:'P11',selector:'.report-grid-actions'},
  {code:'P12',selector:'.report-grid-settings'},
  {code:'P01',selector:'.report-detail-grid thead th[data-column-key="displayCode"]'},
  {code:'P02',selector:'.report-detail-grid thead th[data-column-key="content"]'},
  {code:'P03',selector:'.report-detail-grid thead th[data-column-key="partyLevel"], .report-detail-grid thead th[data-column-key="progressParty"], .report-detail-grid thead th[data-column-key="progressBuild"], .report-detail-grid thead th[data-column-key="progressCouncil"]'},
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
/** The registry is keyed by business meaning, never projected column order.
 * L03 = three stages, L04 = people/room, L06 = notes regardless of column moves.
 * A subfield code is also stable when its merged column anchor changes. */
export const UI_REFERENCE_FIELDS:Readonly<Record<string,string>>=Object.freeze({
  displayCode:'01.1', content:'02.1', department:'02.2', type:'02.3',
  partyLevel:'03.1.LEVEL', progressParty:'03.1.STATUS',
  progressBuild:'03.2.STATUS', progressCouncil:'03.3.STATUS',
  ubndLeader:'04.1', vpLeader:'04.2', room:'04.3', specialist:'04.4',
  specificProgress:'05.1', note:'06.1',
  stt:'07.1', isDropped:'08.1', partyMeeting:'09.1', examined:'10.1'
});
export const UI_REFERENCE_STAGES:Readonly<Record<string,string>>=Object.freeze({
  progressParty:'03.1',progressBuild:'03.2',progressCouncil:'03.3'
});
const SAFE_KEY=/^[a-zA-Z0-9_-]{1,120}$/;
const keySuffix=(value:string)=>encodeURIComponent(value);
const fieldCode=(key:string)=>UI_REFERENCE_FIELDS[key]??('90.'+keySuffix(key));
const areaCode=(key:string)=>fieldCode(key).split('.')[0];
const cellScope=(table:Element)=>table.matches('.report-detail-grid')?'P':'L';

/** Stable ID is deliberately DOM-provided, not inferred from displayCode,
 * React key, row position, displayed text, or other private business values.
 * UI workers must put data-ui-reference-record-id={item.recordId} on <tr>.
 */
export function uiReferenceRecordSuffix(row:Element|null):string|null{
  const id=row?.getAttribute('data-ui-reference-record-id');
  return id&&id.trim()?('@'+keySuffix(id)):null;
}
/** A compact on-screen preview, while the full semantic key remains in
 * data-ui-ref-code, aria-label, title and clipboard. Numeric report cells
 * otherwise cannot fit their long record-backed identities inside 150px. */
export function uiReferenceShortCode(code:string):string{
  if(!/^R[0-9]{2}\.CELL\./.test(code))return code.split('@')[0];
  let hash=2166136261;
  for(let i=0;i<code.length;i++)hash=Math.imul(hash^code.charCodeAt(i),16777619)>>>0;
  return code.slice(0,3)+'·'+hash.toString(36).padStart(7,'0');
}
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
  for(const [id,code] of Object.entries(UI_REFERENCE_REPORT_IDS))
    add(code,'.report-surface[data-ui-reference-report="'+id+'"] > .card-header');
  return result;
}
export type UiReferenceTarget={code:string;element:Element;instance:boolean};
const matchWithin=(target:Element,selector:string,container:Element)=>{
  const found=target.closest(selector);
  return found&&container.contains(found)?found:null;
};
const stageCode=(key:string)=>UI_REFERENCE_STAGES[key]??null;
const reportCode=(id:string)=>UI_REFERENCE_REPORT_IDS[id]??null;
/** Exact matrix-cell ID. Invalid/missing business keys are unidentifiable,
 * not a generic Rxx.TABLE code shared by unrelated numerical cells. */
export function uiReferenceReportCellCode(reportId:string,rowKey:string,columnKey:string):string|null{
  const base=reportCode(reportId);
  if(!base||!rowKey.trim()||!columnKey.trim())return null;
  return base+'.CELL.'+keySuffix(rowKey)+'.'+keySuffix(columnKey);
}
const getExplicitPart=(target:Element,cell:Element)=>{
  const node=matchWithin(target,'[data-ui-reference-part]',cell);
  const part=node?.getAttribute('data-ui-reference-part')??'';
  return SAFE_KEY.test(part)?part:null;
};

/** Resolve the exact cell or control from semantic keys, independent of sort
 * and filter. A data cell without a stable ID is not copyable, by design. */
export function resolveUiReferenceTarget(target:Element,root:Element):UiReferenceTarget|null{
  if(!root.contains(target)||target.closest('[data-ui-reference-layer]'))return null;
  const table=target.closest('table');
  const dataTable=table?.matches('.item-data-table,.report-detail-grid')?table:null;
  if(dataTable){
    const prefix=cellScope(dataTable);
    const cell=matchWithin(target,'td[data-col-key]',dataTable);
    if(cell){
      const suffix=uiReferenceRecordSuffix(cell.closest('tr'));
      if(!suffix)return null;
      const key=cell.getAttribute('data-col-key')??'';
      const part=getExplicitPart(target,cell);
      const stage=matchWithin(target,'[data-stage-field]',cell);
      const stageKey=stage?.getAttribute('data-stage-field')??'';
      const stageNumber=stageCode(stageKey);
      let number=part&&UI_REFERENCE_FIELDS[part]?fieldCode(part):'';
      if(!number&&stageNumber){
        if(matchWithin(target,'.compact-stage-level',stage!)||part==='partyLevel')
          number='03.1.LEVEL';
        else if(matchWithin(target,'.compact-stage-state',stage!)||part===stageKey)
          number=stageNumber+'.STATUS';
        else if(matchWithin(target,'.compact-stage-label,.compact-stage-title',stage!))
          number=stageNumber+'.LABEL';
        else number=stageNumber;
      }
      if(!number&&matchWithin(target,'.compact-document-content',cell))number='02.1';
      if(!number&&matchWithin(target,'.compact-document-department',cell))number='02.2';
      if(!number&&matchWithin(target,'.compact-document-badge',cell))number='02.3';
      if(!number&&matchWithin(target,'.compact-document-group',cell))number='02';
      if(!number&&matchWithin(target,'.compact-pair-lines',cell))number='04';
      if(!number)number=fieldCode(part??key);
      const history=matchWithin(target,'.item-history-action',cell);
      const control=matchWithin(target,
        'input,textarea,select,button,[role="combobox"],[role="textbox"]',cell);
      if(history)number+='.HISTORY';
      else if(control)number+='.CONTROL';
      else if(part==='history'||part==='control')number+='.'+part.toUpperCase();
      const anchor=(part&&matchWithin(target,'[data-ui-reference-part]',cell))||
        (stageNumber&&matchWithin(target,
          '.compact-stage-level,.compact-stage-state,.compact-stage-title,.compact-stage-row',cell))||
        matchWithin(target,'.compact-document-content,.compact-document-department,.compact-document-badge',cell)||
        cell;
      return {code:prefix+number+suffix,element:anchor,instance:true};
    }
    const heading=matchWithin(target,'thead th[data-column-key]',dataTable);
    if(heading){
      const key=heading.getAttribute('data-column-key')??'';
      const code=prefix+areaCode(key);
      const suffix=matchWithin(target,'.column-sort-button',heading)?'.SORT':
        matchWithin(target,'.column-resizer',heading)?'.RESIZE':
        matchWithin(target,'.column-heading-label',heading)?'.TITLE':'';
      return {code:code+suffix,element:heading,instance:false};
    }
    const filter=matchWithin(target,
      'thead tr.item-column-filter-row th[data-filter-key],thead tr.report-grid-filter-row th[data-filter-key]',
      dataTable);
    if(filter){
      return {code:prefix+areaCode(filter.getAttribute('data-filter-key')??'')+'.FILTER',
        element:filter,instance:false};
    }
    const filterRow=matchWithin(target,
      'thead tr.item-column-filter-row,thead tr.report-grid-filter-row',dataTable);
    if(filterRow)return {code:prefix+'00.FILTER',element:filterRow,instance:false};
    return {code:prefix+'00',element:dataTable,instance:false};
  }
  // The summary stage is selected BEFORE the whole summary card.
  const bucket=matchWithin(target,'.item-summary-bucket[data-summary-report][data-summary-stage]',root);
  if(bucket){
    const report=bucket.getAttribute('data-summary-report')??'';
    const step=bucket.getAttribute('data-summary-stage')??'';
    const group=stages.find(s=>s.report===report);
    const index=group?.steps.findIndex(s=>s===step)??-1;
    if(group&&index>=0)return {code:group.code+'.'+(index+1),element:bucket,instance:false};
  }
  const report=matchWithin(target,'.report-surface[data-ui-reference-report]',root);
  if(report){
    const base=reportCode(report.getAttribute('data-ui-reference-report')??'');
    if(base){
      const stage=matchWithin(target,'.report-stage-summary',report);
      if(stage){
        const semantic=['source','office','next','completed'].find(k=>
          stage.classList.contains('report-stage-'+k));
        if(semantic)return {code:base+'.STAGE.'+semantic.toUpperCase(),element:stage,instance:false};
      }
      const cell=matchWithin(target,'.report-table td,.report-table th',report);
      if(cell){
        const row=cell.closest('[data-ui-reference-report-row]');
        const column=cell.getAttribute('data-ui-reference-report-column');
        const code=row&&column?uiReferenceReportCellCode(
          report.getAttribute('data-ui-reference-report')??'',
          row.getAttribute('data-ui-reference-report-row')??'',column):null;
        // Never invent one shared generic code for different numerical cells.
        return code?{code,element:cell,instance:false}:null;
      }
      const print=matchWithin(target,'.card-header button',report);
      if(print)return {code:base+'.PRINT',element:print,instance:false};
      const header=matchWithin(target,'.card-header',report);
      return {code:base+(header?'.HEADER':''),element:header??report,instance:false};
    }
  }
  const dialog=matchWithin(target,'dialog.report-grid-modal[open]',root);
  if(dialog){
    const match=UI_REFERENCE_AREAS.find(a=>a.code.startsWith('P')&&
      a.code!=='P00'&&matchWithin(target,a.selector,dialog));
    const element=match?matchWithin(target,match.selector,dialog):dialog;
    return {code:match?.code??'P00',element:element??dialog,instance:false};
  }
  for(const area of UI_REFERENCE_AREAS){
    if(area.code.startsWith('L')||area.code.startsWith('P')||
       area.code.startsWith('R'))continue;
    const element=matchWithin(target,area.selector,root);
    if(element)return {code:area.code,element,instance:false};
  }
  return {code:'A00',element:root,instance:false};
}
export function uiReferenceForCell(target:Element,root:Element):string|null{
  if(!target.closest('td[data-col-key]'))return null;
  return resolveUiReferenceTarget(target,root)?.code??null;
}

type RefBox={left:number;top:number;width:number;height:number};
const overlaps=(a:RefBox,b:RefBox,pad=2)=>
  a.left<b.left+b.width+pad&&a.left+a.width+pad>b.left&&
  a.top<b.top+b.height+pad&&a.top+a.height+pad>b.top;
const isVisible=(element:Element)=>{
  const style=getComputedStyle(element);
  return style.display!=='none'&&style.visibility==='visible'&&style.opacity!=='0';
};
function clippedRect(element:Element):RefBox|null{
  const rectangle=element.getBoundingClientRect();
  let left=Math.max(0,rectangle.left),right=Math.min(innerWidth,rectangle.right);
  let top=Math.max(0,rectangle.top),bottom=Math.min(innerHeight,rectangle.bottom);
  for(let parent=element.parentElement;parent;parent=parent.parentElement){
    const style=getComputedStyle(parent);
    if(/hidden|auto|scroll|clip/.test(style.overflowX+' '+style.overflowY)){
      const r=parent.getBoundingClientRect();
      left=Math.max(left,r.left);right=Math.min(right,r.right);
      top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);
    }
  }
  return right-left>=20&&bottom-top>=14?
    {left,top,width:right-left,height:bottom-top}:null;
}
/** Only inspect visible content INSIDE the active anchor, not all rows.
 * Never cover glyphs, native inputs, an open picker caret or resize handle. */
function obstacles(anchor:Element):RefBox[]{
  const blocked:RefBox[]=[];
  const walker=document.createTreeWalker(anchor,NodeFilter.SHOW_TEXT);
  const range=document.createRange();
  let visited=0;
  while(walker.nextNode()&&visited++<160){
    const node=walker.currentNode,el=node.parentElement;
    if(!el||!node.textContent?.trim()||!isVisible(el)||
      el.closest('[data-ui-reference-layer],[hidden],[aria-hidden="true"]'))continue;
    range.selectNodeContents(node);
    for(const r of range.getClientRects())if(r.width>0&&r.height>0)
      blocked.push({left:r.left,top:r.top,width:r.width,height:r.height});
  }
  for(const el of anchor.querySelectorAll(
    'button,input,select,textarea,summary,[role="combobox"],[role="textbox"],'+
    '.column-resizer,.cell-picker-caret,[class*="caret"],[class*="chevron"]')){
    if(!isVisible(el))continue;
    const r=el.getBoundingClientRect();
    if(r.width&&r.height)blocked.push({left:r.left,top:r.top,width:r.width,height:r.height});
  }
  return blocked;
}
function positionMarker(badge:HTMLElement,anchor:Element):boolean{
  const rect=clippedRect(anchor);
  if(!rect||!isVisible(anchor))return false;
  badge.hidden=false;
  badge.style.visibility='hidden';
  badge.style.left='0px';badge.style.top='0px';
  badge.dataset.uiRefCompact='false';
  let metrics=badge.getBoundingClientRect();
  if(metrics.width>rect.width-6){
    badge.dataset.uiRefCompact='true';
    metrics=badge.getBoundingClientRect();
  }
  if(rect.width<metrics.width+4||rect.height<metrics.height+3)return false;
  // Large headers can have a title on the left and a print action on the
  // right. Try open interior slots too; every candidate is still rejected
  // if it overlaps a glyph, caret or interactive control.
  const centered=rect.left+(rect.width-metrics.width)/2;
  const candidates=[
    {left:rect.left+rect.width-metrics.width-2,top:rect.top+2},
    {left:rect.left+2,top:rect.top+2},
    {left:rect.left+rect.width-metrics.width-2,top:rect.top+rect.height-metrics.height-2},
    {left:rect.left+2,top:rect.top+rect.height-metrics.height-2},
    {left:centered,top:rect.top+2},
    {left:centered,top:rect.top+rect.height-metrics.height-2},
    {left:rect.left+rect.width*0.25-metrics.width/2,top:rect.top+2},
    {left:rect.left+rect.width*0.75-metrics.width/2,top:rect.top+2}
  ].map(p=>({...p,width:metrics.width,height:metrics.height}));
  const blocked=obstacles(anchor);
  const place=candidates.find(p=>p.left>=rect.left+1&&p.top>=rect.top+1&&
    p.left+p.width<=rect.left+rect.width-1&&
    p.top+p.height<=rect.top+rect.height-1&&
    !blocked.some(b=>overlaps(p,b,0)));
  if(!place)return false;
  badge.style.left=place.left+'px';badge.style.top=place.top+'px';
  badge.style.visibility='visible';
  return true;
}
async function copyReferenceCode(value:string):Promise<boolean>{
  try{
    if(!navigator.clipboard?.writeText)return false;
    await navigator.clipboard.writeText(value);
    return true;
  }catch{return false;}
}

/** Portal is visual only except for ONE small explicit copy button.
 * No persistence, write service, network, business text or telemetry.
 * Parent App/QA enables it ONLY when admin reference mode is active. */
export function UiReferenceOverlay({enabled,rootRef}:{
  enabled:boolean;rootRef:RefObject<HTMLElement|null>;
}){
  useEffect(()=>{
    const root=rootRef.current;
    if(!enabled||!root)return;
    const bodyLayer=document.createElement('div');
    bodyLayer.className='ui-reference-layer';
    bodyLayer.dataset.uiReferenceLayer='';
    bodyLayer.setAttribute('aria-label','Công cụ sao chép mã vùng giao diện');
    document.body.appendChild(bodyLayer);
    const dialogLayer=document.createElement('div');
    dialogLayer.className='ui-reference-layer';
    dialogLayer.dataset.uiReferenceLayer='';
    dialogLayer.setAttribute('aria-label','Công cụ sao chép mã vùng popup');
    const badge=document.createElement('div');
    badge.className='ui-reference-badge';
    badge.dataset.uiReferenceHover='';
    badge.hidden=true;
    const value=document.createElement('span');
    value.className='ui-reference-value';
    const short=document.createElement('span');
    short.className='ui-reference-short';
    const copy=document.createElement('button');
    copy.className='ui-reference-copy';
    copy.type='button';
    copy.textContent='⧉';
    const feedback=document.createElement('span');
    feedback.className='ui-reference-feedback';
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
    badge.append(value,short,copy,feedback);
    bodyLayer.appendChild(badge);
    let dialog:HTMLDialogElement|null=null;
    let pending=0,disposed=false;
    let hovered:Element|null=null,focused:Element|null=null,lastPointer:Element|null=null;
    let keyboardFocusPriority=false;
    let current:UiReferenceTarget|null=null;
    // Preserve keyboard focus until a real pointer enters another target.
    // A stale focused nav button must not hide the code of a hovered report.
    const active=()=>copy.contains(document.activeElement)?current?.element??hovered:
      keyboardFocusPriority&&focused&&root.contains(focused)?focused:
      hovered&&root.contains(hovered)?hovered:
      focused&&root.contains(focused)?focused:null;
    const schedule=()=>{
      if(!disposed&&!pending)pending=requestAnimationFrame(redraw);
    };
    const redraw=()=>{
      pending=0;
      if(disposed||!root.isConnected)return;
      const nextDialog=root.querySelector<HTMLDialogElement>('dialog.report-grid-modal[open]');
      if(nextDialog!==dialog){
        dialog=nextDialog;
        if(dialog)dialog.appendChild(dialogLayer);else dialogLayer.remove();
      }
      const parent=dialog?dialogLayer:bodyLayer;
      if(badge.parentElement!==parent)parent.appendChild(badge);
      const source=active();
      const next=source===current?.element?current:source?resolveUiReferenceTarget(source,root):null;
      if(!next||(dialog&&!dialog.contains(next.element))||
        (!dialog&&next.element.closest('dialog'))||!next.element.isConnected){
        current=null;badge.hidden=true;return;
      }
      if(next.code!==current?.code||next.element!==current?.element){
        feedback.textContent='';
      }
      current=next;
      value.textContent=next.code;
      short.textContent=uiReferenceShortCode(next.code);
      badge.dataset.uiRefCode=next.code;
      copy.setAttribute('aria-label','Sao chép mã '+next.code);
      copy.title='Sao chép '+next.code;
      badge.title=next.code;
      badge.dataset.uiRefPlacement='suppressed';
      badge.hidden=false;
      if(positionMarker(badge,next.element)){
        badge.dataset.uiRefPlacement='inside';
      }else badge.hidden=true;
    };
    const onPointer=(event:Event)=>{
      const node=event.target;
      if(!(node instanceof Element)||!root.contains(node))return;
      if(node===lastPointer)return;
      lastPointer=node;hovered=node;keyboardFocusPriority=false;schedule();
    };
    const onLeave=(event:Event)=>{
      // Crossing to the copy button must not dismiss the marker before click.
      const next=(event as PointerEvent).relatedTarget;
      if(next instanceof Node&&
        (bodyLayer.contains(next)||dialogLayer.contains(next)))return;
      hovered=null;lastPointer=null;schedule();
    };
    const onFocus=(event:FocusEvent)=>{
      if(event.target instanceof Element){focused=event.target;keyboardFocusPriority=true;schedule();}
    };
    const onBlur=()=>{
      queueMicrotask(()=>{
        const next=document.activeElement;
        focused=next instanceof Element&&root.contains(next)&&!next.closest('[data-ui-reference-layer]')?next:null;
        schedule();
      });
    };
    const onClick=()=>{
      const code=current?.code;
      if(!code)return;
      // Only synthetic UI code + opaque recordId are copied, never cell text.
      void copyReferenceCode(code).then(ok=>{
        if(disposed||current?.code!==code)return;
        feedback.textContent=ok?'Đã sao chép':'Không thể sao chép';
        badge.dataset.uiRefCopy=ok?'ok':'error';
      });
    };
    copy.addEventListener('click',onClick);
    const observer=new MutationObserver(list=>{
      if(list.some(m=>!(m.target instanceof Element&&m.target.closest('[data-ui-reference-layer]'))))
        schedule();
    });
    observer.observe(root,{subtree:true,childList:true,attributes:true,
      attributeFilter:['class','style','open','data-col-key','data-column-key',
        'data-ui-reference-record-id','data-ui-reference-part','data-stage-field']});
    const resize=new ResizeObserver(schedule);resize.observe(root);
    root.addEventListener('pointerover',onPointer,{passive:true});
    root.addEventListener('pointermove',onPointer,{passive:true});
    root.addEventListener('pointerleave',onLeave,{passive:true});
    root.addEventListener('focusin',onFocus);
    root.addEventListener('focusout',onBlur);
    root.addEventListener('click',schedule,true);
    document.addEventListener('scroll',schedule,true);
    document.addEventListener('close',schedule,true);
    window.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
    schedule();
    return()=>{
      disposed=true;if(pending)cancelAnimationFrame(pending);
      observer.disconnect();resize.disconnect();
      copy.removeEventListener('click',onClick);
      root.removeEventListener('pointerover',onPointer);
      root.removeEventListener('pointermove',onPointer);
      root.removeEventListener('pointerleave',onLeave);
      root.removeEventListener('focusin',onFocus);
      root.removeEventListener('focusout',onBlur);
      root.removeEventListener('click',schedule,true);
      document.removeEventListener('scroll',schedule,true);
      document.removeEventListener('close',schedule,true);
      window.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('scroll',schedule);
      bodyLayer.remove();dialogLayer.remove();
    };
  },[enabled,rootRef]);
  return null;
}
