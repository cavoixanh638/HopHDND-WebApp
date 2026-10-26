/** LIVE Cloud A/B benchmark, with one explicit, Google-admin-only
 * staging snapshot copy operation. NEVER writes to Firebase production.
 * Benchmark runs remain read-only; CSV contains no business data/tokens.
 */
import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged} from 'firebase/auth';
import {firebaseConfig} from '../data/firebase-config';
import {mirrorPath,validateExcelMirror,type ExcelMirrorSnapshot} from '../data/firebase-mirror-repository';
import {DEFAULT_SHEET_URL,parseSheetConfig} from '../data/sheet-config';
import {HDND_SUPABASE_STAGING_PUBLIC,readSupabasePreviewConfig,SupabasePreviewRepository}
  from '../data/supabase-preview-source';
import type {Item} from '../../shared/types';

type Source='fb'|'sp';
type Sample={round:number;source:Source;ms:number;rows:number;ok:boolean;reason:string};
const pick=<T extends HTMLElement>(id:string)=>{const e=document.getElementById(id);if(!e)throw new Error('Thiếu thành phần '+id);return e as T;};
const say=(msg:string)=>{pick<HTMLElement>('state').textContent=msg;};
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
const app=initializeApp(firebaseConfig,'hophdnd-qa-benchmark-firebase-production');
const auth=getAuth(app);
const mirrorSource=parseSheetConfig(DEFAULT_SHEET_URL);
let lastMirror:ExcelMirrorSnapshot|null=null;
const cfg=readSupabasePreviewConfig();
if(!cfg||cfg.url!==HDND_SUPABASE_STAGING_PUBLIC.url)throw new Error('Chỉ chấp nhận Supabase STAGING cố định.');
const accountLookupConfig=cfg;
const supabase=new SupabasePreviewRepository(cfg);
const canonicalFields=['recordId','displayCode','stt','revision','archivedAt',
  'documentKind','content','department','type','partyLevel','progressParty',
  'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader',
  'specificProgress','note','isDropped','partyMeeting','examined'] as const;
// Excel-origin Firebase mirror uses revision=0. PostgreSQL stores positive
// revision (>=1), so normalize exactly this metadata discrepancy.
const normalized=(row:Item):Item=>({...row,revision:Math.max(1,row.revision)});
const canonical=(items:Item[])=>JSON.stringify([...items].sort((a,b)=>a.recordId.localeCompare(b.recordId))
  .map(row=>canonicalFields.map(k=>normalized(row)[k]??null)));
