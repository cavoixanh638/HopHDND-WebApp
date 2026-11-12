/**
 * STAGES F02 review fixture. Imports REAL application source components
 * unchanged. This harness is copied unchanged into an e095205c worktree for
 * before/after Chromium. Never touches production Firebase/Sheets.
 */
import {useEffect,useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultDetailGridPreferences,saveDetailGridPreferences} from '../src/data/report-detail-preferences';
import {ItemList} from '../src/features/items/ItemList';
import {ReportDetailGrid} from '../src/features/reports/ReportDetailGrid';
import {defaultStatusPaletteStore,statusPaletteCssVariables} from '../src/data/status-palettes';
import type {TextField} from '../shared/types';
import '../src/styles/app.css';

const q=new URLSearchParams(window.location.search);
const surface=q.get('surface')==='popup'?'popup':'list';
const scenario=q.get('scenario')??'comparison';
const mode=q.get('mode')??'all';
const palette=defaultStatusPaletteStore();
const highlight=scenario==='palette'&&q.get('highlight')==='1';
const usePalette=scenario==='palette';
if(usePalette){
 palette.active={
  'not-submitted':{background:'#C4E4FF',text:'#154E85'},
  office:{background:'#FDE6B7',text:'#8A4512'},
  done:{background:'#C5F4DA',text:'#155E3B'},
  other:{background:'#E6DBFD',text:'#532A87'},
  otherEnabled:true,
 };
}
const initial=defaultItemLayout();
initial.tableWidth=2400;
initial.compactDisplay={...initial.compactDisplay!,
  contentDetails:true,partyTogether:true,councilTogether:true,
  teamTogether:true,shortLeaders:false,shortSpecialist:false};
if(highlight)initial.cellHighlights=[
 {id:'stages-review-purple',field:'progressBuild',word:'VP đang xử lý',
  textColor:'#5B187B',backgroundColor:'#F2D1FC'},
 {id:'stages-review-teal',field:'progressCouncil',word:'Hoàn thành',
  textColor:'#004B50',backgroundColor:'#B8F1F2'}
];
const seed=createDemoItems(8).map((item,index)=>{
 if(index===0)return {...item,
  type:'QPPL',documentKind:'NQ' as const,isDropped:false,
  partyLevel:scenario==='not-required'?'Không':'BTV',
  // Deliberately retain the raw value under Không: UI projection must be inert.
  progressParty:'Sở chưa trình',
  progressBuild:'VP đang xử lý',progressCouncil:'Hoàn thành',
  ubndLeader:'Phó Chủ tịch Nguyễn Văn Minh',
  vpLeader:'Phó Chánh Văn phòng Trần Văn Hoàng',
  room:'Phòng Kinh tế Tổng hợp',specialist:'Chuyên viên Lê Thu Hà'
 };
 if(index===1)return {...item,
  type:'QPPL',documentKind:'NQ' as const,isDropped:false,
  partyLevel:'TTTU',progressParty:'VP đang xử lý',
  progressBuild:'VP đang xử lý',progressCouncil:'Hoàn thành'};
 return item;
});
const catalog=catalogFromItems(seed);
const source='stages-review-ram-'+surface+'-'+scenario+'-'+mode+'-'+(highlight?'highlight':'plain');
function App(){
 const [rows,setRows]=useState(seed);
 const [ready,setReady]=useState(surface==='list');
 const [patch,setPatch]=useState('');
 const granted=(id:string,field:string)=>{
  if(mode==='guest')return false;
  if(mode==='party-grant')return id===seed[0].recordId&&
    ['progressParty','progressBuild','progressCouncil'].includes(field);
  if(mode==='mixed')return id===seed[0].recordId
    ?['partyLevel','progressParty','progressBuild'].includes(field)
    :id===seed[1].recordId&&field==='progressCouncil';
  return true;
 };
 useEffect(()=>{
  if(surface!=='popup')return;
  const pref=defaultDetailGridPreferences();
  pref.columns=pref.columns.map(c=>({...c,
   visible:c.visible||['partyLevel','progressParty','progressBuild','progressCouncil',
    'ubndLeader','vpLeader','room','specialist'].includes(c.key)}));
  if(!saveDetailGridPreferences(source,pref))
   throw Error('STAGES fixture popup preference unavailable');
  setReady(true);
 },[]);
 const update=(id:string,changes:Record<string,unknown>)=>{
  for(const field of Object.keys(changes))
   if(!granted(id,field))throw Error('STAGES fixture unauthorized write '+id+'/'+field);
  setRows(old=>old.map(row=>row.recordId===id?{...row,...changes}:row));
  setPatch(JSON.stringify({id,changes}));
 };
 if(!ready)return <p data-qa="stages-preparing">Preparing RAM-only popup</p>;
 return <div className="app-shell imperial-sky-theme" data-qa="picker-parity-stages-fixture"
  data-surface={surface} data-mode={mode} data-scenario={scenario}
  style={statusPaletteCssVariables(palette.active) as CSSProperties}>
  <p data-qa="fixture-banner">STAGES review · synthetic local RAM · {surface} · {scenario} · {mode}</p>
  {surface==='popup'?<ReportDetailGrid
    title="STAGES F02 RAM-only popup" selectedIds={rows.map(x=>x.recordId)}
    items={rows} sourceKey={source} catalog={catalog} listLayout={initial}
    readOnlyViewer={mode==='guest'} allowDraft={mode!=='guest'}
    canEditCell={(id,field)=>granted(id,field)} onUpdate={update}
    onKeepDraft={()=>false} dirtyIds={new Set()} errors={{}} onClose={()=>{}}
    statusPaletteStore={palette}
  />:<ItemList
    items={rows} drafts={{}} errors={{}} busy={false}
    sourceKind="demo" sourceKey={source} catalog={catalog}
    readOnly={mode==='guest'} canEditDraft={mode!=='guest'}
    canEditCell={(id,field)=>granted(id,field)} onUpdate={update}
    initialLayout={initial} statusPaletteStore={palette}
    onHistory={()=>{}} onClose={()=>{}} onSaveData={async()=>false}
    onDiscardData={()=>{}} onLayoutSaved={()=>{}}
  />}
  <output data-qa="last-patch" hidden>{patch}</output>
  <output data-qa="raw-first-record" hidden>{JSON.stringify({
   partyLevel:rows[0].partyLevel,progressParty:rows[0].progressParty,
   progressBuild:rows[0].progressBuild,progressCouncil:rows[0].progressCouncil
  })}</output>
  <output data-qa="declared-grants" hidden>{JSON.stringify(
    (['partyLevel','progressParty','progressBuild','progressCouncil'] as TextField[])
     .map(field=>[field,granted(seed[0].recordId,field)]))}</output>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
