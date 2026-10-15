import { parseSheetConfig,type SheetConfig } from './sheet-config';
export function requestGviz(config:SheetConfig,query:Record<string,string>,timeoutMs=15000):Promise<unknown> {
  const source=parseSheetConfig(config.url,config.gid);
  return new Promise((resolve,reject)=>{
    const callback=`hdnd_gviz_${crypto.randomUUID().replaceAll('-','')}`;
    const scope=window as unknown as Record<string,unknown>,script=document.createElement('script');
    let settled=false;
    const finish=(value?:unknown,error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);script.remove();delete scope[callback];error?reject(error):resolve(value);};
    const timer=window.setTimeout(()=>finish(undefined,new Error('Sheets chưa trả dữ liệu sau 15 giây. Kiểm tra mạng, quyền đọc hoặc định dạng Google Trang tính.')),timeoutMs);
    scope[callback]=(payload:unknown)=>finish(payload);
    const params=new URLSearchParams({...query,tqx:`out:json;responseHandler:${callback}`,cb:String(Date.now())});
    script.src=`https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/gviz/tq?${params}`;
    script.referrerPolicy='no-referrer';
    script.onerror=()=>finish(undefined,new Error('Không tải được Sheets. Link chia sẻ HTML và quyền đọc bảng là hai quyền riêng; app chưa hỗ trợ OAuth cho bảng riêng tư.'));
    document.head.append(script);
  });
}
