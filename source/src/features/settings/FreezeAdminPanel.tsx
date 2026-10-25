import {useEffect,useRef,useState} from 'react';
import {get,ref,runTransaction,serverTimestamp} from 'firebase/database';
import type {FirebaseController} from '../../state/use-firebase';
import {readFreeze} from '../../data/freeze-control';

export function FreezeAdminPanel({firebase}:{firebase:FirebaseController}){
  const state=firebase.freezeControl;
  const [count,setCount]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const working=useRef(false);
  const refresh=async()=>{const n=await firebase.countEditingCells();setCount(n);return n;};
  const receipt=async(epoch:number)=>{
    // Freeze ACK is the linearization point. The authoritative data is read
    // AFTER the commit, never from a stale React display or local drafts.
    const freeze=await readFreeze(firebase.database);
    if(freeze.mode!=='FROZEN'||freeze.epoch!==epoch)throw Error('Mốc chốt đã thay đổi; không tạo báo cáo cũ.');
    const raw=(await get(ref(firebase.database,'hdnd/items'))).val()??{};
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Không đọc được dữ liệu chính.');
    const ids=Object.keys(raw).sort(),canonical=JSON.stringify(ids.map(id=>[id,raw[id]]));
    const input=new TextEncoder().encode(canonical);
    const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',input));
    const sha256=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    const latest=await readFreeze(firebase.database);
    if(latest.mode!=='FROZEN'||latest.epoch!==epoch)
      throw Error('Mốc chốt đã được mở lại; không tạo biên nhận thiếu đồng nhất.');
    const p=ref(firebase.database,'hdnd/freezeReceipts/'+epoch);
    const record=await runTransaction(p,current=>current??{
      epoch,rows:ids.length,sha256,actor:firebase.user?.uid??'',
      frozenAt:freeze.closedAt,recordedAt:serverTimestamp()
    },{applyLocally:false});
    if(!record.committed&&record.snapshot.val()?.sha256!==sha256)
      throw Error('Biên nhận chốt đã khác, phải đối chiếu.');
    return {rows:ids.length,sha256};
  };
  const change=async(next:'DRAINING'|'FROZEN'|'OPEN',force=false)=>{
    if(working.current)return;
    working.current=true;setBusy(true);setError('');
    try{
      const confirmed=await firebase.updateFreeze(next,force);
      if(next==='FROZEN'){
        const proof=await receipt(confirmed.epoch);
        setMessage(`Đã đóng băng ${proof.rows} nội dung. Mã kiểm tra: ${proof.sha256.slice(0,16)}…`);
      }else if(next==='DRAINING')setMessage('Đã ngừng nhận lượt sửa mới. Các phiên đang sửa được yêu cầu lưu, chỉ chốt sau khi máy chủ xác nhận.');
      else setMessage('Đã mở lại chỉnh sửa. Bản nháp cũ cần được đối chiếu trước khi gửi lại.');
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Không thay đổi được chế độ.');}
    finally{setBusy(false);working.current=false;}
  };
  // Admin dashboard watches current active leases; when an orderly drain
  // reaches zero it commits FROZEN automatically. A deadline alone never
  // claims unconfirmed local drafts were persisted.
  useEffect(()=>{
    if(!firebase.isAdmin||state?.mode!=='DRAINING'||!firebase.connected)return;
    let stopped=false;
    const tick=async()=>{
      if(stopped||working.current)return;
      try{
        const n=await refresh();
        if(n===0&&!stopped)await change('FROZEN',false);
        else if(Date.now()>=state.deadline&&!stopped)await change('FROZEN',true);
      }catch(e){if(!stopped)setError(e instanceof Error?e.message:'Không kiểm tra được số phiên sửa.');}
    };
    void tick();
    const timer=window.setInterval(()=>void tick(),3000);
    return()=>{stopped=true;window.clearInterval(timer);};
  },[firebase.isAdmin,firebase.connected,state?.revision,state?.mode]);
  if(!firebase.isAdmin)return null;
  return <section className="approval-control" aria-label="Kiểm soát khóa dữ liệu">
    <div>
      <strong>Đóng băng toàn bộ dữ liệu Firebase</strong>
      <p className="muted">Trạng thái: <strong>{!state?'Đang xác nhận':state.mode==='OPEN'?'Đang cho phép sửa':state.mode==='DRAINING'?'Đang thu nhận các lượt lưu cuối':'Đã đóng băng — chỉ xem'}</strong>
        {count!==null?` · ${count} ô còn phiên sửa hợp lệ`:''}</p>
      <p className="muted">Chốt thông thường: ngừng nhận lượt mới → yêu cầu người đang nhập lưu → đợi Database xác nhận → đóng băng → ghi mã kiểm tra số liệu. Nếu không thể hoàn tất trong 60 giây, khóa ngay và giữ các bản nháp chưa lưu trên máy người nhập.</p>
      {message&&<p className="notice" role="status">{message}</p>}
      {error&&<p className="error-text" role="alert">{error}</p>}
    </div>
    <div className="top-actions">
      {state?.mode==='OPEN'&&<button type="button" className="button primary" disabled={busy||!firebase.connected} onClick={()=>void change('DRAINING')}>Yêu cầu lưu rồi chốt</button>}
      {state?.mode==='DRAINING'&&<button type="button" className="button danger" disabled={busy} onClick={()=>void change('FROZEN',true)}>Đóng băng ngay</button>}
      {state?.mode==='OPEN'&&<button type="button" className="button ghost" disabled={busy} onClick={()=>void change('FROZEN',true)}>Đóng băng khẩn cấp</button>}
      {state?.mode==='FROZEN'&&<button type="button" className="button primary" disabled={busy||!firebase.connected} onClick={()=>void change('OPEN')}>Mở lại chỉnh sửa</button>}
      <button type="button" className="button ghost" disabled={busy||!firebase.connected} onClick={()=>void refresh()}>Kiểm tra phiên sửa</button>
    </div>
  </section>;
}
