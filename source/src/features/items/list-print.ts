/** Builds a clean A4 landscape sheet from the currently rendered List table.
 * No summary, filter bar, date, pagination label or added business content.
 * Native browser Save as PDF handles Unicode fonts and page breaking.
 */
export const LIST_A4_PRINT_CSS=`
@page{size:A4 landscape;margin:8mm}
@media screen{#hdnd-a4-print-root{display:none!important}}
@media print{
  body[data-hdnd-a4-print="true"]>*:not(#hdnd-a4-print-root){display:none!important}
  body[data-hdnd-a4-print="true"]{margin:0!important;background:#fff!important}
  #hdnd-a4-print-root{display:block!important;position:static!important;
    margin:0!important;padding:0!important;background:#fff!important;color:#111!important;
    font-family:Arial,"Times New Roman",sans-serif!important}
  #hdnd-a4-print-root h1{font-size:14pt;font-weight:700;text-align:center;
    margin:0 0 4mm;padding:0;line-height:1.25}
  #hdnd-a4-print-root table{border-collapse:collapse;border-spacing:0;width:100%;
    table-layout:fixed;font-size:8.25pt;line-height:1.35;color:#111}
  #hdnd-a4-print-root thead{display:table-header-group}
  #hdnd-a4-print-root tr{break-inside:avoid;page-break-inside:avoid}
  #hdnd-a4-print-root th,#hdnd-a4-print-root td{
    border:.4pt solid #8b939b;vertical-align:middle;padding:2.5mm 1.6mm;
    text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;
    background:#fff!important;color:#111!important}
  #hdnd-a4-print-root th{font-weight:700;text-align:center;background:#f1f3f5!important}
  #hdnd-a4-print-root td:first-child{text-align:center;font-weight:600}
}`;
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
  const total=sizes.reduce((n,size)=>n+size,0)||headers.length;
  for(let i=0;i<headers.length;i++){
    const col=document.createElement('col');
    col.style.width=(100*(sizes[i]??1)/total).toFixed(3)+'%';
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
      const snapshot=cell.cloneNode(true) as HTMLElement;
      snapshot.querySelectorAll(
        '.cell-history-action,.column-resize-handle,[data-print-exclude],.shared-edit-tooltip,button[title*="Lịch sử"]'
      ).forEach(el=>el.remove());
      td.textContent=(snapshot.innerText||snapshot.textContent||'').trim()
        .replace(/\n{3,}/g,'\n\n');
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
