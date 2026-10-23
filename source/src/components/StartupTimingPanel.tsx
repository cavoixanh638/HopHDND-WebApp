import {useEffect,useState} from 'react';
import {markStartup,startupEnabled,startupSamples,type StartupSample} from '../data/startup-timings';
import {captureNetworkDiagnostics} from '../data/network-diagnostics';
const labels:Record<string,string>={
 'js-entry':'JavaScript bắt đầu chạy',
 'app-module-fetch':'Bắt đầu tải giao diện báo cáo',
 'app-module-loaded':'Đã tải giao diện báo cáo',
 'firebase-initialized':'Khởi tạo Firebase SDK',
 'react-commit':'Giao diện khởi tạo',
 'auth-checked':'Firebase trả trạng thái đăng nhập',
 'db-transport':'Giao thức Firebase Database',
 'auth-error':'Xác thực Firebase lỗi',
 'database-error':'Đọc Firebase lỗi',
 'tab-hidden':'Trang chuyển sang tab nền',
 'tab-visible':'Trang quay lại foreground',
 'auth-start-anonymous':'Bắt đầu đăng nhập khách',
 'auth-signed-in':'Phiên đăng nhập sẵn sàng',
 'rt-db-connected':'Realtime Database kết nối',
 'profile-received':'Cấu hình admin tải xong',
 'permissions-received':'Quyền chỉnh sửa tải xong',
 'control-received':'Trạng thái khóa chỉnh sửa tải xong',
 'source-selected':'Nguồn dữ liệu được chọn',
 'excel-request-start':'Bắt đầu yêu cầu Excel (GViz)',
 'excel-response':'Excel đã phản hồi',
 'data-cache-hydrated':'Dữ liệu lưu phiên được mở để xem tạm',
 'data-subscribe':'Bắt đầu nghe dữ liệu HĐND',
 'data-first':'Nhận được 55 dòng (hoặc số dòng hiện tại)',
 'first-data-painted':'Dữ liệu đúng nguồn đã hiển thị với bố cục hợp lệ'
};
export function StartupTimingPanel(){
 const [samples,setSamples]=useState<StartupSample[]>(startupSamples);
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{
   if(!startupEnabled())return;
   const handle=()=>setElapsed(Math.round(performance.now()));
   const visibility=()=>{const now=Math.round(performance.now());setElapsed(now);
     markStartup(document.visibilityState==='hidden'?'tab-hidden':'tab-visible');
   };
   const id=setInterval(handle,1000);
   document.addEventListener('visibilitychange',visibility);
   handle();
   return()=>{clearInterval(id);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
   const update=()=>setSamples(startupSamples());
   window.addEventListener('hdnd-startup-sample',update);
   return()=>window.removeEventListener('hdnd-startup-sample',update);
 },[]);
 if(!startupEnabled())return null;
 const network=captureNetworkDiagnostics();
 const subscribed=samples.find(s=>s.stage==='data-subscribe');
 const first=samples.find(s=>s.stage==='data-first');
 const auth=samples.find(s=>s.stage==='auth-signed-in');
 const longpoll=new URLSearchParams(window.location.search).get('dbTransport')==='longpoll';
 const stall=!!subscribed&&!first&&elapsed-subscribed.atMs>12000;
 const authStall=!auth&&elapsed>12000;
 const urlWithTransport=(mode:'auto'|'longpoll')=>{
   const target=new URL(window.location.href);
   if(mode==='longpoll')target.searchParams.set('dbTransport','longpoll');
   else target.searchParams.delete('dbTransport');
   target.searchParams.set('startupMetrics','1');
   return target.toString();
 };
 const nav=network.navigation;
 const dash=(n:number|null)=>n===null?'Không có':n+' ms';
 return <details className="startup-timing-panel" open style={{border:'1px solid #afc0cf',borderRadius:8,padding:10,margin:'8px auto',maxWidth:980,background:'#f7fafc',color:'#223c50'}}>
   <summary><strong>Chẩn đoán thời gian mở trang (thời gian tính từ navigationStart)</strong></summary>
   <p style={{fontSize:12,margin:'4px 0'}}>Các mốc độc lập có thể trùng thời gian; không cộng các hàng để suy ra tổng. Không chứa dữ liệu nghiệp vụ hay thông tin đăng nhập.</p>
   <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
     <thead><tr><th style={{textAlign:'left'}}>Giai đoạn</th><th style={{textAlign:'right'}}>Mốc (ms)</th><th style={{textAlign:'left'}}>Ghi chú</th></tr></thead>
     <tbody>{samples.map(s=><tr key={s.stage}><td>{labels[s.stage]??s.stage}</td><td style={{textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{s.atMs}</td><td>{s.detail??''}</td></tr>)}</tbody>
   </table>
   <div style={{margin:'8px 0',fontSize:12}}>
     <strong>Phân tách tải trang:</strong> HTML phản hồi xong: {dash(nav.responseEndMs)} · HTML TTFB: {dash(nav.ttfbMs)} · DOM ready: {dash(nav.domContentLoadedMs)} · Số tệp JS/CSS: {network.assets.length} · Trạng thái tab: {network.visibility==='hidden'?'Nền':network.visibility==='visible'?'Đang xem':'Chưa xác định'}.
     {network.assets.length>0&&<div>JS/CSS: {network.assets.map((a,i)=>`${a.kind} #${i+1}: phản hồi xong ${a.responseEndMs} ms, tải ${a.durationMs} ms`).join(' · ')}</div>}
   </div>
   <div style={{margin:'8px 0',fontSize:12}}>
     <strong>Giao thức RTDB:</strong> {longpoll?'HTTP long-poll (thử nghiệm)':'Mặc định Firebase (WebSocket / tự fallback)'}.
     {stall&&<p role="alert">Firebase đã bắt đầu nghe dữ liệu nhưng chưa có phản hồi sau 12 giây. Có thể mạng, proxy, giao thức hoặc trình duyệt đang trì hoãn; không phải do xử lý 55 dòng.</p>}
     {authStall&&<p role="alert">Chưa xác nhận phiên Firebase sau 12 giây. Hãy kiểm tra mạng, đăng nhập hoặc trình duyệt; thay giao thức RTDB không sửa được giai đoạn xác thực.</p>}
     <p>Để so sánh đường truyền, hãy mở cùng trang ở chế độ còn lại. Nút sẽ tải lại trang; bản đã chỉnh nhưng chưa lưu có thể bị mất.</p>
     <button type="button" className="button ghost" onClick={()=>window.location.assign(urlWithTransport(longpoll?'auto':'longpoll'))}>
       {longpoll?'Trở về kết nối Firebase mặc định':'Thử kết nối Firebase tương thích (HTTP long-poll)'}
     </button>
   </div>
   <button type="button" className="button ghost" onClick={() => void navigator.clipboard?.writeText(JSON.stringify({measurements:startupSamples(),network:captureNetworkDiagnostics(),transport:longpoll?'longpoll':'default',elapsedMs:Math.round(performance.now())},null,2))}>Sao chép số đo (không gồm dữ liệu bảng)</button>
 </details>;
}
