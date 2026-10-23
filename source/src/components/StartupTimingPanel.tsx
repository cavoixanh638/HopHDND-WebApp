import {useEffect,useState} from 'react';
import {startupEnabled,startupSamples,type StartupSample} from '../data/startup-timings';
const labels:Record<string,string>={
 'js-entry':'JavaScript bắt đầu chạy',
 'firebase-initialized':'Khởi tạo Firebase SDK',
 'react-commit':'Giao diện khởi tạo',
 'auth-checked':'Firebase trả trạng thái đăng nhập',
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
 useEffect(()=>{
   const update=()=>setSamples(startupSamples());
   window.addEventListener('hdnd-startup-sample',update);
   return()=>window.removeEventListener('hdnd-startup-sample',update);
 },[]);
 if(!startupEnabled())return null;
 return <details className="startup-timing-panel" open style={{border:'1px solid #afc0cf',borderRadius:8,padding:10,margin:'8px auto',maxWidth:980,background:'#f7fafc',color:'#223c50'}}>
   <summary><strong>Chẩn đoán thời gian mở trang (thời gian tính từ navigationStart)</strong></summary>
   <p style={{fontSize:12,margin:'4px 0'}}>Các mốc độc lập có thể trùng thời gian; không cộng các hàng để suy ra tổng. Không chứa dữ liệu nghiệp vụ hay thông tin đăng nhập.</p>
   <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
     <thead><tr><th style={{textAlign:'left'}}>Giai đoạn</th><th style={{textAlign:'right'}}>Mốc (ms)</th><th style={{textAlign:'left'}}>Ghi chú</th></tr></thead>
     <tbody>{samples.map(s=><tr key={s.stage}><td>{labels[s.stage]??s.stage}</td><td style={{textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{s.atMs}</td><td>{s.detail??''}</td></tr>)}</tbody>
   </table>
   <button type="button" className="button ghost" onClick={() => void navigator.clipboard?.writeText(JSON.stringify({measurements:startupSamples(),navigation:performance.getEntriesByType('navigation').map(entry=>({duration:Math.round(entry.duration),domContentLoaded:Math.round((entry as PerformanceNavigationTiming).domContentLoadedEventEnd),responseEnd:Math.round((entry as PerformanceNavigationTiming).responseEnd)}))},null,2))}>Sao chép số đo (không gồm dữ liệu bảng)</button>
 </details>;
}
