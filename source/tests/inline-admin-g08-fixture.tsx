import {useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {createDemoItems} from '../src/data/demo-items';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import type {CompactPair} from '../src/features/items/compact-columns';
import {DEFAULT_PARTY_TRACK_WIDTHS,partyTrackPhysicalWidth,partyTrackModeWidth,
  type PartyTrackWidths} from '../src/data/item-preferences';

const pair:CompactPair={anchor:'partyLevel',hidden:'progressParty',
 hiddenFields:['progressParty','progressBuild','progressCouncil'],
 memberFields:['partyLevel','progressParty','progressBuild','progressCouncil'],
 tags:['Cấp','Thành ủy','Xây dựng NQ','Ban hành NQ'],label:'Tiến độ 3 khâu',
 extraWidth:130,variant:'partyTogether'};
const seed=createDemoItems(3);
seed[0].partyLevel='Không';
seed[0].progressParty='Sở chưa trình';
seed[0].progressBuild='VP đang xử lý';
seed[0].progressCouncil='Hoàn thành';
seed[1].partyLevel='BTV';
seed[1].progressParty='Sở chưa trình';
seed[1].progressBuild='Đang thẩm định Dự thảo Nghị quyết kỳ họp';
seed[1].progressCouncil='Đã có Nghị quyết';
seed[2].partyLevel='BCH';
seed[2].progressParty='Đã trình, chờ ý kiến';
seed[2].progressBuild='VP đang xử lý';
seed[2].progressCouncil='Sở chưa trình';

function Fixture(){
 const [widths,setWidths]=useState<PartyTrackWidths>(DEFAULT_PARTY_TRACK_WIDTHS);
 const [active,setActive]=useState(true);
 const [admin,setAdmin]=useState(true);
 const [dataEditing,setDataEditing]=useState(false);
 const [disabled,setDisabled]=useState(false);
 const [mode,setMode]=useState<'readonly'|'editable'>('editable');
 const [commits,setCommits]=useState(0);
 const [viewport,setViewport]=useState('wide');
 const parent=partyTrackPhysicalWidth(widths,true);
 return <main className={'inline-g08-fixture '+viewport}>
  <h1>G08 · kiểm thử L03 chỉnh trực tiếp 5 độ rộng</h1>
  <fieldset className="inline-g08-fixture-tools">
   <label><input type="checkbox" checked={admin} onChange={e=>setAdmin(e.target.checked)}/>Quản trị xác thực (fixture)</label>
   <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Chỉnh giao diện</label>
   <label><input type="checkbox" checked={dataEditing} onChange={e=>setDataEditing(e.target.checked)}/>Sửa dữ liệu</label>
   <label><input type="checkbox" checked={disabled} onChange={e=>setDisabled(e.target.checked)}/>Khóa</label>
   <label>Chế độ L03 <select aria-label="Chế độ L03" value={mode} onChange={e=>setMode(e.target.value as 'readonly'|'editable')}>
     <option value="readonly">2 cột · chỉ xem</option><option value="editable">3 cột · được sửa</option>
   </select></label>
   <label>Khung <select aria-label="Khung" value={viewport} onChange={e=>setViewport(e.target.value)}>
     <option value="wide">1920×1080</option><option value="narrow">900 / hẹp</option>
   </select></label>
  </fieldset>
  <p>Chỉ kéo đường phân cách màu xanh; nhấn ←/→ để xem trước, Enter lưu, Esc hủy. Không thay dữ liệu.</p>
  <output data-qa="g08-commits">Số lần commit: {commits}</output>
  <output data-qa="g08-widths">{JSON.stringify(widths)}</output>
  <output data-qa="g08-parent">Tổng rộng L03: {parent}px</output>
  <div className="inline-g08-scroll">
   <table className="item-data-table"><colgroup>
    <col style={{width:100}}/><col style={{width:parent}}/><col style={{width:220}}/>
   </colgroup><thead><tr><th>STT</th><th>Tiến độ 3 khâu</th><th>Cột hàng xóm (không đổi)</th></tr></thead>
   <tbody>{seed.map((item,index)=>{
    const railMode=mode;
    const tdWidth=partyTrackModeWidth(widths,railMode)-23;
    const vars={
      '--hdnd-l03-label-track':(railMode==='readonly'?widths.readonly.label:widths.editable.label)+'px',
      '--hdnd-l03-level-track':widths.editable.level+'px',
      '--hdnd-l03-status-track':(railMode==='readonly'?widths.readonly.status:widths.editable.status)+'px',
      '--hdnd-l03-inner-width':tdWidth+'px'
    } as CSSProperties;
    return <tr key={item.recordId}>
     <td>{index+1}</td>
     <td data-l03-layout={railMode} style={vars}>
      <CompactGroupedValue item={item} pair={pair}
       field={key=><button type="button" className="cell-picker-trigger" data-qa="mock-picker">{item[key]}</button>}
       tone={()=>undefined} editable={()=>mode==='editable'}
       l03InlineEditor={{verifiedAdmin:admin,layoutEditing:active,dataEditing,disabled,previewMode:mode,widths,
        onWidthsCommit:next=>{setWidths(next);setCommits(value=>value+1);}}}/>
     </td>
     <td data-qa="neighbor">Nội dung dài vẫn xuống dòng khi thu hẹp; không đổi độ rộng cột bên phải.</td>
    </tr>;
   })}</tbody></table>
  </div>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
