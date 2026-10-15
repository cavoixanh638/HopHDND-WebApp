interface Runner {withSuccessHandler(handler:(value:unknown)=>void):Runner;withFailureHandler(handler:(error:{message?:string})=>void):Runner;getDashboardConfig(source:unknown):void;getDashboardSourceStatus(source:unknown):void;saveDashboardConfig(request:unknown):void;getDashboardData(source:unknown):void;saveDashboardData(request:unknown):void;getDashboardHistory(request:unknown):void}
declare global {interface Window {google?:{script?:{run?:Runner}}}}
export const isGoogleHost=()=>!!window.google?.script?.run;
type GoogleMethod='getDashboardConfig'|'getDashboardSourceStatus'|'saveDashboardConfig'|'getDashboardData'|'saveDashboardData'|'getDashboardHistory';
const sourceReadMethods:GoogleMethod[]=['getDashboardData','getDashboardHistory'];
export function googleCall(method:GoogleMethod,request:unknown):Promise<unknown> {
  const run=window.google?.script?.run;
  if(!run)return Promise.reject(new Error(sourceReadMethods.includes(method)?'Mở ứng dụng trên Google để đọc dữ liệu nguồn.':method==='saveDashboardData'?'Mở ứng dụng trên Google để lưu vào file nguồn.':'Mở link chỉnh chung trên Google để lưu đồng bộ. File HTML chỉ đọc cấu hình chung.'));
  return new Promise((resolve,reject)=>{
    const sourceRead=sourceReadMethods.includes(method),sourceSave=method==='saveDashboardData';
    const timeout=sourceSave?90000:sourceRead?30000:20000;
    const timeoutMessage=sourceSave
      ?'Google chưa xác nhận kết quả ghi file nguồn trong 90 giây. Giữ phần sửa trên máy; đọc lại file nguồn trước khi thử lưu lại.'
      :sourceRead
        ?'Google chưa trả dữ liệu nguồn trong 30 giây. Bấm Đọc lại dữ liệu và danh mục từ Google.'
        :method.startsWith('get')?'Google chưa trả danh mục và bố trí trong 20 giây. Bấm Đọc lại danh mục và bố trí.':'Chưa xác định danh mục và bố trí đã lưu vào Google Sheets riêng hay chưa. Giữ phần sửa trên máy; đọc lại trước khi thử lưu lại.';
    const fallback=sourceSave?'Không lưu được dữ liệu vào file nguồn. Phần sửa trên máy vẫn được giữ.':sourceRead?'Không đọc được dữ liệu nguồn từ Google.':method==='getDashboardConfig'?'Không đọc được cấu hình chung.':'Không lưu được cấu hình chung.';
    const timer=window.setTimeout(()=>reject(new Error(timeoutMessage)),timeout);
    const runner=run.withSuccessHandler(value=>{clearTimeout(timer);resolve(value);}).withFailureHandler(error=>{clearTimeout(timer);reject(new Error(error.message||fallback));});
    runner[method](request);
  });
}
