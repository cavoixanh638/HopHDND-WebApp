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
    color:#27313a;
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
    background:#fff!important;color:#18222c!important;
    font-family:Arial,"Segoe UI",sans-serif!important;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  #hdnd-a4-print-root h1{
    font-size:14pt;font-weight:700;text-align:center;
    margin:0 0 4mm;padding:0;line-height:1.25;
  }
  #hdnd-a4-print-root table{
    border-collapse:collapse;border-spacing:0;width:100%;table-layout:fixed;
    font-size:8.15pt;line-height:1.3;color:#18222c;
  }
  #hdnd-a4-print-root thead{display:table-header-group}
  #hdnd-a4-print-root tr{break-inside:avoid;page-break-inside:avoid}
  #hdnd-a4-print-root th,#hdnd-a4-print-root td{
    border:.4pt solid #98a3ad;vertical-align:middle;padding:2mm 1.3mm;
    text-align:left;white-space:normal;overflow-wrap:break-word;word-break:normal;
    background:#fff;color:#18222c;
  }
  #hdnd-a4-print-root th{
    font-weight:700;text-align:center;background:#eef2f5!important;
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
    font-weight:650;line-height:1.36;white-space:pre-line;
  }
  #hdnd-a4-print-root .hdnd-print-document-meta{
    margin-top:1mm;color:#536877;line-height:1.26;
  }
  /* Mirror the three L03 rails as explicit label/status pairs, never a
     flattened concatenation. Entire stage rows are kept together. */
  #hdnd-a4-print-root .hdnd-print-stage-row{
    display:grid;grid-template-columns:minmax(0,45%) minmax(0,55%);
    align-items:center;gap:1.4mm;margin:1mm 0;
    break-inside:avoid;page-break-inside:avoid;
  }
  #hdnd-a4-print-root .hdnd-print-stage-label{
    font-size:7.7pt;font-weight:650;line-height:1.26;
    overflow-wrap:break-word;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state{
    display:block;min-width:0;padding:1.25mm 1mm;border-radius:1.2mm;
    text-align:center;font-weight:600;font-size:7.7pt;line-height:1.25;
    background:#e8eef4;color:#304a60;overflow-wrap:break-word;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="not-submitted"]{
    background:#fae3e9;color:#9e3045;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="processing"]{
    background:#ffecd7;color:#8c5615;
  }
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="completed"],
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="complete"],
  #hdnd-a4-print-root .hdnd-print-stage-state[data-tone="approved"]{
    background:#def2e5;color:#17683f;
  }
  /* The L04 source has 4 independent office/room/staff lines. */
  #hdnd-a4-print-root .hdnd-print-staff-row{
    display:grid;grid-template-columns:12mm minmax(0,1fr);
    align-items:center;gap:1.6mm;margin:.75mm 0;
    break-inside:avoid;page-break-inside:avoid;
  }
  #hdnd-a4-print-root .hdnd-print-staff-tag{
    background:#ebf3f0;color:#4c7465;border-radius:1mm;
    font-size:7pt;font-weight:700;text-align:center;padding:1mm .6mm;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
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
    const badge=appendPart(line,'span','hdnd-print-stage-state',displayText(status)||'—');
    const tone=status?.getAttribute('data-progress-tone')??row.getAttribute('data-progress-tone');
    if(tone)badge.dataset.tone=tone;
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
    appendPart(target,'div','hdnd-print-plain',displayText(value));
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
  const codeIndex=screenHeaders.findIndex(c=>c.getAttribute('data-col-key')==='displayCode');
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
