import {canonicalStatus} from '../../domain/status-contract';
import printLayout from '../../presentation/print-layout.json';

/** A4 landscape print snapshot of exactly the List heading and visible cells.
 * Preserve semantic L03/L04 rows, use original ID as one unbroken value,
 * and show a bare page number at the top only from page 2 onwards.
 */
export const LIST_A4_PRINT_CSS=`
/* Paged media counter: page 1 has no number; page 2 displays only "2". */
@page{
  size:A4 landscape;
  margin:13mm 8mm 8mm;
  @top-center{
    content:counter(page);
    font-family:Arial,"Segoe UI",sans-serif;
    font-size:9pt;
    color:#000;
  }
}
@page:first{@top-center{content:none}}
@media screen{#hdnd-a4-print-root{display:none!important}}
@media print{
  html,body[data-hdnd-a4-print="true"]{background:#fff!important}
  body[data-hdnd-a4-print="true"]>*:not(#hdnd-a4-print-root){display:none!important}
  body[data-hdnd-a4-print="true"]{margin:0!important;background:#fff!important}
  #hdnd-a4-print-root{
    display:block!important;position:static!important;margin:0!important;padding:0!important;
    background:#fff!important;color:#000!important;
    font-family:Arial,"Segoe UI",sans-serif!important;
  }
  #hdnd-a4-print-root *{color:#000!important;text-shadow:none!important;box-shadow:none!important}
  #hdnd-a4-print-root h1{
    font-size:14pt;font-weight:700;text-align:center;
    margin:0 0 4mm;padding:0;line-height:1.25;
  }
  #hdnd-a4-print-root table{
    border-collapse:collapse;border-spacing:0;width:100%;max-width:281mm;table-layout:fixed;
    font-size:8.15pt;line-height:1.3;color:#000;
  }
  #hdnd-a4-print-root thead{display:table-header-group}
  #hdnd-a4-print-root tr{break-inside:avoid;page-break-inside:avoid}
  #hdnd-a4-print-root th,#hdnd-a4-print-root td{
    border:.4pt solid #888;vertical-align:middle;padding:2mm 1.3mm;
    text-align:left;white-space:normal;overflow-wrap:break-word;word-break:normal;
    background:#fff;color:#000;
  }
  #hdnd-a4-print-root th{
    font-weight:700;text-align:center;background:#fff!important;
    padding:2.3mm 1mm;
  }
  /* No line break inside original 4-character IDs (NQ01/BC03). The
     colgroup also reserves 15mm regardless of its desktop screen ratio. */
  #hdnd-a4-print-root td[data-print-kind="displayCode"]{
    text-align:center;font-weight:400;font-size:8pt;
    white-space:nowrap!important;word-break:keep-all!important;
    overflow-wrap:normal!important;
  }
  #hdnd-a4-print-root .hdnd-print-document-main{
    font-weight:400!important;line-height:1.36;white-space:pre-line;
  }
  #hdnd-a4-print-root .hdnd-print-document-meta{
    margin-top:1mm;color:#000;line-height:1.26;
  }
  /* Owner-approved 28/11 final print design: three contiguous rows,
     two thin horizontal separators inset by the table cell padding.
     No vertical divider, nested borders, dashed lines or status fills.
     Labels and statuses retain aligned tracks, sized to the longest visible
     text in the actual print snapshot rather than the screen layout. */
  #hdnd-a4-print-root .hdnd-print-stage-row{
    display:grid;grid-template-columns:minmax(0,var(--hdnd-print-stage-label-width,${printLayout.leftPercent}%)) minmax(0,1fr);
    align-items:stretch;gap:0;min-height:${printLayout.minHeightMm}mm;box-sizing:border-box;
    margin:0;border:0;border-radius:0;background:#fff;
    break-inside:avoid;page-break-inside:avoid;
  }
  #hdnd-a4-print-root .hdnd-print-stage-label{
    display:flex;align-items:center;justify-content:flex-start;
    padding:.65mm .8mm;min-width:0;box-sizing:border-box;border:0;
    font-size:7.7pt;font-weight:600;line-height:1.3;
    text-align:left;overflow-wrap:anywhere;color:#000;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state{
    display:flex;align-items:center;justify-content:flex-start;
    min-width:0;box-sizing:border-box;
    padding:.65mm .8mm;border:0;
    background:transparent;text-align:left;font-weight:400;font-size:8pt;line-height:1.3;
    color:#000;overflow-wrap:anywhere;
  }
  #hdnd-a4-print-root .hdnd-print-stage-row + .hdnd-print-stage-row{
    border-top:.35pt solid #aaa;
  }
  #hdnd-a4-print-root .hdnd-print-stage-value{
    display:block;min-width:0;max-width:100%;overflow-wrap:anywhere;border:0;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="not-submitted"],
   #hdnd-a4-print-root .hdnd-print-plain[data-tone="not-submitted"]{
    color:#000;font-weight:700;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="not-required"],
   #hdnd-a4-print-root .hdnd-print-plain[data-tone="not-required"]{
    color:#000;font-style:italic;
  }
  #hdnd-a4-print-root td[data-print-kind="content"] .hdnd-print-plain{
    font-weight:400!important;
  }
  /* Print personnel as one left-aligned rail of full source values.
     No repeated field labels, blank label track, bold text or guessed names. */
  #hdnd-a4-print-root .hdnd-print-staff-row{
    display:block;margin:.75mm 0;
    break-inside:avoid;page-break-inside:avoid;
  }
  #hdnd-a4-print-root .hdnd-print-staff-value{
    display:block;font-size:8pt;font-weight:400!important;min-width:0;
    text-align:left;white-space:normal;overflow-wrap:anywhere;
  }
  #hdnd-a4-print-root td[data-print-kind="displayCode"] .hdnd-print-plain{
    font-weight:400!important;white-space:nowrap!important;
  }
  #hdnd-a4-print-root .hdnd-print-plain{
    white-space:pre-wrap;overflow-wrap:break-word;
  }
}
`;

