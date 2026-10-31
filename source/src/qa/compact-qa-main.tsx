/** QA-only standalone mount of the REAL ItemList component, synthetic data.
 * Never included in production Pages or executed against Firebase.
 */
import {useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {createDemoItems} from '../data/demo-items';
import {catalogFromItems} from '../data/catalogs';
import {defaultItemLayout,type ItemLayout,validateItemLayout} from '../data/item-preferences';
import {ItemList} from '../features/items/ItemList';
import {ReportDetailGrid} from '../features/reports/ReportDetailGrid';
import {defaultStatusPaletteStore,statusPaletteCssVariables} from '../data/status-palettes';
import '../styles/app.css';
import {Pr95FullPreview} from './pr95-full-preview';

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
  const adminLayoutQa=params.get('layout-admin')==='1';
  const [layout,setLayout]=useState<ItemLayout>(()=>{
    if(adminLayoutQa||params.get('use-saved-layout')==='1'){
      try{
        const saved=localStorage.getItem('hdnd.qa.group-labels-synthetic');
        if(saved)return validateItemLayout(JSON.parse(saved));
      }catch{/* Invalid synthetic data is ignored without touching Firebase. */}
    }
    const base={...initial,columns:initial.columns.map(c=>({...c}))};
    if(params.get('highlight')==='1')base.cellHighlights=[
      {id:'qa-department',field:'department',word:'Sở mẫu A',textColor:'#FFFFFF',backgroundColor:'#CC0000'},
      {id:'qa-status',field:'progressBuild',word:'Sở chưa trình',textColor:'#000000',backgroundColor:'#FFEE55'},
      {id:'qa-wildcard',field:'*',word:'Ban Chấp hành',textColor:'#FFFFFF',backgroundColor:'#123456'}
    ];
    if(params.get('group-title')==='1')base.groupLabels={
      contentDetails:'Hồ sơ tùy chỉnh',partyTogether:'Ba khâu tùy chỉnh',
      teamTogether:'Nhóm phụ trách tùy chỉnh',leadersTogether:'Hai lãnh đạo tùy chỉnh',
      roomSpecialist:'Phòng và CV tùy chỉnh'
    };
        if(params.get('custom-id')==='1')base.columns=base.columns.map(c=>c.key==='displayCode'?{...c,width:125}:c);
    // Codex 008: valid source width near/over (1600 - 130) grouped cap.
    const cappedParty=Number(params.get('cap-party'));
    if([1470,1550,1600].includes(cappedParty))base.columns=base.columns.map(c=>
      c.key==='partyLevel'?{...c,width:cappedParty}:c);
    // Owner L019: exact reported neighbor order (progress then staff group).
    if(params.get('progress-before-staff')==='1'){
      const progress=base.columns.find(c=>c.key==='specificProgress')!;
      const others=base.columns.filter(c=>c.key!=='specificProgress');
      others.splice(others.findIndex(c=>c.key==='room'),0,progress);
      base.columns=others;
    }
    if(params.get('hide-dept')==='1')base.columns=base.columns.map(c=>c.key==='department'?{...c,visible:false}:c);
    if(params.get('fit')==='1'){
      // Reproduce the owner's small saved widths inside a wide selected frame.
      const widths:Record<string,number>={displayCode:60,content:170,partyLevel:60,
        specificProgress:150,room:230,note:60};
      base.columns=base.columns.map(c=>({...c,width:widths[c.key]??c.width,
        visible:c.key==='stt'?false:c.visible}));
      if(params.get('frame')==='900')base.frameWidth=900;
    }
    return base;
  });
  const [records,setRecords]=useState(()=>{
    const staff=params.get('review-staff')==='1'?
      items.map((item,index)=>index===0?{...item,
        vpLeader:'PCVP Trần Văn B',ubndLeader:'PCT Nguyễn Văn C'}:item):items;
    if(params.get('r05')!=='1')return staff;
    // Synthetic only: red / amber / green in one record, neutral and
    // unknown in a second. The third includes an R03 source-specific rule.
    return staff.map((item,index)=>index===0?{...item,
      progressParty:'Sở chưa trình',progressBuild:'VP đang thực hiện',
      progressCouncil:'Đã trình HĐND'}:index===1?{...item,
      progressParty:'Không phải xin ý kiến',progressBuild:'Không phải trình',
      progressCouncil:'Đã trình HĐND'}:index===2?{...item,
      progressParty:'Đang rà soát',progressBuild:'Sở chưa trình'}:item);
  });
  const editing=params.get('edit')==='1';
  // R-V3-01: optional-assignment clear proof in the real List/popup, RAM only.
  const clearQa=params.get('clear-qa')==='1';
  const popupClearQa=params.get('popup-clear-qa')==='1';
  const guest=params.get('guest')==='1';
  const palette=defaultStatusPaletteStore();
  if(params.get('r05-palette')==='1')palette.active.office={
    text:'#884422',background:'#FCDDA0'};
  return <div className={'app-shell imperial-sky-theme'+
    (params.get('app-shell')==='1'?' wide-table-page list-fit-page':'')}
    data-qa="compact-real-itemlist"
    style={statusPaletteCssVariables(palette.active) as CSSProperties}>
    <header className="topbar compact-topbar" style={{padding:'12px 18px'}}>
      <h1 style={{fontSize:20,margin:0}}>HopHDND · Danh sách nội dung trình HĐND</h1>
      <p className="muted" style={{margin:'4px 0 0'}}>Bản xem thử · Dữ liệu giả — không đăng nhập, không kết nối Firebase/Google Sheets</p>
    </header>
    <main style={{maxWidth:1440,margin:'0 auto',padding:'14px'}}>
      {params.get('popup')==='1'?<ReportDetailGrid
        title="QA popup dữ liệu giả" selectedIds={records.map(item=>item.recordId)}
        items={records} sourceKey="compact-qa-synthetic-popup-only"
        catalog={catalog} listLayout={layout} readOnlyViewer={!popupClearQa&&params.get('popup-settings')!=='1'}
        statusPaletteStore={palette}
        allowDraft={popupClearQa} canEditCell={(_id,field)=>popupClearQa&&(field==='vpLeader'||field==='ubndLeader')}
        onUpdate={(recordId,changes)=>{
          if(!popupClearQa)throw Error('QA read-only');
          Object.assign(window,{__l2LastPatch:{recordId,changes}});
          setRecords(previous=>previous.map(item=>item.recordId===recordId?{...item,...changes}:item));
        }}
        onKeepDraft={()=>false} dirtyIds={new Set()} errors={{}} onClose={()=>{}}
      />:<ItemList
        items={records} drafts={{}} errors={{}} busy={false}
        sourceKind="demo" sourceKey="compact-qa-synthetic-only"
        catalog={catalog}
        readOnly={!editing} canEditDraft={editing}
        canEditCell={editing?(_id,field)=>!clearQa||field==='vpLeader'||field==='ubndLeader':undefined}
        customizing={adminLayoutQa} anonymousViewer={guest} viewerScope={guest?'synthetic-guest':'synthetic-admin'} allowPersonalCompact={guest}
        initialLayout={layout} statusPaletteStore={palette}
        onUpdate={(recordId,changes)=>{
          if(!editing)throw Error('QA READ-ONLY');
          // In-memory edit proof, never any Firebase/database write.
          if(clearQa)Object.assign(window,{__l2LastPatch:{recordId,changes}});
          setRecords(prev=>prev.map(item=>item.recordId===recordId?{...item,...changes}:item));
        }}
        onHistory={()=>{}} onClose={()=>{}}
        onSaveData={async()=>false}
        onDiscardData={()=>{}}
        onLayoutSaved={()=>{}}
        onPersistLayout={adminLayoutQa?async next=>{
          const valid=validateItemLayout(next);
          localStorage.setItem('hdnd.qa.group-labels-synthetic',JSON.stringify(valid));
          setLayout(valid);return valid;
        }:undefined}
        onPersistViewerLayout={guest?undefined:async(next)=>{
          const validated=validateItemLayout(next);
          setLayout(validated);return validated;
        }}
      />}
    </main>
  </div>;
}

// Preserve old QA URL fixtures unmodified. The unqualified /compact-qa.html
// now exposes the complete two-tab, six-section V2 preview by default.
const query=new URLSearchParams(window.location.search);
const classicOnly=['layout-admin','use-saved-layout','highlight','group-title',
  'custom-id','cap-party','progress-before-staff','hide-dept','fit','frame',
  'review-staff','r05','edit','guest','r05-palette','app-shell','popup','popup-settings',
  'clear-qa','popup-clear-qa'];
// The pre-existing source smoke hosts this fixture under /compact-qa/ and
// checks the original read-only 8-row component. Do not change L1's runner or
// undermine that regression suite. Public /preview/pr95/ and the root QA entry
// continue to show the full V2 preview; ?full=1 always opts into it.
const legacy=query.get('full')!=='1'&&(
  query.get('legacy')==='1'||window.location.pathname.includes('/compact-qa/')||
  classicOnly.some(key=>query.has(key)));
createRoot(document.getElementById('root')!).render(legacy?<CompactVisualQa/>:<Pr95FullPreview/>);
