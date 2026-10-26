/** QA-only standalone mount of the REAL ItemList component, synthetic data.
 * Never included in production Pages or executed against Firebase.
 */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createDemoItems} from '../data/demo-items';
import {catalogFromItems} from '../data/catalogs';
import {defaultItemLayout,type ItemLayout,validateItemLayout} from '../data/item-preferences';
import {ItemList} from '../features/items/ItemList';
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
  const [layout,setLayout]=useState<ItemLayout>(initial);
  const [records,setRecords]=useState(items);
  const editing=new URLSearchParams(window.location.search).get('edit')==='1';
  return <div className="app-shell imperial-sky-theme" data-qa="compact-real-itemlist">
    <header className="topbar compact-topbar" style={{padding:'12px 18px'}}>
      <h1 style={{fontSize:20,margin:0}}>HopHDND · Gộp cột (bản kiểm thử UI)</h1>
      <p className="muted" style={{margin:'4px 0 0'}}>Dữ liệu mô phỏng · không đăng nhập, không lưu Firebase</p>
    </header>
    <main style={{maxWidth:1440,margin:'0 auto',padding:'14px'}}>
      <ItemList
        items={records} drafts={{}} errors={{}} busy={false}
        sourceKind="demo" sourceKey="compact-qa-synthetic-only"
        catalog={catalog}
        readOnly={!editing} canEditDraft={editing} canEditCell={editing?()=>true:undefined}
        customizing={false} anonymousViewer={false}
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
        onPersistViewerLayout={async(next)=>{
          const validated=validateItemLayout(next);
          setLayout(validated);return validated;
        }}
      />
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<CompactVisualQa/>);