/** Resolve the text visible in a real screen editor, not its hidden menu.
 * No new domain text is introduced: all values come from rendered members. */
function displayText(element:Element|null):string {
  if(!element)return '';
  const picker=element.querySelector('.cell-picker-value-text');
  const surface=picker??element.querySelector('.inline-note-trigger,.content-button');
  const value=surface?.textContent??element.textContent??'';
  return value.replace(/\s+/gu,' ').trim();
}
function appendPart(parent:HTMLElement,tag:'div'|'span',className:string,value:string):HTMLElement {
  const el=document.createElement(tag);
  el.className=className;
  el.textContent=value;
  parent.appendChild(el);
  return el;
}
/** Print categories are derived from the exact known status, not the
 * optional screen palette. Never label unfamiliar text as completed. */
export type PrintStageTone='not-submitted'|'processing'|'waiting'|'completed'|'not-required'|'neutral';
export function printStageTone(field:string,value:string):PrintStageTone{
  if(field!=='progressParty'&&field!=='progressBuild'&&field!=='progressCouncil')return 'neutral';
  const status=canonicalStatus(field,value);
  if(status==='Sở chưa trình')return 'not-submitted';
  if(status==='VP đang xử lý')return 'processing';
  if(field!=='progressCouncil'&&status==='Không phải trình')return 'not-required';
  if(field==='progressParty'){
    if(status==='Đã có TBKL')return 'completed';
    if(['Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL'].includes(status))return 'waiting';
  }
  if(field==='progressBuild'){
    if(status==='Đã có QĐ')return 'completed';
    if(status==='Đã trình, chờ QĐ')return 'waiting';
  }
  if(field==='progressCouncil'&&status==='Hoàn thành')return 'completed';
  return 'neutral';
}
function printStageRows(source:Element,target:HTMLTableCellElement):void {
  for(const row of Array.from(source.querySelectorAll('.compact-stage-row'))){
    const labelElement=row.querySelector('.compact-stage-title');
    let label=displayText(labelElement);
    const level=row.querySelector('.compact-stage-level[data-level-editor="true"]');
    const levelValue=displayText(level);
    if(levelValue&&!label.includes(levelValue))label+=' ('+levelValue+')';
    const status=row.querySelector('.compact-stage-state');
    const line=appendPart(target,'div','hdnd-print-stage-row','');
    appendPart(line,'span','hdnd-print-stage-label',label);
    const shown=displayText(status)||'—';
    const badge=appendPart(line,'span','hdnd-print-stage-state','');
    appendPart(badge,'span','hdnd-print-stage-value',shown);
    const tone=printStageTone(row.getAttribute('data-stage-field')??'',shown);
    line.dataset.tone=tone;
    badge.dataset.tone=tone;
  }
}
const PRINT_STAFF_FIELDS=['ubndLeader','vpLeader','room','specialist'] as const;
export type PrintStaffField=typeof PRINT_STAFF_FIELDS[number];
export type PrintStaffRecord={recordId:string}&Record<PrintStaffField,string>;
/** Only the visible source fields of this group may enter the print snapshot.
 * Full names come from the current row, not from reversing abbreviations.
 * Preserve a source title as-is and never manufacture a missing name/title. */
