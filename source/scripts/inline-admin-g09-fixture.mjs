/** G09 browser mechanics fixture. Fake records / fake writer. NEVER imports Firebase. */
export const FIXTURE_VERSION = 'G09-20261118-v1';
export const FIXTURE_HTML = String.raw`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>G09 isolated QA fixture — NOT THE PRODUCT</title>
<style>
*{box-sizing:border-box}body{font:15px system-ui,Arial,sans-serif;margin:0;padding:18px;max-width:100vw;color:#1c2931}
header{display:flex;align-items:center;flex-wrap:wrap;gap:12px}.role{color:#315b74}
button,input{font:inherit}button{padding:5px 9px;cursor:pointer}button:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:3px solid #076fb7;outline-offset:2px}
#editor[hidden],#rename-wrap[hidden],#modal[hidden],#dropdown[hidden]{display:none!important}
#editor{border:1px solid #c6dce1;padding:10px;margin:12px 0}#editor button{margin-right:8px}
#scroll{overflow-x:auto;width:100%;border:1px solid #bbc4ce;margin-top:12px}
table{border-collapse:collapse;table-layout:fixed;min-width:100%}th,td{border:1px solid #ccd6df;padding:6px 7px;vertical-align:top;overflow-wrap:anywhere}th{background:#e5f3f6;position:relative}
th .drag{cursor:grab;border:none;background:transparent;padding:0 6px;font-weight:bold}
th .resize{position:absolute;right:-4px;top:0;bottom:0;width:8px;padding:0;background:transparent;border:0;cursor:col-resize;touch-action:none;z-index:3}
#modal{position:fixed;inset:0;background:#151d2766;display:grid;place-items:center;z-index:5}
#dialog{width:min(var(--popup-width,400px),calc(100vw - 18px));background:white;padding:12px;max-height:85vh;overflow:auto;box-shadow:0 0 0 2px #91a6bc}
#dropdown{position:fixed;right:12px;top:52px;background:white;border:1px solid #8290a5;z-index:7;max-width:calc(100vw - 24px);padding:12px}
#status{display:inline-block;background:var(--status-bg,#ddeedd);color:#20513c;border-radius:6px;padding:4px}
@media(prefers-reduced-motion:reduce){*{transition-duration:0s!important;animation-duration:0.001ms!important}}
@media print{#editor,#edit-layout,#dropdown,#modal{display:none!important}body{padding:0}#scroll{overflow:visible}table{width:100%!important;font-size:9pt}}
</style></head><body>
<header><h1 id="list-title"></h1><strong id="role-tag" class="role"></strong><button id="edit-layout" type="button">Chỉnh giao diện</button></header>
<p>G09: dữ liệu giả lập cách ly; KHÔNG phải giao diện WebApp sản phẩm.</p>
<section id="editor" aria-label="Công cụ chỉnh bố cục" hidden>
 <button id="rename" type="button">Đổi tên bảng</button><span id="rename-wrap" hidden><input id="rename-input" aria-label="Tên bảng" maxlength="60"><button id="rename-save">Lưu tên</button></span>
 <button id="toggle-note" type="button">Ẩn/hiện cột Ghi chú</button><button id="set-status" type="button">Màu trạng thái</button>
 <button id="open-dropdown" type="button">Danh mục</button>
</section>
<label for="search">Tìm kiếm không dấu</label> <input id="search" aria-label="Tìm nội dung">
<p><span id="status">Sở chưa trình</span> · <span id="count" aria-live="polite"></span> · <button id="drilldown">Xem chi tiết báo cáo</button></p>
<div id="scroll" tabindex="0" aria-label="Cuộn ngang bảng Danh sách"><table id="list" aria-label="Danh sách thử nghiệm"><thead><tr id="head"></tr></thead><tbody id="body"></tbody></table></div>
<aside id="dropdown" aria-label="Danh mục cột" hidden><button id="close-dropdown">Đóng</button><p>Danh mục thử nghiệm</p></aside>
<div id="modal" hidden><section id="dialog" role="dialog" aria-modal="true" aria-label="Chi tiết thử nghiệm"><button id="close-modal">Đóng</button><h2>Chi tiết báo cáo</h2><p id="report-count"></p><label for="popup-width">Độ rộng popup</label><input id="popup-width" type="range" min="320" max="700" value="400"><div id="popup-rows"></div></section></div>
<script>
(()=>{
 'use strict';
 const role=new URLSearchParams(location.search).get('role')||'guest';
 const rows=[{id:'A',content:'Hồ sơ Phòng Nội vụ',department:'Sở Nội vụ',note:'Đã trình'},
 {id:'B',content:'Đề án Giáo dục',department:'Sở Giáo dục',note:'Chưa trình'},
 {id:'C',content:'Phòng Tài chính',department:'Sở Tài chính',note:'Hoàn thành'},
 {id:'D',content:'Thông báo',department:'Văn phòng',note:'Đang xử lý'}];
 const seed={revision:0,title:'Danh sách các ND trình HĐND',statusColor:'#ddeedd',popupWidth:400,
  columns:[{key:'content',label:'Nội dung',width:440,visible:true},{key:'department',label:'Cơ quan',width:420,visible:true},
   {key:'note',label:'Ghi chú',width:340,visible:true}]};
 const key='g09:shared-layout';let layout=JSON.parse(localStorage.getItem(key)||'null')||structuredClone(seed);
 let preview=false,editing=false,search='',layoutWrites=Number(localStorage.getItem('g09:layout-writes')||'0'),dataWrites=0;
 const bc=new BroadcastChannel('g09:layout');
 const el=id=>document.getElementById(id);const clone=()=>structuredClone(layout);
 const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().trim();
 function commit(mutator){if(role!=='admin')return false;const before=JSON.stringify(layout);mutator(layout);
  if(JSON.stringify(layout)===before)return false;
  layout.revision++;layoutWrites++;localStorage.setItem(key,JSON.stringify(layout));
  localStorage.setItem('g09:layout-writes',String(layoutWrites));bc.postMessage(clone());render();return true;
 }
 function shown(){return rows.filter(row=>normalized(Object.values(row).join(' ')).includes(normalized(search)));}
 function render(){el('list-title').textContent=layout.title;el('role-tag').textContent='role='+role;
   el('edit-layout').hidden=role!=='admin';el('editor').hidden=!editing||role!=='admin';
   el('status').style.setProperty('--status-bg',layout.statusColor);
   el('count').textContent=shown().length+' / '+rows.length+' hồ sơ';
   el('drilldown').textContent='Xem chi tiết ('+shown().length+')';
   const cols=layout.columns.filter(c=>c.visible),head=el('head'),body=el('body');
   head.replaceChildren();body.replaceChildren();el('list').style.width=cols.reduce((n,c)=>n+c.width,0)+'px';
   for(const col of cols){const th=document.createElement('th');th.dataset.col=col.key;th.style.width=col.width+'px';
    th.tabIndex=0;th.setAttribute('aria-label',col.label);
    const drag=document.createElement('button');drag.className='drag';drag.textContent=col.label;
    drag.setAttribute('aria-label','Kéo đổi thứ tự '+col.label);drag.onkeydown=e=>{
      if(!e.altKey||!['ArrowLeft','ArrowRight'].includes(e.key)||role!=='admin')return;e.preventDefault();
      const current=layout.columns.findIndex(c=>c.key===col.key);const next=current+(e.key==='ArrowLeft'?-1:1);
      commit(l=>{if(next>=0&&next<l.columns.length){const moved=l.columns.splice(current,1)[0];l.columns.splice(next,0,moved)}});
    };
    let start=null;drag.onpointerdown=e=>{if(role!=='admin')return;start={x:e.clientX,key:col.key};drag.setPointerCapture(e.pointerId);};
    drag.onpointerup=e=>{if(!start||role!=='admin')return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('th[data-col]');
      const to=target?.dataset.col;const from=start.key;start=null;if(!to||to===from)return;
      commit(l=>{const i=l.columns.findIndex(c=>c.key===from),j=l.columns.findIndex(c=>c.key===to);
        const moved=l.columns.splice(i,1)[0];l.columns.splice(j,0,moved);});};
    th.append(drag);if(role==='admin'&&editing){const handle=document.createElement('button');handle.className='resize';
      handle.setAttribute('aria-label','Kéo ranh giới '+col.label);handle.setAttribute('role','separator');
      handle.setAttribute('aria-orientation','vertical');handle.tabIndex=0;
      let w=col.width;let x=0;let session=false;
      handle.onpointerdown=e=>{session=true;w=col.width;x=e.clientX;handle.setPointerCapture(e.pointerId);e.preventDefault()};
      handle.onpointermove=e=>{if(!session)return;th.style.width=Math.max(80,Math.min(600,w+e.clientX-x))+'px';};
      handle.onpointerup=e=>{if(!session)return;session=false;const desired=Math.round(Math.max(80,Math.min(600,w+e.clientX-x)));
        commit(l=>{l.columns.find(c=>c.key===col.key).width=desired});};
      handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();
        commit(l=>{const c=l.columns.find(c=>c.key===col.key);c.width=Math.max(80,Math.min(600,c.width+(e.key==='ArrowLeft'?-10:10)))})};
      th.append(handle);}
    head.append(th);}
   for(const row of shown()){const tr=document.createElement('tr');tr.dataset.recordId=row.id;
     for(const c of cols){const td=document.createElement('td');td.dataset.col=c.key;td.style.width=c.width+'px';td.textContent=row[c.key];tr.append(td)}body.append(tr)}
   el('dialog').style.setProperty('--popup-width',layout.popupWidth+'px');el('popup-width').value=String(layout.popupWidth);
 }
 el('edit-layout').onclick=()=>{if(role==='admin'){editing=!editing;render()}};
 el('rename').onclick=()=>{el('rename-wrap').hidden=false;el('rename-input').value=layout.title;el('rename-input').focus()};
 function saveName(){const v=el('rename-input').value.trim();if(!v)return;commit(l=>{l.title=v.slice(0,60)});el('rename-wrap').hidden=true;}
 el('rename-save').onclick=saveName;el('rename-input').onkeydown=e=>{if(e.key==='Enter')saveName();if(e.key==='Escape')el('rename-wrap').hidden=true};
 el('toggle-note').onclick=()=>commit(l=>{const c=l.columns.find(c=>c.key==='note');c.visible=!c.visible});
 el('set-status').onclick=()=>{if(role!=='admin')return;const next=localStorage.getItem('g09:personal-palette:'+role)==='#ffd7d7'?'#ddeedd':'#ffd7d7';localStorage.setItem('g09:personal-palette:'+role,next);el('status').style.setProperty('--status-bg',next)};
 el('search').oninput=e=>{search=e.currentTarget.value;render()};
 el('open-dropdown').onclick=()=>{el('dropdown').hidden=false;el('close-dropdown').focus()};
 el('close-dropdown').onclick=()=>{el('dropdown').hidden=true;el('open-dropdown').focus()};
 el('dropdown').onkeydown=e=>{if(e.key==='Escape'){el('dropdown').hidden=true;el('open-dropdown').focus()}};
 el('drilldown').onclick=()=>{el('popup-rows').replaceChildren();for(const row of shown()){
  const p=document.createElement('p');p.className='popup-row';p.textContent=row.id+' · '+row.content;el('popup-rows').append(p)}
  el('report-count').textContent=shown().length+' hồ sơ';el('modal').hidden=false;};
 el('close-modal').onclick=()=>{el('modal').hidden=true};
 el('popup-width').oninput=e=>{el('dialog').style.setProperty('--popup-width',e.currentTarget.value+'px')};
 el('popup-width').onchange=e=>{if(role==='admin')commit(l=>{l.popupWidth=Number(e.currentTarget.value)})};
 bc.onmessage=e=>{if(e.data&&e.data.revision>layout.revision){layout=e.data;render()}};
 addEventListener('storage',e=>{if(e.key===key&&e.newValue){const next=JSON.parse(e.newValue);if(next.revision>layout.revision){layout=next;render()}}});
 window.__g09={snapshot:()=>({role,layout:clone(),count:shown().length,sourceCount:rows.length,
  layoutWrites:Number(localStorage.getItem('g09:layout-writes')||'0'),dataWrites,editing,drawerOpen:!el('dropdown').hidden,
  localOnly:!!localStorage.getItem('g09:personal-palette:'+role)}),attemptUnauthorized:()=>commit(l=>{l.title='FORGED'}),
  personalPreference:()=>localStorage.setItem('g09:personal-palette:'+role,'my-local-theme')};
 render();
})();
</script></body></html>`;