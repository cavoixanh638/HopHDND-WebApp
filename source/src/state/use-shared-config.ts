import {useEffect,useRef,useState} from 'react';
import type {SheetConfig} from '../data/sheet-config';
import type {ConfigSection,SharedConfig} from '../data/shared-config';
import {readSharedConfig,saveSharedSection} from '../data/shared-config-repository';
import {isGoogleHost} from '../data/google-bridge';

type LoadStatus='loading'|'ready'|'empty'|'error'|'disabled';
export function useSharedConfig(source:SheetConfig,enabled:boolean,editing:boolean){
  const [config,setConfig]=useState<SharedConfig|null>(null);
  const [message,setMessage]=useState('Đang đọc danh mục và bố trí từ Google; vui lòng chờ trước khi tùy chỉnh.');
  const [status,setStatus]=useState<LoadStatus>('loading');
  const [busy,setBusy]=useState(false);
  const current=useRef({source,enabled,editing});current.current={source,enabled,editing};
  const stored=useRef<SharedConfig|null>(null);
  const generation=useRef(0),mutation=useRef(0),saving=useRef(false);
  const pending=useRef(new Set<number>());
  const refresh=async(force=false)=>{
    const request=current.current,epoch=generation.current,writeVersion=mutation.current;
    if(!request.enabled||pending.current.has(epoch)||saving.current)return;
    pending.current.add(epoch);
    if(!stored.current){setStatus('loading');setMessage('Đang đọc danh mục và bố trí từ Google; vui lòng chờ trước khi tùy chỉnh.');}
    try{
      const next=await readSharedConfig(request.source);
      if(epoch!==generation.current||writeVersion!==mutation.current||!current.current.enabled)return;
      // Editors are gated in App until this first baseline is available.
      if(current.current.editing&&!force&&stored.current){
        if(next?.revision!==stored.current.revision)setMessage('Danh mục và bố trí dùng chung đã đổi; phần bạn đang sửa vẫn giữ trên máy. Đối chiếu trước khi lưu.');
        return;
      }
      stored.current=next;setConfig(next);setStatus(next?'ready':'empty');
      setMessage(next?`Đã đọc danh mục và bố trí · bản lưu số ${next.revision}`:'Google Sheets riêng chưa có danh mục và bố trí cho nguồn này. Mở Danh mục và bố trí dùng chung để khởi tạo.');
    }catch(cause){
      if(epoch!==generation.current||writeVersion!==mutation.current||!current.current.enabled)return;
      const detail=cause instanceof Error?cause.message:'Không đọc được cấu hình chung.';
      setStatus('error');setMessage(`Không đọc được danh mục và bố trí từ Google: ${detail} Phần sửa trên máy vẫn được giữ; bấm Đọc lại danh mục và bố trí.`);
    }finally{pending.current.delete(epoch);}
  };
  const refreshRef=useRef(refresh);refreshRef.current=refresh;
  useEffect(()=>{
    generation.current++;mutation.current++;stored.current=null;setConfig(null);
    setStatus(enabled?'loading':'disabled');
    setMessage(enabled?'Đang đọc danh mục và bố trí từ Google; vui lòng chờ trước khi tùy chỉnh.':'Dữ liệu mẫu · cấu hình trên máy');
    void refreshRef.current();
    const timer=window.setInterval(()=>{if(!document.hidden)void refreshRef.current();},60000);
    return()=>{clearInterval(timer);generation.current++;};
  },[source.url,enabled]);
  const save=async(section:ConfigSection,value:unknown)=>{
    if(saving.current)throw new Error('Đang lưu danh mục và bố trí vào Google Sheets riêng. Phần sửa trên máy vẫn được giữ.');
    if(!isGoogleHost())throw new Error('File HTML không ghi được vào kho riêng. Mở trình chỉnh chung trên Google để lưu; nháp được giữ.');
    const base=stored.current;
    if(!base&&section!=='all')throw new Error('Chưa tải được cấu hình gốc để lưu an toàn. Phần sửa trên máy vẫn được giữ; đọc lại danh mục và bố trí trước khi tùy chỉnh.');
    if(!base&&status!=='empty')throw new Error('Chưa xác nhận kho trống; không khởi tạo hoặc ghi đè. Đọc lại danh mục và bố trí trước.');
    saving.current=true;setBusy(true);mutation.current++;
    const epoch=generation.current,request=current.current.source;
    try{
      const next=await saveSharedSection(request,base?.revision??0,section,value,crypto.randomUUID());
      if(epoch!==generation.current||!current.current.enabled)throw new Error('Nguồn đã đổi trong lúc lưu. Kiểm tra lại cấu hình của nguồn cũ trước khi thử lại.');
      stored.current=next;setConfig(next);setStatus('ready');setMessage(`Đã lưu danh mục và bố trí vào Google Sheets riêng · bản lưu số ${next.revision}`);return next;
    }finally{saving.current=false;setBusy(false);}
  };
  const matching=config?.spreadsheetId===source.spreadsheetId&&config?.gid===source.gid;
  return{config:enabled&&matching?config:null,message,status,busy,refresh,save};
}