export function printStaffValues(visible:readonly PrintStaffField[],
  record:Readonly<Record<PrintStaffField,string>>):Array<{field:PrintStaffField;value:string}>{
  return PRINT_STAFF_FIELDS.filter(field=>visible.includes(field)).flatMap(field=>{
    const value=String(record[field]??'').replace(/\s+/gu,' ').trim();
    return value&&value!=='—'?[{field,value}]:[];
  });
}
function printStaffRows(source:Element,target:HTMLTableCellElement,record:PrintStaffRecord|undefined):void {
  // Even when CV + room share a screen line, print one actual source field per
  // line; the DOM is the visibility authority and the row is the text authority.
  const visible=PRINT_STAFF_FIELDS.filter(field=>source.querySelector('[data-ui-reference-part="'+field+'"]'));
  const fallback=Object.fromEntries(PRINT_STAFF_FIELDS.map(field=>[field,
    displayText(source.querySelector('[data-ui-reference-part="'+field+'"]'))])) as Record<PrintStaffField,string>;
  for(const part of printStaffValues(visible,record??fallback)){
    const row=appendPart(target,'div','hdnd-print-staff-row','');
    row.dataset.printStaffField=part.field;
    appendPart(row,'span','hdnd-print-staff-value',part.value);
  }
}
function printDocumentParts(source:Element,target:HTMLTableCellElement):void {
  const heading=source.querySelector('.compact-document-content');
  const metadata=source.querySelector('.compact-document-heading');
  if(heading)appendPart(target,'div','hdnd-print-document-main',displayText(heading));
  if(metadata){
    const type=displayText(metadata.querySelector('[data-ui-reference-part="type"]'));
    const department=displayText(metadata.querySelector('[data-ui-reference-part="department"]'));
    const parts=[type,department].filter(Boolean);
    const visibleMeta=parts.length?'('+parts.join(' - ')+')':displayText(metadata);
    if(visibleMeta)appendPart(target,'div','hdnd-print-document-meta',visibleMeta);
  }
}
function renderPrintCell(cell:HTMLTableCellElement,target:HTMLTableCellElement,record:PrintStaffRecord|undefined):void {
  const kind=cell.getAttribute('data-col-key')??'';
  target.dataset.printKind=kind;
  const documentGroup=cell.querySelector('.compact-document-group');
  const stages=cell.querySelector('.compact-stages');
  const staff=cell.querySelector('.compact-pair-lines');
  if(documentGroup)printDocumentParts(documentGroup,target);
  else if(stages)printStageRows(stages,target);
  else if(staff)printStaffRows(staff,target,record);
  else{
    // .code is the canonical visible ID; history icons are not table values.
    const code=kind==='displayCode'?cell.querySelector('.code'):null;
    const value=code??cell.querySelector('.inline-note-trigger')??cell;
    // An on-screen add prompt is an affordance, never printed business data.
    const plain=appendPart(target,'div','hdnd-print-plain',
      value.classList.contains('inline-note-empty')?'—':displayText(value));
    if(['progressParty','progressBuild','progressCouncil'].includes(kind))
      plain.dataset.tone=printStageTone(kind,plain.textContent??'');
  }
}

// CSS absolute units on A4 landscape (297mm minus two 8mm margins).
const PRINT_PX_PER_MM=96/25.4;
const PRINT_PAGE_WIDTH=281*PRINT_PX_PER_MM;
const PRINT_CELL_PADDING=2*1.3*PRINT_PX_PER_MM+1.5;
const PRINT_TRACK_PADDING=2*.8*PRINT_PX_PER_MM+2;

/** Widths are CSS pixels in the print font, not projected screen pixels. */
export type PrintGroupMeasure={index:number;kind:'stage'|'staff';labelPx:number;valuePx:number};
function printGroupNeed(group:PrintGroupMeasure):{labelWidthPx:number;needed:number}{
  const stage=group.kind==='stage';
  const labelWidthPx=stage?Math.ceil(group.labelPx+PRINT_TRACK_PADDING):0;
  const valueWidthPx=Math.ceil(group.valuePx+(stage?PRINT_TRACK_PADDING:2));
  const needed=(labelWidthPx+valueWidthPx+PRINT_CELL_PADDING)/PRINT_PAGE_WIDTH*100;
  return {labelWidthPx,needed};
}
/** Allocate both compact groups in a single pass. Neither can steal the other
 * group's required width when ordinary names/statuses fit the page. Keep the
 * fixed ID and reserve space for other visible columns. If an extraordinary
 * value exceeds the paper budget, wrap rather than clip or shrink the font. */
