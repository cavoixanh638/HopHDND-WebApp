import {useEffect,useRef,useState} from 'react';
import type {FirebaseController} from '../../state/use-firebase';
import {createFreezeReceipt,readActiveLeaseSnapshot,sameFreezeDataset} from '../../data/freeze-control';

/** Optional synchronization points, populated only by the localhost browser
 * acceptance harness. Production never supplies this callback; all Firebase
 * reads/writes remain the real application implementations. */
export type FreezeUiTestCheckpoint = (
  point:'count-snapshot'|'frozen-ack'|'receipt-written'|'inspect-settled'|'change-settled',
  details:Record<string,string|number|null>
)=>Promise<void>;
export function FreezeAdminPanel({firebase,testCheckpoint}:{
  firebase:FirebaseController;testCheckpoint?:FreezeUiTestCheckpoint
}){
  const state=firebase.freezeControl;
  const [count,setCount]=useState<number|null>(null);
  const [countSource,setCountSource]=useState('');
  const lastSource=useRef<string|null>(null);
  const countRequest=useRef(0);
  const sourceFence=firebase.datasetActive
    ?[firebase.datasetActive.generationId,firebase.datasetActive.operationId,
      firebase.datasetActive.revision,firebase.datasetActive.rowCount,
      firebase.datasetActive.digest].join('|'):'legacy';
  const sourceFenceRef=useRef(sourceFence);
  sourceFenceRef.current=sourceFence;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const working=useRef(false);
  const refresh=async()=>{
    const request=++countRequest.current;
    const startedFor=sourceFenceRef.current;
    setCount(null);setCountSource('');
    const snapshot=await readActiveLeaseSnapshot(firebase.database);
    await testCheckpoint?.('count-snapshot',{
      request,count:snapshot.count,generationId:snapshot.active?.generationId??null
    });
    // React's generation state must not identify a different source.
    if(request!==countRequest.current||!firebase.connected||
      !firebase.datasetEpochReady||sourceFenceRef.current!==startedFor||
      !sameFreezeDataset(snapshot.active,firebase.datasetActive??null))
      throw Error('Generation trong bảng quản trị chưa khớp server; không dùng số đếm cũ.');
    setCount(snapshot.count);
    setCountSource(snapshot.source==='v2'?'V2 '+snapshot.active!.generationId:'Legacy');
    return snapshot.count;
  };
  const inspect=async()=>{
    const startedFor=sourceFenceRef.current;
    // refresh increments the request counter synchronously before any await.
    const request= countRequest.current+1;
    setMessage('');setError('');
    try{await refresh();}
    catch(e){
      // A slower earlier request has no authority to clear a newer count or
      // to replace the newer request's notification, even if its read failed.
      if(request!==countRequest.current)return;
      setCount(null);setCountSource('');
      if(sourceFenceRef.current===startedFor)
        setError(e instanceof Error?e.message:'Không kiểm tra được phiên sửa.');
      else
        setMessage('Generation đã đổi; số đếm cũ không còn hiệu lực. Kiểm tra lại trên generation mới.');
    }finally{
      await testCheckpoint?.('inspect-settled',{generationId:sourceFenceRef.current});
    }
  };
  const change=async(next:'DRAINING'|'FROZEN'|'OPEN',force=false)=>{
    if(working.current)return;
    working.current=true;setBusy(true);setError('');setMessage('');
    let frozenAck=false;
    try{
      const confirmed=await firebase.updateFreeze(next,force);
      if(next==='FROZEN')await testCheckpoint?.('frozen-ack',{
        generationId:confirmed.datasetV2?.generationId??null,epoch:confirmed.epoch
      });
      let confirmedMessage='';
      if(next==='FROZEN'){
        frozenAck=true;
        const proof=await createFreezeReceipt(firebase.database,firebase.user,confirmed.epoch);
        await testCheckpoint?.('receipt-written',{
          generationId:proof.datasetV2?.generationId??null,epoch:proof.epoch
        });
        const forced=force||proof.closeKind==='forced';
        confirmedMessage=(forced
          ?'Đã ĐÓNG BĂNG CƯỠNG BỨC; có thể còn nháp chưa lưu. '
          :'Đã CHỐT THÔNG THƯỜNG, không còn khóa đang hiệu lực. ')+
          'Biên nhận '+proof.rows+' nội dung'+
          (proof.datasetV2?' / '+proof.datasetV2.generationId:' / legacy')+
          '. SHA-256: '+proof.sha256.slice(0,16)+'…';
      }else if(next==='DRAINING')confirmedMessage='Đã ngừng nhận lượt sửa mới. Các phiên đang sửa được yêu cầu lưu, chỉ chốt sau khi máy chủ xác nhận.';
      else confirmedMessage='Đã mở lại chỉnh sửa. Bản nháp cũ cần được đối chiếu trước khi gửi lại.';
      await refresh();
      setMessage(confirmedMessage);
    }catch(e){
      setCount(null);setCountSource('');
      setError((frozenAck?'FROZEN đã được ACK nhưng BIÊN NHẬN CHƯA XÁC MINH. ':'')+
        (e instanceof Error?e.message:'Không thay đổi được chế độ.'));
    }
    finally{
      setBusy(false);working.current=false;
      await testCheckpoint?.('change-settled',{generationId:sourceFenceRef.current,next});
    }
  };
  // When the active pointer changes, any previous count/receipt is historical.
  useEffect(()=>{
    const key=sourceFence;
    if(lastSource.current!==null&&lastSource.current!==key){
      countRequest.current++;
      setCount(null);setCountSource('');
      setError('');
      // A first-load legacy -> V2 source switch is not evidence of any receipt.
      setMessage(previous=>previous.includes('Biên nhận ')||
        previous.includes('Đã CHỐT')||previous.includes('Đã ĐÓNG BĂNG')
        ?'Generation đã đổi; biên nhận của generation trước chỉ còn giá trị lịch sử.':'');
    }
    lastSource.current=key;
  },[firebase.datasetActive?.generationId,firebase.datasetActive?.operationId,
      firebase.datasetActive?.revision,firebase.datasetActive?.rowCount,
      firebase.datasetActive?.digest]);
  useEffect(()=>{
    if(firebase.isAdmin&&!firebase.connected){
      countRequest.current++;
      setCount(null);setCountSource('');
      setMessage('');
      setError('Mất kết nối Firebase; không có số đếm khóa đã xác minh.');
    }
  },[firebase.isAdmin,firebase.connected]);
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
      }catch(e){if(!stopped){setCount(null);setCountSource('');setMessage('');setError(e instanceof Error?e.message:'Không kiểm tra được số phiên sửa.');}}
    };
    void tick();
    const timer=window.setInterval(()=>void tick(),3000);
    return()=>{stopped=true;window.clearInterval(timer);};
  },[firebase.isAdmin,firebase.connected,state?.revision,state?.mode,
    firebase.datasetActive?.generationId,firebase.datasetActive?.operationId,
    firebase.datasetActive?.revision,firebase.datasetEpochReady]);
  if(!firebase.isAdmin)return null;
  return <section className="approval-control" aria-label="Kiểm soát khóa dữ liệu">
    <div>
      <strong>Đóng băng toàn bộ dữ liệu Firebase</strong>
      <p className="muted">Trạng thái: <strong>{!state?'Đang xác nhận':state.mode==='OPEN'?'Đang cho phép sửa':state.mode==='DRAINING'?'Đang thu nhận các lượt lưu cuối':'Đã đóng băng — chỉ xem'}</strong>
        {count!==null?' · '+count+' ô còn phiên sửa hợp lệ ('+countSource+')':' · Chưa xác minh số khóa'}</p>
      <p className="muted">Chốt thông thường: ngừng nhận lượt mới → yêu cầu người đang nhập lưu → đợi Database xác nhận → đóng băng → ghi mã kiểm tra số liệu. Nếu không thể hoàn tất trong 60 giây, khóa ngay và giữ các bản nháp chưa lưu trên máy người nhập.</p>
      {message&&<p className="notice" role="status">{message}</p>}
      {error&&<p className="error-text" role="alert">{error}</p>}
    </div>
    <div className="top-actions">
      {state?.mode==='OPEN'&&<button type="button" className="button ghost" disabled={busy||!firebase.connected||!firebase.controlReady}
        onClick={async()=>{
          setBusy(true);setError('');
          try{await firebase.saveEditingLock(!firebase.editingLocked);
            setMessage(firebase.editingLocked?'Đã mở lại quyền sửa của khách.':'Đã tạm dừng mọi lượt ghi mới của khách; admin vẫn được làm việc.');}
          catch(e){setError(e instanceof Error?e.message:'Không thay đổi được quyền sửa khách.');}
          finally{setBusy(false);}
        }}>{firebase.editingLocked?'Mở quyền sửa của khách':'Tạm dừng sửa của khách'}</button>}
      {state?.mode==='OPEN'&&<button type="button" className="button primary" disabled={busy||!firebase.connected} onClick={()=>void change('DRAINING')}>Yêu cầu lưu rồi chốt</button>}
      {state?.mode==='DRAINING'&&<button type="button" className="button danger" disabled={busy} onClick={()=>void change('FROZEN',true)}>Đóng băng ngay</button>}
      {state?.mode==='OPEN'&&<button type="button" className="button ghost" disabled={busy} onClick={()=>void change('FROZEN',true)}>Đóng băng khẩn cấp</button>}
      {state?.mode==='FROZEN'&&<button type="button" className="button primary" disabled={busy||!firebase.connected} onClick={()=>void change('OPEN')}>Mở lại chỉnh sửa</button>}
      <button type="button" className="button ghost" disabled={busy||!firebase.connected} onClick={()=>void inspect()}>Kiểm tra phiên sửa</button>
    </div>
  </section>;
}
