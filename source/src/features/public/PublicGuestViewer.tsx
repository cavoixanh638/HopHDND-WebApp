import {useEffect,useMemo,useState} from 'react';
import {onValue,ref,type Database} from 'firebase/database';
import {GROUP_OPTIONS} from '../../../shared/field-definitions';
import type {GroupField} from '../../../shared/types';
import type {PublicViewV1} from '../../data/admin-published-public-view';

/** Guest browser NEVER imports or mounts raw items/Sheets/mirror repositories.
 * All report counts, detail links and cells are already pre-approved by admin.
 */
type GuestData={state:'loading'|'missing'|'error'|'ready';value?:PublicViewV1;message?:string};
function checkSnapshot(raw:unknown):PublicViewV1|null{
  if(raw===null)return null;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Bản công bố không hợp lệ.');
  const data=raw as Partial<PublicViewV1>;
  if(data.schemaVersion!==1||!Number.isSafeInteger(data.publishedLayoutRevision)||
    !Array.isArray(data.columns)||!Array.isArray(data.rows)||!Array.isArray(data.reports)||
    data.rows.length>1000||data.columns.length>40||data.reports.length>10)
    throw Error('Cấu trúc dữ liệu công bố không hợp lệ.');
  const keys=data.columns.map(c=>c.key);
  if(!keys.length||new Set(keys).size!==keys.length||
    data.columns.some(c=>typeof c.key!=='string'||typeof c.label!=='string'||
      !Number.isFinite(c.width)||c.width<60||c.width>1600)||
    data.rows.some(row=>!row||!row.cells||typeof row.cells!=='object'||
      Object.keys(row.cells).some(key=>!keys.includes(key))||
      Object.values(row.cells).some(v=>typeof v!=='string')))
    throw Error('Dữ liệu danh sách không khớp layout admin.');
  if(data.reports.some(report=>!report||typeof report.id!=='string'||!report.groups||
    typeof report.title!=='string'||!Array.isArray(report.stageColumns)))
    throw Error('Dữ liệu báo cáo công bố không hợp lệ.');
  return data as PublicViewV1;
}

