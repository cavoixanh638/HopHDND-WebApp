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
    border-collapse:collapse;border-spacing:0;width:100%;table-layout:fixed;
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
    text-align:center;font-weight:700;font-size:8pt;
    white-space:nowrap!important;word-break:keep-all!important;
    overflow-wrap:normal!important;
  }
  #hdnd-a4-print-root .hdnd-print-document-main{
    font-weight:400!important;line-height:1.36;white-space:pre-line;
  }
  #hdnd-a4-print-root .hdnd-print-document-meta{
    margin-top:1mm;color:#000;line-height:1.26;
  }
  /* Owner-approved 27/11: one closed two-compartment box per stage.
     The thin internal divider separates a left label from a centered
     status; no colored fill or full-table-cell rules. */
  #hdnd-a4-print-root .hdnd-print-stage-row{
    display:grid;grid-template-columns:minmax(0,${printLayout.leftPercent}fr) minmax(0,${100-printLayout.leftPercent}fr);
    align-items:stretch;gap:0;min-height:${printLayout.minHeightMm}mm;box-sizing:border-box;
    border:${printLayout.outlinePt}pt solid #777;border-radius:${printLayout.radiusMm}mm;background:#fff;
    break-inside:avoid;page-break-inside:avoid;
  }
  #hdnd-a4-print-root .hdnd-print-stage-row:not(:first-child){
    margin-top:${printLayout.gapMm}mm;
  }
  #hdnd-a4-print-root .hdnd-print-stage-label{
    display:flex;align-items:center;justify-content:flex-start;
    padding:.65mm .8mm;min-width:0;box-sizing:border-box;
    font-size:7.7pt;font-weight:600;line-height:1.3;
    text-align:left;overflow-wrap:anywhere;color:#000;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state{
    display:flex;align-items:center;justify-content:center;
    min-width:0;box-sizing:border-box;
    padding:.65mm .8mm;border-left:${printLayout.dividerPt}pt solid #888;
    background:transparent;text-align:center;font-weight:400;font-size:8pt;line-height:1.3;
    color:#000;overflow-wrap:anywhere;
  }
  #hdnd-a4-print-root .hdnd-print-stage-value{
    display:block;min-width:0;max-width:100%;overflow-wrap:anywhere;
  }
  #hdnd-a4-print-root .hdnd-print-stage-row[data-tone="not-submitted"]{
    border-color:#444;
  }
  #hdnd-a4-print-root .hdnd-print-stage-row[data-tone="not-required"]{
    border-style:dashed;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="not-submitted"]{
    color:#000;font-weight:700;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="not-required"]{
    color:#000;font-style:italic;
  }
  #hdnd-a4-print-root td[data-print-kind="content"] .hdnd-print-plain{
    font-weight:400!important;
  }
  /* The L04 source has 4 independent office/room/staff lines. */
  #hdnd-a4-print-root .hdnd-print-staff-row{
    display:grid;grid-template-columns:12mm minmax(0,1fr);
    align-items:center;gap:1.6mm;margin:.75mm 0;
    break-inside:avoid;page-break-inside:avoid;
  }
  #hdnd-a4-print-root .hdnd-print-staff-tag{
    background:transparent;color:#000;
    font-size:7pt;font-weight:700;text-align:left;padding:0 .6mm 0 0;
  }
  #hdnd-a4-print-root .hdnd-print-staff-value{
    font-size:8pt;white-space:pre-wrap;overflow-wrap:break-word;
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
function printStaffRows(source:Element,target:HTMLTableCellElement):void {
  // The WebApp uses .compact-pair-lines for UBND, VP, Phòng and CV.
  for(const line of Array.from(source.children)){
    const title=displayText(line.querySelector('.compact-pair-tag'));
    const names=Array.from(line.querySelectorAll('[data-ui-reference-part]'))
      .map(displayText).filter(Boolean);
    const value=names.join(' ')||displayText(line).replace(title,'').trim();
    if(!title&&!value)continue;
    const row=appendPart(target,'div','hdnd-print-staff-row','');
    appendPart(row,'span','hdnd-print-staff-tag',title);
    appendPart(row,'span','hdnd-print-staff-value',value);
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
function renderPrintCell(cell:HTMLTableCellElement,target:HTMLTableCellElement):void {
  const kind=cell.getAttribute('data-col-key')??'';
  target.dataset.printKind=kind;
  const documentGroup=cell.querySelector('.compact-document-group');
  const stages=cell.querySelector('.compact-stages');
  const staff=cell.querySelector('.compact-pair-lines');
  if(documentGroup)printDocumentParts(documentGroup,target);
  else if(stages)printStageRows(stages,target);
  else if(staff)printStaffRows(staff,target);
  else{
    // .code is the canonical visible ID; history icons are not table values.
    const code=kind==='displayCode'?cell.querySelector('.code'):null;
    const value=code??cell.querySelector('.inline-note-trigger')??cell;
    // An on-screen add prompt is an affordance, never printed business data.
    appendPart(target,'div','hdnd-print-plain',
      value.classList.contains('inline-note-empty')?'—':displayText(value));
  }
}

const DOM_ID='hdnd-a4-print-root';
export function printVisibleListA4(title:string,table:HTMLTableElement,headers:readonly string[]):void{
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
  for(let i=0;i<headers.length;i++){
    const col=document.createElement('col');
    const proportion=i===codeIndex?codeShare:
      (100-codeShare)*(sizes[i]??1)/otherTotal;
    col.style.width=proportion.toFixed(3)+'%';
    if(i===codeIndex)col.className='hdnd-print-id-col';
    cols.appendChild(col);
  }
  printed.appendChild(cols);
  const thead=document.createElement('thead'),headRow=document.createElement('tr');
  for(const label of headers){const th=document.createElement('th');th.textContent=label;headRow.appendChild(th);}
  thead.appendChild(headRow);printed.appendChild(thead);
  const tbody=document.createElement('tbody');
  for(const row of sourceRows){
    const tr=document.createElement('tr');
    for(const cell of Array.from(row.cells)){
      const td=document.createElement('td');
      renderPrintCell(cell,td);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
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