export function fitPrintGroupColumns(shares:readonly number[],codeIndex:number,
  groups:readonly PrintGroupMeasure[]):{shares:number[];labelWidths:Record<number,number>}{
  const result=[...shares],labelWidths:Record<number,number>={};
  const seen=new Set<number>();
  const fixed=groups.filter(g=>{
    if(!Number.isInteger(g.index)||g.index<0||g.index>=shares.length||g.index===codeIndex||
       seen.has(g.index)||!Number.isFinite(g.labelPx)||!Number.isFinite(g.valuePx)||g.labelPx<0||g.valuePx<0)return false;
    seen.add(g.index);return true;
  }).map(group=>({...group,...printGroupNeed(group)}));
  if(!fixed.length)return {shares:result,labelWidths};
  const others=shares.map((_,i)=>i).filter(i=>i!==codeIndex&&!seen.has(i));
  const free=100-(codeIndex>=0&&codeIndex<shares.length?shares[codeIndex]:0);
  const reserve=others.length?Math.min(free*.55,others.length*12/281*100):0;
  const budget=free-reserve;
  const required=fixed.reduce((sum,g)=>sum+g.needed,0);
  const used=others.length?Math.min(required,budget):free;
  // All ordinary groups get their natural width. On an impossible page,
  // share the remaining budget proportionally; the CSS fallback can wrap.
  for(const g of fixed){
    const target=required>0?used*g.needed/required:used/fixed.length;
    result[g.index]=target;
    if(g.kind==='stage'&&target+1e-6>=g.needed)labelWidths[g.index]=g.labelWidthPx;
  }
  const total=others.reduce((sum,i)=>sum+shares[i],0);
  for(const i of others)result[i]=(free-used)*(total>0?shares[i]/total:1/others.length);
  return {shares:result,labelWidths};
}
export function fitPrintStageColumn(shares:readonly number[],stageIndex:number,codeIndex:number,
  labelTextPx:number,statusTextPx:number):{shares:number[];labelWidthPx?:number}{
  const fit=fitPrintGroupColumns(shares,codeIndex,[{index:stageIndex,kind:'stage',labelPx:labelTextPx,valuePx:statusTextPx}]);
  return {shares:fit.shares,labelWidthPx:fit.labelWidths[stageIndex]};
}
function measurePrintStageText(tbody:HTMLTableSectionElement):{index:number;labelPx:number;statePx:number}|null{
  const row=tbody.querySelector('.hdnd-print-stage-row');
  const index=row?.closest('td')?.cellIndex??-1;
  if(index<0)return null;
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  let labelPx=0,statePx=0;
  for(const stage of Array.from(tbody.querySelectorAll('.hdnd-print-stage-row'))){
    const label=stage.querySelector('.hdnd-print-stage-label')?.textContent??'';
    const state=stage.querySelector('.hdnd-print-stage-state');
    const tone=state?.getAttribute('data-tone');
    ctx.font='600 7.7pt Arial, "Segoe UI", sans-serif';
    labelPx=Math.max(labelPx,ctx.measureText(label).width);
    ctx.font=(tone==='not-required'?'italic ':tone==='not-submitted'?'700 ':'400 ')+'8pt Arial, "Segoe UI", sans-serif';
    statePx=Math.max(statePx,ctx.measureText(state?.textContent??'').width);
  }
  return {index,labelPx,statePx};
}

function measurePrintStaffText(tbody:HTMLTableSectionElement):PrintGroupMeasure[]{
  const canvas=tbody.ownerDocument.createElement('canvas');
  const ctx=canvas.getContext('2d');
  if(!ctx)return [];
  const groups=new Map<number,PrintGroupMeasure>();
  for(const row of Array.from(tbody.querySelectorAll('.hdnd-print-staff-row'))){
    const index=row.closest('td')?.cellIndex??-1;
    if(index<0)continue;
    const group=groups.get(index)??{index,kind:'staff',labelPx:0,valuePx:0};
    ctx.font='400 8pt Arial, "Segoe UI", sans-serif';
    group.valuePx=Math.max(group.valuePx,ctx.measureText(row.querySelector('.hdnd-print-staff-value')?.textContent??'').width);
    groups.set(index,group);
  }
  return [...groups.values()];
}