export function PublicGuestViewer({database,onLogin,authLabel,onLogout}:{
  database:Database;
  onLogin:()=>Promise<void>;
  authLabel?:string;
  onLogout?:()=>Promise<void>;
}){
  const [snapshot,setSnapshot]=useState<GuestData>({state:'loading'});
  const [page,setPage]=useState<'overview'|'items'>('overview');
  const [group,setGroup]=useState<GroupField>('department');
  const [filter,setFilter]=useState('');
  const [selection,setSelection]=useState<{name:string;rowIndexes:number[]}|null>(null);
  const [authError,setAuthError]=useState('');
  useEffect(()=>{
    const unsubscribe=onValue(ref(database,'hdnd/publicViews/current'),response=>{
      try{
        const value=checkSnapshot(response.val());
        setSnapshot(value?{state:'ready',value}:{state:'missing'});
      }catch(cause){setSnapshot({state:'error',message:cause instanceof Error?cause.message:'Bản công bố lỗi.'});}
    },cause=>setSnapshot({state:'error',message:'Không đọc được bản công bố: '+cause.message}));
    return unsubscribe;
  },[database]);
  const value=snapshot.value;
  const visibleRows=useMemo(()=>{
    if(!value)return [];
    const indices=selection?new Set(selection.rowIndexes):null;
    return value.rows.map((row,index)=>({row,index})).filter(({row,index})=>
      (!indices||indices.has(index))&&
      (!filter.trim()||Object.values(row.cells).some(v=>v.toLocaleLowerCase('vi').includes(filter.trim().toLocaleLowerCase('vi')))));
  },[value,filter,selection]);
  const login=()=>{setAuthError('');void onLogin().catch(e=>setAuthError(e instanceof Error?e.message:'Không đăng nhập được.'));};
  const go=(next:'overview'|'items')=>{setPage(next);setSelection(null);setFilter('');};
  return <div className="app-shell imperial-sky-theme guest-published-shell">
    <header className="topbar compact-topbar">
      <strong>HopHDND</strong>
      <div className="top-actions">
        {authLabel&&<span className="muted">{authLabel}</span>}
        {onLogout&&<button className="button ghost" type="button" onClick={()=>void onLogout()}>Đăng xuất</button>}
        <button className="button ghost" type="button" onClick={login}>Đăng nhập để chỉnh sửa</button>
      </div>
    </header>
    <nav className="nav-tabs primary-section-switcher" aria-label="Hai phần dữ liệu chính">
      <button type="button" className={'primary-section-card'+(page==='overview'?' active':'')}
        onClick={()=>go('overview')}>Báo cáo tổng hợp</button>
      <button type="button" className={'primary-section-card'+(page==='items'?' active':'')}
        onClick={()=>go('items')}>Danh sách các ND trình HĐND</button>
    </nav>
    <main>
      {authError&&<p className="notice" role="alert">{authError}</p>}
      {snapshot.state==='loading'&&<p role="status">Đang tải bảng do quản trị viên công bố…</p>}
      {snapshot.state==='missing'&&<p className="notice" role="status">Quản trị viên chưa công bố bản hiển thị. Không đọc dữ liệu gốc để thay thế.</p>}
      {snapshot.state==='error'&&<p className="notice" role="alert">{snapshot.message}</p>}
      {value&&<div>
        {page==='overview'&&<div>
          <div className="kpi-grid">
            <article className="kpi-card"><span>Đang trình</span><strong className="kpi-value">{value.kpis.total}</strong></article>
            <article className="kpi-card"><span>Sở chưa trình</span><strong className="kpi-value">{value.kpis.pending}</strong></article>
            <article className="kpi-card"><span>VP đang thực hiện</span><strong className="kpi-value">{value.kpis.doing}</strong></article>
            <article className="kpi-card"><span>Đã hoàn thành</span><strong className="kpi-value">{value.kpis.completed}</strong></article>
          </div>
          <div className="toolbar"><label className="field">Phân nhóm theo
            <select value={group} onChange={e=>setGroup(e.currentTarget.value as GroupField)}>
              {GROUP_OPTIONS.map(x=><option key={x.key} value={x.key}>{x.label}</option>)}
            </select></label></div>
          {value.reports.map(report=><section className="card" key={report.id}>
            <h3>{report.title}</h3>
            <div className="table-wrap"><table className="data-table"><thead>
              <tr><th>Nhóm</th>{report.stageColumns.map(x=><th key={x}>{x}</th>)}</tr>
            </thead><tbody>
              {(report.groups[group]??[]).map((entry,i)=><tr key={i}><th>{entry.label}</th>
                {report.stageColumns.map(stage=>{
                  const cell=entry.stages.find(x=>x.label===stage);
                  return <td key={stage}><button type="button" className="button ghost"
                    disabled={!cell?.count} onClick={()=>{
                      setSelection({name:report.title+' / '+entry.label+' / '+stage,rowIndexes:cell?.detailIndexes??[]});
                      setPage('items');setFilter('');
                    }}>{cell?.count??0}</button></td>;
                })}
              </tr>)}
            </tbody></table></div>
          </section>)}
        </div>}
        {page==='items'&&<section>
          <h2>{selection?.name??'Danh sách chi tiết'}</h2>
          {selection&&<button className="button ghost" type="button" onClick={()=>setSelection(null)}>Xem toàn bộ danh sách được công bố</button>}
          <label className="field">Tìm trong các cột hiển thị
            <input value={filter} onChange={e=>setFilter(e.currentTarget.value)} placeholder="Tìm kiếm…"/>
          </label>
          <div className="table-wrap"><table className="data-table"><thead><tr>
            {value.columns.map(column=><th key={column.key} style={{minWidth:column.width}}>{column.label}</th>)}
          </tr></thead><tbody>
            {visibleRows.map(({row,index})=><tr key={index}>
              {value.columns.map(column=><td key={column.key} style={{whiteSpace:'pre-line'}}>{row.cells[column.key]??''}</td>)}
            </tr>)}
          </tbody></table></div>
          <p className="muted">Đang hiển thị {visibleRows.length} hồ sơ theo bố cục do quản trị viên công bố.</p>
        </section>}
      </div>}
    </main>
  </div>;
}