async function digest(value:string){
  const data=new TextEncoder().encode(value);
  const sum=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
  return [...sum].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function fetchLiveFirebaseMirror():Promise<Item[]> {
  const user=auth.currentUser;
  if(!user)throw new Error('Chưa đăng nhập Google Firebase Cloud.');
  // Explicit no-cache HTTPS read avoids Firebase SDK's local fallback:
  // each benchmark sample must hit the Firebase production server.
  const token=await user.getIdToken();
  const url=new URL(firebaseConfig.databaseURL+'/'+mirrorPath(mirrorSource)+'.json');
  url.searchParams.set('auth',token);
  const response=await fetch(url.toString(),{cache:'no-store',method:'GET',redirect:'error'});
  if(!response.ok)throw new Error('Firebase CLOUD HTTP '+response.status);
  const raw:unknown=await response.json();
  const confirmed=validateExcelMirror(raw,mirrorSource);
  lastMirror=confirmed;
  return confirmed.rows;
}
async function snap(source:Source){
  return source==='fb'?fetchLiveFirebaseMirror():supabase.list();
}
const pctl=pick<HTMLButtonElement>('run');
const cancel=pick<HTMLButtonElement>('cancel');
const csv=pick<HTMLButtonElement>('csv');
const check=pick<HTMLButtonElement>('check');
const importButton=pick<HTMLButtonElement>('import');
let parity=false,aborted=false,working=false;
let lastFirebaseHash='';let lastFirebaseCount=0;
let samples:Sample[]=[];
let baselineHash='';
let baselineCount=0;
function percentile(values:number[],p:number){
  if(!values.length)return '—';
  const xs=[...values].sort((a,b)=>a-b);
  const i=Math.max(0,Math.ceil(p*xs.length)-1);
  return xs[i].toFixed(1)+' ms';
}
function render(){
  for(const source of ['fb','sp'] as const){
    const s=samples.filter(x=>x.source===source);
    const good=s.filter(x=>x.ok).map(x=>x.ms);
    pick<HTMLElement>(source+'-n').textContent=String(good.length);
    pick<HTMLElement>(source+'-p50').textContent=percentile(good,.5);
    pick<HTMLElement>(source+'-p95').textContent=percentile(good,.95);
    pick<HTMLElement>(source+'-errors').textContent=s.length?((s.length-good.length)/s.length*100).toFixed(1)+'%':'—';
  }
}
function setWorking(value:boolean){
  working=value;
  pctl.disabled=value||!parity;
  cancel.disabled=!value;
  check.disabled=value;
  importButton.disabled=value||!auth.currentUser||parity;
  pick<HTMLButtonElement>('firebase-login').disabled=value;
  pick<HTMLButtonElement>('supabase-google').disabled=value;
  pick<HTMLSelectElement>('rounds').disabled=value;
  csv.disabled=value||!samples.length;
}
async function describeSupabaseIdentity():Promise<string>{
  try{
    const jwt=await supabase.auth.getAccessToken();
    const response=await fetch(accountLookupConfig.url+'/auth/v1/user',{
      cache:'no-store',
      headers:{apikey:accountLookupConfig.publishableKey,authorization:'Bearer '+jwt}
    });
    if(!response.ok)return 'không xác định được tài khoản Supabase ('+response.status+')';
    const raw:unknown=await response.json();
    if(!raw||typeof raw!=='object')return 'không xác định được tài khoản Supabase';
    const u=raw as {email?:unknown;is_anonymous?:unknown;app_metadata?:{provider?:unknown;providers?:unknown}};
    const email=typeof u.email==='string'?u.email:'';
    const providers=Array.isArray(u.app_metadata?.providers)?u.app_metadata.providers:[];
    if(u.is_anonymous===true||(!email&&!providers.includes('google')))
      return 'đang dùng phiên ẩn danh, chưa đăng nhập Google Supabase';
    return 'đang dùng Google '+email+' nhưng chưa nằm trong danh sách quản trị';
  }catch{return 'không kiểm tra được phiên Supabase Google';}
}
async function checkParity(){
  parity=false;pctl.disabled=true;samples=[];render();
  say('Đang xác minh từng nguồn Cloud: Firebase 55+ hồ sơ trước, rồi quyền Supabase…');
  const t0=performance.now();
  try{
    const fbStart=performance.now();
    const fbRows=await snap('fb');
    const fbMs=performance.now()-fbStart;
    const fbHash=await digest(canonical(fbRows));
    lastFirebaseHash=fbHash;lastFirebaseCount=fbRows.length;
    baselineCount=fbRows.length;baselineHash=fbHash;
    if(fbRows.length<50){
      say('Firebase mirror: '+fbRows.length+' hồ sơ. Chưa đủ 50 hồ sơ; dừng vì sai nguồn.');
      return;
    }
    const access=await supabase.accessState();
    if(!access.isAdmin){
      say('Firebase mirror: '+fbRows.length+' hồ sơ / '+fbMs.toFixed(1)+' ms.\n'
        +'Supabase: CHƯA ĐƯỢC CẤP QUYỀN ĐỌC. Không thể gọi đây là 0 hồ sơ.\n'
        +'Lý do: '+await describeSupabaseIdentity()+'.\n'
        +'Hãy bấm “Chọn lại tài khoản Google Supabase quản trị”, chọn Google được phép quản trị, rồi kiểm tra lại.\n'
        +'Chưa sao chép dữ liệu, chưa thể đo tốc độ.');
      return;
    }
    const spStart=performance.now();
    const spRows=await snap('sp');
    const spMs=performance.now()-spStart;
    const spHash=await digest(canonical(spRows));
    parity=fbRows.length===spRows.length&&fbHash===spHash;
    say('Firebase mirror: '+fbRows.length+' hồ sơ / '+fbMs.toFixed(1)+' ms\n'
      +'Supabase staging: '+spRows.length+' hồ sơ / '+spMs.toFixed(1)+' ms\n'
      +'SHA-256 Firebase: '+fbHash+'\nSHA-256 Supabase: '+spHash+'\n'
      +(parity?'ĐÃ KHỚP: hai nguồn có cùng nội dung và số lượng; có thể bắt đầu đo.':
        'CHƯA KHỚP: bấm “NẠP HỒ SƠ SANG SUPABASE” rồi xác nhận trước khi đo.')+'\n'
      +'Đã xác minh quyền Google Supabase quản trị. Tổng thời gian xác minh: '
      +(performance.now()-t0).toFixed(0)+' ms');
  }catch(e){say('Không xác minh được: '+message(e)+'. Chưa nạp, chưa thể đo.');}
  finally{
    pctl.disabled=!parity;
    importButton.disabled=working||!auth.currentUser||parity;
  }
}
pick<HTMLButtonElement>('firebase-login').onclick=async()=>{
  try{const r=await signInWithPopup(auth,new GoogleAuthProvider());
    say('Firebase Cloud đã đăng nhập Google: '+(r.user.email??'(không có email)')+'. Chọn “Kiểm tra cùng dữ liệu”.');
  }catch(e){say('Firebase Auth: '+message(e));}
};
pick<HTMLButtonElement>('supabase-google').onclick=()=>{
  try{supabase.auth.startGoogleSignIn();}
  catch(e){say('Supabase Google Auth: '+message(e));}
};
check.onclick=()=>{void checkParity();};
importButton.onclick=()=>{void (async()=>{
  if(working)return;
  setWorking(true);parity=false;pctl.disabled=true;samples=[];render();
  try{
    if(!auth.currentUser)throw new Error('Đăng nhập Google Firebase trước khi nạp.');
    say('Đang kiểm tra quyền Supabase và đọc 55+ hồ sơ Firebase. Chưa ghi dữ liệu…');
    const access=await supabase.accessState();
    if(!access.isAdmin){
      throw new Error('Tài khoản Supabase chưa được cấp quyền quản trị: '
        +await describeSupabaseIdentity()
        +'. Bấm “Chọn lại tài khoản Google Supabase quản trị” trước khi nạp.');
    }
    const firstRows=await snap('fb');
    if(firstRows.length<50)throw new Error('Firebase mirror chỉ có '+firstRows.length+' hồ sơ, không đủ để sao chép.');
    const mirrorSnapshot=lastMirror;
    const firstHash=await digest(canonical(firstRows));
    lastFirebaseHash=firstHash;lastFirebaseCount=firstRows.length;
    const currentSupabase=await snap('sp');
    if(currentSupabase.length===firstRows.length&&
       await digest(canonical(currentSupabase))===firstHash){
      baselineHash=firstHash;baselineCount=firstRows.length;parity=true;
      say('Hai nguồn đã có sẵn '+firstRows.length+' hồ sơ TRÙNG KHỚP. Không nạp lại, có thể bắt đầu đo.');
      return;
    }
    if(!window.confirm('NẠP BẢN SAO '+firstRows.length+' HỒ SƠ THẬT vào SUPABASE STAGING?\n'
      +'Firebase hiện tại CHỈ ĐỌC, KHÔNG THAY ĐỔI.\n'
      +'Supabase staging hiện đọc được '+currentSupabase.length+' hồ sơ.\n'
      +'Dữ liệu thật sẽ được lưu vào Supabase staging; chỉ thực hiện một lần.')){
      say('Bạn đã hủy sao chép. Firebase không thay đổi; chưa có phép đo hợp lệ.');
      return;
    }
    say('Đang đối chiếu lần cuối bản sao Firebase rồi nạp Supabase staging…');
    const latestRows=await snap('fb');
    if(!lastMirror||lastMirror.source!==mirrorSnapshot?.source||
      latestRows.length!==firstRows.length||
      await digest(canonical(latestRows))!==firstHash)
      throw new Error('Firebase đã thay đổi trong quá trình xác nhận; chưa nạp.');
    const jwt=await supabase.auth.getAccessToken();
    const response=await fetch(cfg.url+'/rest/v1/rpc/hdnd_stage_mirror_snapshot_for_benchmark',{
      method:'POST',cache:'no-store',
      headers:{apikey:cfg.publishableKey,authorization:'Bearer '+jwt,'content-type':'application/json'},
      body:JSON.stringify({p_rows:latestRows,p_source:lastMirror.source,p_sha256:lastMirror.sha256})
    });
    const result:unknown=await response.json().catch(()=>null);
    if(!response.ok||!result||typeof result!=='object'||!(result as {ok?:boolean}).ok)
      throw new Error('Supabase chưa xác nhận nhập ('+response.status+'): '
        +String((result as {message?:string}|null)?.message??'máy chủ từ chối'));
    if((result as {rows?:number}).rows!==latestRows.length)
      throw new Error('Supabase trả về sai số lượng nhập; cần đối chiếu.');
    const readback=await snap('sp');
    if(readback.length!==latestRows.length||await digest(canonical(readback))!==firstHash)
      throw new Error('Supabase đã nhận nhưng đọc lại chưa trùng 100% nội dung; KHÔNG đo.');
    parity=true;baselineCount=latestRows.length;baselineHash=firstHash;
    say('ĐÃ NẠP VÀ ĐỐI CHIẾU THÀNH CÔNG '+latestRows.length
      +' hồ sơ THẬT. SHA-256 trùng nhau.\n'
      +'Firebase: chỉ đọc, không thay đổi. Supabase staging: đã chứa bản sao.\n'
      +'Bây giờ bạn có thể bấm “Bắt đầu đo”.');
  }catch(e){say('CHƯA HOÀN TẤT BẢN SAO: '+message(e)+'\nKhông kết luận tốc độ hai nguồn.');}
  finally{
    setWorking(false);
    importButton.disabled=!auth.currentUser||parity;
    pctl.disabled=!parity;
  }
})();};
onAuthStateChanged(auth,u=>{
  importButton.disabled=working||!u||parity;
  if(u&&!working)pick<HTMLElement>('progress').textContent='Firebase đã có phiên Google. Chọn đúng tài khoản Google quản trị ở Supabase, rồi nạp 55+ hồ sơ trước khi đo.';
});
cancel.onclick=()=>{aborted=true;pick<HTMLElement>('progress').textContent='Đang ngừng sau yêu cầu đọc hiện tại…';};
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
pctl.onclick=()=>{void run();};
async function run(){
  if(!parity||working)return;
  setWorking(true);aborted=false;samples=[];render();
  const target=Number(pick<HTMLSelectElement>('rounds').value);
  const everyFive=target===720;
  try{
    for(let i=0;i<target&&!aborted;i++){
      if(document.hidden){aborted=true;throw new Error('Tab bị chuyển nền: dừng để không nhầm với phép đo ổn định 5 giây.');}
      const startCycle=performance.now();
      for(const source of (i%2===0?['fb','sp']:['sp','fb']) as Source[]){
        if(aborted)break;
        const t=performance.now();
        try{
          const rows=await snap(source);
          const ms=performance.now()-t;
          const match=rows.length===baselineCount&&await digest(canonical(rows))===baselineHash;
          samples.push({round:i+1,source,ms,rows:rows.length,ok:match,reason:match?'':'Dữ liệu thay đổi hoặc không còn khớp'});
          if(!match){aborted=true;throw new Error('Dữ liệu đã thay đổi trong lúc đo; dừng để tránh kết luận sai.');}
        }catch(e){
          if(samples.at(-1)?.round!==i+1||samples.at(-1)?.source!==source)
            samples.push({round:i+1,source,ms:performance.now()-t,rows:0,ok:false,reason:message(e)});
          aborted=true;throw e;
        }
      }
      render();
      pick<HTMLElement>('progress').textContent='Đã đo '+(i+1)+'/'+target+
        ' lượt hai Cloud ('+samples.filter(x=>x.ok).length+' lượt đọc thành công), không ghi dữ liệu.';
      if(everyFive&&!aborted){
        const remain=5000-(performance.now()-startCycle);
        if(remain>0)await sleep(remain);
      }
    }
    pick<HTMLElement>('progress').textContent=aborted?'Đã ngừng, dữ liệu đo dở có thể tải CSV.':
      'HOÀN THÀNH '+target+' lượt. P50/P95 là thời gian đọc danh sách thật, không phải tốc độ lưu ô.';
  }catch(e){
    pick<HTMLElement>('progress').textContent='DỪNG: '+message(e)+'. Không kết luận nguồn nào nhanh hơn.';
  }finally{setWorking(false);}
}
csv.onclick=()=>{
  if(!samples.length||working)return;
  const head='round,source,ms,rows,ok,reason\n';
  const safe=(s:string)=>String(s).replaceAll('"','""').replace(/[\r\n]+/g,' ');
  const value=head+samples.map(x=>
    [x.round,x.source,x.ms.toFixed(2),x.rows,x.ok,'"'+safe(x.reason)+'"'].join(',')).join('\n')+'\n';
  const blob=new Blob(['\uFEFF'+value],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='HopHDND-Cloud-Real-Parity-Benchmark.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
if(supabase.oauthError)say('Supabase OAuth trả về lỗi: '+supabase.oauthError);
