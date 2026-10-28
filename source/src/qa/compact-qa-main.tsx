/** QA-only standalone mount of the REAL ItemList component, synthetic data.
 * Never included in production Pages or executed against Firebase.
 */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createDemoItems} from '../data/demo-items';
import {catalogFromItems} from '../data/catalogs';
import {defaultItemLayout,type ItemLayout,validateItemLayout} from '../data/item-preferences';
import {ItemList} from '../features/items/ItemList';
import {ReportDetailGrid} from '../features/reports/ReportDetailGrid';
import '../styles/app.css';

const items=createDemoItems(8);
const initial=defaultItemLayout();
initial.compactDisplay={
  ...initial.compactDisplay!,
  contentDetails:true,partyTogether:true,councilTogether:true,teamTogether:true,
  shortLeaders:true,shortSpecialist:true,
};
initial.tableWidth=2400;
const catalog=catalogFromItems(items);

function CompactVisualQa(){
  const params=new URLSearchParams(window.location.search);
  const [layout,setLayout]=useState<ItemLayout>(()=>{
    const base={...initial,columns:initial.columns.map(c=>({...c}))};
    if(params.get('highlight')==='1')base.cellHighlights=[
      {id:'qa-department',field:'department',word:'Sở mẫu A',textColor:'#FFFFFF',backgroundColor:'#CC0000'},
      {id:'qa-status',field:'progressBuild',word:'Sở chưa trình',textColor:'#000000',backgroundColor:'#FFEE55'},
      {id:'qa-wildcard',field:'*',word:'Ban Chấp hành',textColor:'#FFFFFF',backgroundColor:'#123456'}
    ];
    if(params.get('custom-id')==='1')base.columns=base.columns.map(c=>c.key==='displayCode'?{...c,width:125}:c);
    return base;
  });
  const [records,setRecords]=useState(()=>params.get('review-staff')==='1'?
    items.map((item,index)=>index===0?{...item,
      vpLeader:'PCVP Trần Văn B',ubndLeader:'PCT Nguyễn Văn C'}:item):items);
  const editing=params.get('edit')==='1';
  const guest=params.get('guest')==='1';
  return <div className="app-shell imperial-sky-theme" data-qa="compact-real-itemlist">
    <header className="topbar compact-topbar" style={{padding:'12px 18px'}}>
      <h1 style={{fontSize:20,margin:0}}>HopHDND · Gộp cột (bản kiểm thử UI)</h1>
      <p className="muted" style={{margin:'4px 0 0'}}>Dữ liệu mô phỏng · không đăng nhập, không lưu Firebase</p>
    </header>
    <main style={{maxWidth:1440,margin:'0 auto',padding:'14px'}}>
      {params.get('popup')==='1'?<ReportDetailGrid
        title="QA popup dữ liệu giả" selectedIds={records.map(item=>item.recordId)}
        items={records} sourceKey="compact-qa-synthetic-popup-only"
        catalog={catalog} listLayout={layout} readOnlyViewer={true}
        allowDraft={false} canEditCell={()=>false} onUpdate={()=>{throw Error('QA read-only');}}
        onKeepDraft={()=>false} dirtyIds={new Set()} errors={{}} onClose={()=>{}}
      />:<ItemList
        items={records} drafts={{}} errors={{}} busy={false}
        sourceKind="demo" sourceKey="compact-qa-synthetic-only"
        catalog={catalog}
        readOnly={!editing} canEditDraft={editing} canEditCell={editing?()=>true:undefined}
        customizing={false} anonymousViewer={guest} viewerScope={guest?'synthetic-guest':'synthetic-admin'} allowPersonalCompact={guest}
        initialLayout={layout}
        onUpdate={(recordId,changes)=>{
          if(!editing)throw Error('QA READ-ONLY');
          // In-memory edit proof, never any Firebase/database write.
          setRecords(prev=>prev.map(item=>item.recordId===recordId?{...item,...changes}:item));
        }}
        onHistory={()=>{}} onClose={()=>{}}
        onSaveData={async()=>false}
        onDiscardData={()=>{}}
        onLayoutSaved={()=>{}}
        onPersistViewerLayout={guest?undefined:async(next)=>{
          const validated=validateItemLayout(next);
          setLayout(validated);return validated;
        }}
      />}
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<CompactVisualQa/>);
