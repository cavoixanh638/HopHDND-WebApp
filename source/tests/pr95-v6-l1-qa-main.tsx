/** UI V6 L1 — mounted REAL ItemList/ReportDetailGrid, never production data.
 * Four type cases and three party levels; readonly, field grants, full admin.
 */
import {useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultStatusPaletteStore,statusPaletteCssVariables} from '../src/data/status-palettes';
import {ItemList} from '../src/features/items/ItemList';
import {ReportDetailGrid} from '../src/features/reports/ReportDetailGrid';
import type {TextField} from '../shared/types';
import '../src/styles/app.css';

const params=new URLSearchParams(window.location.search);
const view=params.get('view')==='popup'?'popup':'list';
const role=params.get('role')??'admin';
const split=params.get('split')==='1';
const highlight=params.get('highlight')==='1';
const original=createDemoItems(8).map((item,index)=>({
  ...item,
  type:['QPPL','HC','Báo cáo','Loại VB legacy không thuộc danh mục'][index%4],
  partyLevel:['BCH','BTV TU','TTTU','Ban Chấp hành Thành ủy'][index%4],
  progressParty:'Sở chưa trình',
  department:'Sở mẫu '+['A','B','C','D'][index%4]
}));
const catalog=catalogFromItems(original);
const layout=defaultItemLayout();
layout.compactDisplay={...layout.compactDisplay!,contentDetails:!split,partyTogether:!split,
  councilTogether:true,teamTogether:true,shortLeaders:true,shortSpecialist:true};
layout.tableWidth=2100;
if(highlight)layout.cellHighlights=[{id:'v6type',field:'type',word:'QPPL',
  textColor:'#FFFFFF',backgroundColor:'#663399'}];
const palette=defaultStatusPaletteStore();
const patches:{id:string;changes:object}[]=[];
const writable=(id:string,field:TextField)=>role==='admin'||
  role==='mixed'&&(
    (id===original[0].recordId&&field==='type')||
    (id===original[1].recordId&&field==='partyLevel')
  );
function App(){
  const [items,setItems]=useState(original);
  const [revision,setRevision]=useState(0);
  const update=(id:string,changes:object)=>{
    patches.push({id,changes});setRevision(n=>n+1);
    setItems(previous=>previous.map(item=>item.recordId===id?{...item,...changes}:item));
  };
  Object.assign(window,{__v6L1:{
    snapshot:()=>({view,role,split,revision,patches:[...patches],
      raw:items.map(x=>({id:x.recordId,type:x.type,partyLevel:x.partyLevel,
        progressParty:x.progressParty,progressBuild:x.progressBuild}))})
  }});
  return <div className="app-shell imperial-sky-theme wide-table-page list-fit-page"
    data-qa="pr95-v6-l1" data-role={role} data-view={view}
    style={statusPaletteCssVariables(palette.active) as CSSProperties}>
    <main style={{maxWidth:1440,padding:16,margin:'auto'}}>
    {view==='list'?<ItemList items={items} drafts={{}} errors={{}} busy={false}
      sourceKind="demo" sourceKey="pr95-v6-l1-synthetic"
      catalog={catalog} initialLayout={layout}
      readOnly={role==='readonly'} canEditDraft={role!=='readonly'}
      canEditCell={writable} anonymousViewer={role==='mixed'}
      viewerScope="v6-l1-qa-only" allowPersonalCompact={false}
      statusPaletteStore={palette}
      onUpdate={update} onHistory={()=>{}} onClose={()=>{}}
      onSaveData={async()=>false} onDiscardData={()=>{}} onLayoutSaved={()=>{}}
    />:<ReportDetailGrid title="V6 L1 · Popup synthetic QA" selectedIds={items.map(x=>x.recordId)}
      items={items} sourceKey="pr95-v6-l1-popup-only"
      catalog={catalog} listLayout={layout} statusPaletteStore={palette}
      allowDraft={role!=='readonly'} readOnlyViewer={role==='readonly'}
      canEditCell={writable} onUpdate={update}
      onKeepDraft={()=>false} dirtyIds={new Set()} errors={{}} onClose={()=>{}}/>}
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