const DOM_ID='hdnd-a4-print-root';
export function printVisibleListA4(title:string,table:HTMLTableElement,headers:readonly string[],
  staffRecords:readonly PrintStaffRecord[]=[]):void{
  if(!title.trim()||!table.tBodies.length||headers.length<1)
    throw Error('Không tìm thấy tiêu đề hoặc bảng hiện hành để in.');
  const sourceRows=Array.from(table.tBodies[0].rows).filter(row=>
    row.cells.length===headers.length&&!row.querySelector('td.empty'));
  const root=document.createElement('section');root.id=DOM_ID;
  root.setAttribute('aria-label','Bản in danh sách nội dung HĐND');
  const h=document.createElement('h1');h.textContent=title;root.appendChild(h);
  const printed=document.createElement('table');
  const cols=document.createElement('colgroup');
  const screenCols=Array.from(table.querySelectorAll('colgroup col')).slice(0,headers.length);
  const sizes=screenCols.map(col=>Math.max(1,col.getBoundingClientRect().width));
  const screenHeaders=Array.from(table.tHead?.rows[0]?.cells??[]);
  const codeIndex=screenHeaders.findIndex(c=>c.getAttribute('data-column-key')==='displayCode');
  const codeShare=codeIndex<0?0:100*15/(297-16); // 15 mm ID rail on A4 landscape
  const otherTotal=sizes.reduce((total,width,index)=>
    total+(index===codeIndex?0:width),0)||1;
  const shares=headers.map((_,i)=>i===codeIndex?codeShare:
    (100-codeShare)*(sizes[i]??1)/otherTotal);
  for(let i=0;i<headers.length;i++){
    const col=document.createElement('col');
    col.style.width=shares[i].toFixed(3)+'%';
    if(i===codeIndex)col.className='hdnd-print-id-col';
    cols.appendChild(col);
  }
  printed.appendChild(cols);
  const thead=document.createElement('thead'),headRow=document.createElement('tr');
  for(const label of headers){const th=document.createElement('th');th.textContent=label;headRow.appendChild(th);}
  thead.appendChild(headRow);printed.appendChild(thead);
  const tbody=document.createElement('tbody');
  const staffById=new Map(staffRecords.map(record=>[record.recordId,record]));
  for(const row of sourceRows){
    const tr=document.createElement('tr');
    const record=staffById.get(row.dataset.uiReferenceRecordId??'');
    for(const cell of Array.from(row.cells)){
      const td=document.createElement('td');
      renderPrintCell(cell,td,record);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  // Compute once for all printed rows, not once per record/page. The left
  // rail stays aligned and the reclaimed width is available to other columns.
  const stageMeasure=measurePrintStageText(tbody);
  const staffMeasures=measurePrintStaffText(tbody);
  const measures:PrintGroupMeasure[]=[...staffMeasures];
  if(stageMeasure)measures.push({index:stageMeasure.index,kind:'stage',
    labelPx:stageMeasure.labelPx,valuePx:stageMeasure.statePx});
  if(measures.length){
    const fitted=fitPrintGroupColumns(shares,codeIndex,measures);
    Array.from(cols.children).forEach((col,index)=>{
      (col as HTMLTableColElement).style.width=fitted.shares[index].toFixed(3)+'%';
    });
    for(const group of measures){
      const labelWidth=fitted.labelWidths[group.index];
      if(labelWidth===undefined)continue;
      if(group.kind==='stage')printed.style.setProperty('--hdnd-print-stage-label-width',labelWidth+'px');
    }
  }
  printed.appendChild(tbody);root.appendChild(printed);
  const style=document.createElement('style');style.id=DOM_ID+'-style';
  style.textContent=LIST_A4_PRINT_CSS;
  document.getElementById(DOM_ID)?.remove();
  document.getElementById(style.id)?.remove();
  const previousTitle=document.title;
  document.head.appendChild(style);document.body.appendChild(root);
  document.title=title;document.body.dataset.hdndA4Print='true';
  let cleaned=false;
  const clean=()=>{
    if(cleaned)return;cleaned=true;root.remove();style.remove();
    delete document.body.dataset.hdndA4Print;document.title=previousTitle;
    window.removeEventListener('afterprint',clean);
  };
  window.addEventListener('afterprint',clean);
  try{window.print();}
  catch(cause){clean();throw cause;}
}
