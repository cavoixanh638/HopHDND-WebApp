/**
 * PICKER 06/11 independent, deterministic RAM-only fixture.
 * The same file is copied unchanged to isolated reference/baseline worktrees.
 * It mounts REAL ItemList and ReportDetailGrid, not a CSS imitation.
 */
import {useEffect,useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultDetailGridPreferences,saveDetailGridPreferences} from '../src/data/report-detail-preferences';
import {ItemList} from '../src/features/items/ItemList';
import {ReportDetailGrid} from '../src/features/reports/ReportDetailGrid';
import {CellPicker} from '../src/features/items/CellPicker';
import {defaultStatusPaletteStore,statusPaletteCssVariables} from '../src/data/status-palettes';
import '../src/styles/app.css';

const params=new URLSearchParams(window.location.search);
const isPopup=params.get('surface')==='popup';
const mode=params.get('mode')??'edit';
const longNames=params.get('long')==='1';
const edge=params.get('edge')??'kinds';
const items=createDemoItems(8).map((item,index)=>index!==0?item:{
  ...item,
  ubndLeader:'Phó Chủ tịch Nguyễn Văn Minh Thường Trực',
  vpLeader:'Phó Chánh Văn phòng Trần Văn Hoàng',
  room:'Phòng Kinh tế Tổng hợp và Đối ngoại',
  specialist:'Chuyên viên Nguyễn Thị Thu Hương'
}).map((item,index)=>{
  if(edge==='long'&&index===0)return {...item,
    department:'Sở Kế hoạch, Đầu tư, Công thương và Phát triển hạ tầng tổng hợp thành phố',
    type:'QPPL'};
  if(edge==='empty'&&index===0)return {...item,department:'',type:''};
  return {...item,type:['QPPL','HC','BC'][index%3]};
});
const palette=defaultStatusPaletteStore();
const catalog=catalogFromItems(items);
const initial=defaultItemLayout();
initial.compactDisplay={...initial.compactDisplay!,
  contentDetails:true,partyTogether:true,councilTogether:true,teamTogether:true,
  shortLeaders:!longNames,shortSpecialist:!longNames};
initial.tableWidth=2400;
const source='picker-parity-content-edge-ram-'+edge;

function App(){
 const [records,setRecords]=useState(items);
 const [ready,setReady]=useState(!isPopup);
 const [lastPatch,setLastPatch]=useState('');
 const canEdit=(id:string,field:string)=>{
   if(mode==='guest')return false;
   if(mode==='mixed')return id===items[0].recordId
     ?['ubndLeader','room','department','progressParty'].includes(field)
     :id===items[1].recordId&&['vpLeader','specialist','type','progressCouncil'].includes(field);
   return true;
 };
 useEffect(()=>{
   if(!isPopup)return;
   const pref=defaultDetailGridPreferences();
   pref.columns=pref.columns.map(column=>({
     ...column,visible:column.visible||
       ['ubndLeader','vpLeader','specialist','room','partyLevel','type'].includes(column.key)
   }));
   if(!saveDetailGridPreferences(source,pref))throw Error('RAM fixture prefs unavailable');
   setReady(true);
 },[]);
 const update=(id:string,changes:Record<string,unknown>)=>{
   const field=Object.keys(changes)[0]??'';
   if(!canEdit(id,field))throw Error('Fixture permission reject: '+field);
   setRecords(prev=>prev.map(row=>row.recordId===id?{...row,...changes}:row));
   setLastPatch(JSON.stringify({recordId:id,changes}));
 };
 if(!ready)return <p data-qa="fixture-preparing">Configuring RAM-only popup</p>;
 return <div className="app-shell imperial-sky-theme" data-qa="ui-20261106-picker-fixture"
   data-edge={edge} data-mode={mode} data-surface={isPopup?'popup':'list'}
   style={statusPaletteCssVariables(palette.active) as CSSProperties}>
   <div data-qa="picker-fixture-status" style={{fontSize:12,padding:4}}>
     Synthetic only | {isPopup?'popup':'list'} | {mode} | long={String(longNames)}
   </div>
   {isPopup?<ReportDetailGrid
      title="PICKER: popup RAM" selectedIds={records.map(row=>row.recordId)}
      items={records} sourceKey={source} catalog={catalog} listLayout={initial}
      readOnlyViewer={mode==='guest'} allowDraft={mode!=='guest'}
      canEditCell={(id,field)=>canEdit(id,field)} onUpdate={update}
      onKeepDraft={()=>false} dirtyIds={new Set()} errors={{}} onClose={()=>{}}
      statusPaletteStore={palette}
    />:<ItemList
      items={records} drafts={{}} errors={{}} busy={false}
      sourceKind="demo" sourceKey={source} catalog={catalog}
      readOnly={mode==='guest'} canEditDraft={mode!=='guest'}
      canEditCell={(id,field)=>canEdit(id,field)} onUpdate={update}
      initialLayout={initial} statusPaletteStore={palette}
      onHistory={()=>{}} onClose={()=>{}} onSaveData={async()=>false}
      onDiscardData={()=>{}} onLayoutSaved={()=>{}}
    />}
   <output data-qa="last-patch" style={{display:'none'}}>{lastPatch}</output>
   {/* Explicit disabled path: an editor remains disabled even if its parent is editable. */}
   <div data-qa="disabled-case" style={{padding:5,display:'inline-block'}}>
     <CellPicker field="specialist" label="Disabled specialist" value="Chuyên viên mẫu A"
       options={['Chuyên viên mẫu A','Chuyên viên mẫu B']} disabled onChange={()=>{throw Error('Disabled editor changed')}}/>
   </div>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
