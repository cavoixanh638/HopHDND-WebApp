/** Explicit read-only LIVE CLOUD benchmark. Never issues a database write.
 * This page is not the production WebApp. Business values stay in memory:
 * CSV contains timings and hashes only, never actual records or auth tokens.
 */
import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged} from 'firebase/auth';
import {getDatabase} from 'firebase/database';
import {firebaseConfig} from '../data/firebase-config';
import {FirebaseRepository} from '../data/firebase-repository';
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
const firebase=new FirebaseRepository(getDatabase(app),()=>auth.currentUser,()=>({columns:{}}));
const cfg=readSupabasePreviewConfig();
if(!cfg||cfg.url!==HDND_SUPABASE_STAGING_PUBLIC.url)throw new Error('Chỉ chấp nhận Supabase STAGING cố định.');
const supabase=new SupabasePreviewRepository(cfg);
const canonicalFields=['recordId','displayCode','stt','revision','archivedAt',
  'documentKind','content','department','type','partyLevel','progressParty',
  'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader',
  'specificProgress','note','isDropped','partyMeeting','examined'] as const;
const canonical=(items:Item[])=>JSON.stringify([...items].sort((a,b)=>a.recordId.localeCompare(b.recordId))
  .map(row=>canonicalFields.map(k=>row[k]??null)));
async function digest(value:string){
  const data=new TextEncoder().encode(value);
  const sum=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
  return [...sum].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function snap(source:Source){
  if(source==='fb'&&!auth.currentUser)throw new Error('Chưa đăng nhập Google Firebase Cloud.');
  return source==='fb'?firebase.list():supabase.list();
}
const pctl=pick<HTMLButtonElement>('run');
const cancel=pick<HTMLButtonElement>('cancel');
const csv=pick<HTMLButtonElement>('csv');
const check=pick<HTMLButtonElement>('check');
let parity=false,aborted=false,working=false;
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
  pick<HTMLButtonElement>('firebase-login').disabled=value;
  pick<HTMLButtonElement>('supabase-google').disabled=value;
  pick<HTMLSelectElement>('rounds').disabled=value;
  csv.disabled=value||!samples.length;
}
async function checkParity(){
  parity=false;pctl.disabled=true;samples=[];render();
  say('Đang đọc dữ liệu thật từ Firebase và Supabase staging; không ghi…');
  const t0=performance.now();
  try{
    // Supabase permission check is mandatory. No reliance on Firebase auth JWT.
    const access=await supabase.accessState();
    const fbStart=performance.now();
    const fbRows=await snap('fb');
    const fbMs=performance.now()-fbStart;
    const spStart=performance.now();
    const spRows=await snap('sp');
    const spMs=performance.now()-spStart;
    const [fbHash,spHash]=await Promise.all([digest(canonical(fbRows)),digest(canonical(spRows))]);
    baselineCount=fbRows.length;baselineHash=fbHash;
    parity=fbRows.length>=50&&fbRows.length===spRows.length&&fbHash===spHash;
    say('Firebase thật: '+fbRows.length+' dòng / '+fbMs.toFixed(1)+' ms\n'
      +'Supabase staging: '+spRows.length+' dòng / '+spMs.toFixed(1)+' ms\n'
      +'SHA-256 Firebase: '+fbHash+'\nSHA-256 Supabase: '+spHash+'\n'
      +'Supabase Google-admin: '+(access.isAdmin?'ĐÃ XÁC MINH':'CHƯA XÁC MINH')+'\n'
      +(parity?'ĐẠT: hai nguồn có đủ 50+ hồ sơ và dữ liệu trùng hoàn toàn. Có thể đo.':
        'CHẶN ĐO: cần bản sao thật đầy đủ, cùng nội dung/revision trên Supabase. 6 dòng QA không hợp lệ.')+'\n'
      +'Thời gian xác minh tổng: '+(performance.now()-t0).toFixed(0)+' ms');
  }catch(e){say('Không xác minh được nguồn, chưa thể đo: '+message(e));}
  pctl.disabled=!parity;
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
onAuthStateChanged(auth,u=>{
  if(u&&!working)pick<HTMLElement>('progress').textContent='Firebase có phiên đăng nhập Google; nhấn “Kiểm tra cùng dữ liệu” trước khi đo.';
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
  const safe=s=>String(s).replaceAll('"','""').replace(/[\r\n]+/g,' ');
  const value=head+samples.map(x=>
    [x.round,x.source,x.ms.toFixed(2),x.rows,x.ok,'"'+safe(x.reason)+'"'].join(',')).join('\n')+'\n';
  const blob=new Blob(['\uFEFF'+value],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='HopHDND-Cloud-Real-Parity-Benchmark.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
if(supabase.oauthError)say('Supabase OAuth trả về lỗi: '+supabase.oauthError);
