/**
 * SAFE FIRST INCREMENT: Supabase Cloud staging is READ ONLY in the WebApp.
 * Auth is a separate short-lived anonymous Supabase session. Not Firebase Auth.
 * This does not claim to implement Supabase Realtime / Google OAuth / editing.
 * No service_role key, no implicit source fallback, no cross-database writes.
 */
import type {AuditEntry,Item,Patch,SaveResult} from '../../shared/types';
import type {Repository} from './repository';
import {SupabaseRepository} from './supabase-repository';
import {SupabaseCellLeaseManager} from './supabase-cell-leases';
import {SupabasePostgresRealtime} from './supabase-postgres-realtime';
import type {CellPermissions} from './firebase-repository';

export interface SupabasePublicConfig {
  url:string;
  publishableKey:string;
}
type AuthSession={access_token:string;refresh_token:string;expires_at:number};
const MAX_WAIT_BEFORE_REFRESH=60;
function cleanConfig(url:string,key:string):SupabasePublicConfig|null{
  if(!url||!key)return null;
  try {
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||
      parsed.pathname!=='/'||parsed.search||parsed.hash) return null;
    if(!key.startsWith('sb_publishable_')||/\s/.test(key))return null;
    return {url:parsed.origin,publishableKey:key};
  }catch{return null;}
}
/** Explicit build-time, publicly safe settings. Missing configuration is never silently replaced. */
// This is an explicitly PUBLIC, revocable staging API key; never a secret,
// service_role or authenticated user's session. All rows still require RLS + JWT.
// Cloud project is fixed to the standalone QA environment (NOT production).
export const HDND_SUPABASE_STAGING_PUBLIC={
  url:'https://uguhyunuzsdrkykqgdmq.supabase.co',
  publishableKey:'sb_publishable_BEsiC_qU_lB__vjNiJxPeA_-9GBDhs3'
} as const;
export function readSupabasePreviewConfig():SupabasePublicConfig|null{
  const configured=cleanConfig(
    String(import.meta.env.VITE_HDND_SUPABASE_URL??''),
    String(import.meta.env.VITE_HDND_SUPABASE_PUBLISHABLE_KEY??'')
  );
  return configured??cleanConfig(HDND_SUPABASE_STAGING_PUBLIC.url,
    HDND_SUPABASE_STAGING_PUBLIC.publishableKey);
}
export function validateSupabasePreviewConfig(url:string,key:string){
  return cleanConfig(url,key);
}
/** Optional per-tab QA configuration, never the privileged service key.
 * This allows operators to choose Firebase/Supabase without rebuilding Pages.
 */
const TAB_CONFIG_KEY='hdnd.supabase.staging.public-config.v1';
export function readSupabaseTabConfig(storage:Pick<Storage,'getItem'>|null=
  typeof sessionStorage==='undefined'?null:sessionStorage):SupabasePublicConfig|null{
  try {
    const saved=storage?.getItem(TAB_CONFIG_KEY);
    if(!saved)return null;
    const raw:unknown=JSON.parse(saved);
    if(!raw||typeof raw!=='object')return null;
    const cfg=raw as Record<string,unknown>;
    return cleanConfig(String(cfg.url??''),String(cfg.publishableKey??''));
  }catch{return null;}
}
export function saveSupabaseTabConfig(config:SupabasePublicConfig,
  storage:Pick<Storage,'setItem'>|null=
    typeof sessionStorage==='undefined'?null:sessionStorage):boolean{
  const valid=cleanConfig(config.url,config.publishableKey);
  if(!valid||!storage)return false;
  try{storage.setItem(TAB_CONFIG_KEY,JSON.stringify(valid));return true;}
  catch{return false;}
}
/** Session is browser-tab scoped; never reuses a Firebase access token. */
export class SupabaseAnonymousPreviewAuth {
  private pending:Promise<string>|null=null;
  private readonly storageKey:string;
  private cached:AuthSession|null=null;
  private blockedUntil=0;
  private lastAuthError='';
  constructor(private readonly config:SupabasePublicConfig,
    private readonly fetcher:typeof fetch=fetch,
    private readonly storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null=
      typeof sessionStorage==='undefined'?null:sessionStorage){
    this.storageKey='hdnd.supabase.qa.session.v1:'+new URL(config.url).hostname;
    try {
      const value=this.storage?.getItem(this.storageKey);
      if(value){
        const raw:unknown=JSON.parse(value);
        if(this.isSession(raw))this.cached=raw;
      }
    }catch{/* invalid saved session is ignored; never use Firebase credentials */}
  }
  private isSession(value:unknown):value is AuthSession{
    if(!value||typeof value!=='object')return false;
    const s=value as Partial<AuthSession>;
    return typeof s.access_token==='string'&&s.access_token.length>10&&
      typeof s.refresh_token==='string'&&s.refresh_token.length>5&&
      typeof s.expires_at==='number'&&Number.isFinite(s.expires_at);
  }
  private async post(relative:string,body:unknown):Promise<AuthSession>{
    const resp=await this.fetcher(this.config.url+'/auth/v1/'+relative,{
      method:'POST',
      headers:{apikey:this.config.publishableKey,'content-type':'application/json'},
      body:JSON.stringify(body)
    });
    const result:unknown=await resp.json().catch(()=>null);
    if(!resp.ok){
      const reason=result&&typeof result==='object'?
        String((result as Record<string,unknown>).msg??(result as Record<string,unknown>).message??''):''; 
      throw new Error('Không đăng nhập được Supabase staging'+(reason?': '+reason:'; kiểm tra Anonymous Auth trong dashboard.'));
    }
    if(!result||typeof result!=='object')throw new Error('Phiên Supabase không hợp lệ.');
    const o=result as Record<string,unknown>;
    const value={access_token:o.access_token,refresh_token:o.refresh_token,
      expires_at:Math.floor(Date.now()/1000)+Number(o.expires_in)};
    if(!this.isSession(value)||!Number.isFinite(o.expires_in)||Number(o.expires_in)<1)
      throw new Error('Supabase chưa cấp phiên đã xác minh.');
    return value;
  }
  private async renewOrLogin():Promise<string>{
    const now=Date.now()/1000;
    if(this.cached&&this.cached.expires_at>now+MAX_WAIT_BEFORE_REFRESH)
      return this.cached.access_token;
    const before=this.cached;
    // Rotated refresh tokens are never replaced by a second anonymous account
    // after a transient refresh/network failure. Fail closed instead.
    const session=before?
      await this.post('token?grant_type=refresh_token',{refresh_token:before.refresh_token}):
      await this.post('signup',{data:{},gotrue_meta_security:{}});
    this.cached=session;
    try{this.storage?.setItem(this.storageKey,JSON.stringify(session));}catch{/* RAM fallback */}
    return session.access_token;
  }
  /** Redirect with an unpredictable, per-tab state. The Google provider must be
   * manually enabled in Supabase Dashboard, with an allowlisted redirect URL.
   * Never pass Firebase credentials or Google client secrets through this app.
   */
  startGoogleSignIn():void {
    if(typeof window==='undefined')throw new Error('Google OAuth requires a browser.');
    if(!this.storage)throw new Error('Bật lưu phiên trình duyệt trước khi đăng nhập Google.');
    const state=crypto.randomUUID();
    const returnTo=new URL(window.location.href);
    if(returnTo.protocol!=='https:'&&returnTo.hostname!=='localhost'&&returnTo.hostname!=='127.0.0.1')
      throw new Error('Google OAuth chỉ được phép qua HTTPS hoặc localhost.');
    returnTo.hash='';
    returnTo.searchParams.set('hdnd_supabase_auth',state);
    this.storage.setItem(this.storageKey+':oauth_state',state);
    const target=new URL(this.config.url+'/auth/v1/authorize');
    target.searchParams.set('provider','google');
    target.searchParams.set('redirect_to',returnTo.toString());
    window.location.assign(target.toString());
  }
  /** Process only a verified same-tab OAuth return; never accept forged hash tokens. */
  completeGoogleRedirect():boolean {
    if(typeof window==='undefined')return false;
    const current=new URL(window.location.href);
    const state=current.searchParams.get('hdnd_supabase_auth');
    if(!state)return false;
    const expected=this.storage?.getItem(this.storageKey+':oauth_state');
    // Strip auth tokens from the URL in ALL outcomes, including invalid state.
    const hash=new URLSearchParams(current.hash.startsWith('#')?current.hash.slice(1):current.hash);
    current.searchParams.delete('hdnd_supabase_auth');current.hash='';
    window.history.replaceState(window.history.state,'',current.toString());
    if(!expected||state!==expected){
      this.clearSession();
      throw new Error('Supabase OAuth state không khớp; từ chối phiên đăng nhập.');
    }
    this.storage?.removeItem(this.storageKey+':oauth_state');
    if(hash.has('error'))throw new Error('Google OAuth bị từ chối: '+String(hash.get('error_description')??hash.get('error')));
    const expires=Number(hash.get('expires_in'));
    const session={access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),
      expires_at:Math.floor(Date.now()/1000)+expires};
    if(!this.isSession(session)||!Number.isFinite(expires)||expires<=0)
      throw new Error('Google OAuth không cấp cặp token hợp lệ; từ chối phiên.');
    this.cached=session;this.blockedUntil=0;this.lastAuthError='';
    try{this.storage?.setItem(this.storageKey,JSON.stringify(session));}catch{/* in-memory only */}
    return true;
  }
  clearSession():void {
    this.cached=null;this.blockedUntil=0;this.lastAuthError='';
    try{this.storage?.removeItem(this.storageKey);this.storage?.removeItem(this.storageKey+':oauth_state');}catch{}
  }
  getAccessToken=():Promise<string>=>{
    if(!this.pending&&Date.now()<this.blockedUntil)
      return Promise.reject(new Error(this.lastAuthError||'Supabase Auth tạm không khả dụng.'));
    if(!this.pending)this.pending=this.renewOrLogin().then(token=>{
      this.lastAuthError='';this.blockedUntil=0;return token;
    }).catch(error=>{
      this.lastAuthError=error instanceof Error?error.message:'Supabase Auth không khả dụng.';
      // Prevent auth signup flooding when anonymous sign-in has not been enabled.
      // Retain the previous refresh token; never silently swap accounts.
      this.blockedUntil=Date.now()+(this.cached?3000:60000);
      throw error;
    }).finally(()=>{this.pending=null;});
    return this.pending;
  };
}

export interface SupabaseAccessState {
  userId:string;isAdmin:boolean;aclRevision:number;rights:CellPermissions;
  controlRevision:number;mode:'OPEN'|'DRAINING'|'FROZEN';
  guestEditingLocked:boolean;epoch:number;deadline:string|null;
}

export class SupabasePreviewRepository implements Repository {
  readonly sourceKind='supabase' as const;
  get readOnly(){return !this.verifiedWrites;}
  get canDraft(){return this.verifiedWrites;}
  private verifiedWrites=false;
  readonly leaseManager:SupabaseCellLeaseManager;
  readonly auth:SupabaseAnonymousPreviewAuth;
  readonly oauthError:string|null;
  readonly subscribeInitial=true;
  private readonly backing:SupabaseRepository;
  private readonly fetcher:typeof fetch;
  private readonly config:SupabasePublicConfig;
  constructor(config:SupabasePublicConfig,fetcher:typeof fetch=fetch,
    storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null){
    this.config=config;this.fetcher=fetcher;
    this.auth=new SupabaseAnonymousPreviewAuth(config,fetcher,storage);
    let oauthIssue:string|null=null;
    try{this.auth.completeGoogleRedirect();}catch(error){
      oauthIssue=error instanceof Error?error.message:'Không xác thực được phản hồi Google.';
    }
    this.oauthError=oauthIssue;
    this.leaseManager=new SupabaseCellLeaseManager({invoke:(fn,args)=>this.rpc(fn,args)},()=>this.lastAccess?.userId??null);
    this.backing=new SupabaseRepository({
      ...config,
      getAccessToken:this.auth.getAccessToken,
      getLease:this.leaseManager.getLease,
      fetcher,
      // Native WebSocket invalidations with authenticated REST readback.
      // 15-second REST refresh remains the fail-safe when Realtime is unavailable.
      onBusinessChange:(change,failed)=>
        new SupabasePostgresRealtime(config,this.auth.getAccessToken,change,failed).start()
    });
  }
  private lastAccess:SupabaseAccessState|null=null;
  private async rpc<T>(fn:string,args:Record<string,unknown>):Promise<T>{
    if(!/^hdnd_[a-z_]+$/.test(fn))throw new Error('RPC name không hợp lệ.');
    const token=await this.auth.getAccessToken();
    const response=await this.fetcher(this.config.url+'/rest/v1/rpc/'+fn,{
      method:'POST',headers:{apikey:this.config.publishableKey,
        authorization:'Bearer '+token,'content-type':'application/json'},
      body:JSON.stringify(args)
    });
    const value:unknown=await response.json().catch(()=>null);
    if(!response.ok){const err=value&&typeof value==='object'?value as Record<string,unknown>:{};
      throw new Error('Supabase RPC: '+String(err.message??response.status));}
    return value as T;
  }
  async accessState():Promise<SupabaseAccessState>{
    if(this.oauthError)throw new Error(this.oauthError);
    const raw=await this.rpc<SupabaseAccessState>('hdnd_access_state',{});
    if(!raw||typeof raw.userId!=='string'||typeof raw.isAdmin!=='boolean'||
      typeof raw.guestEditingLocked!=='boolean'||
      !['OPEN','DRAINING','FROZEN'].includes(raw.mode)||
      !raw.rights||typeof raw.rights!=='object')throw new Error('Quyền Supabase trả về không hợp lệ.');
    this.lastAccess=raw;
    return raw;
  }
  async savePermissions(next:CellPermissions,expectedRevision:number):Promise<number>{
    if(!this.lastAccess?.isAdmin)throw new Error('Supabase chưa xác minh quyền quản trị.');
    const normalized={columns:next.columns??{},rows:next.rows??{},cells:next.cells??{}};
    const revision=await this.rpc<number>('hdnd_set_permissions',{
      p_expected:expectedRevision,p_rights:normalized
    });
    if(!Number.isSafeInteger(revision)||revision<=expectedRevision)
      throw new Error('Supabase chưa xác nhận phiên bản quyền đã lưu.');
    return revision;
  }
  async pauseGuests(expectedRevision:number,locked:boolean):Promise<number>{
    if(!this.lastAccess?.isAdmin)throw new Error('ADMIN_REQUIRED');
    const revision=await this.rpc<number>('hdnd_guest_pause',{
      p_expected:expectedRevision,p_locked:locked
    });
    if(!Number.isSafeInteger(revision)||revision<=expectedRevision)
      throw new Error('Máy chủ chưa xác nhận trạng thái khóa khách.');
    return revision;
  }
  async transitionFreeze(expectedRevision:number,next:'OPEN'|'DRAINING'|'FROZEN',
    force=false):Promise<{mode:string;revision:number}>{
    if(!this.lastAccess?.isAdmin)throw new Error('ADMIN_REQUIRED');
    const ack=await this.rpc<{mode:string;revision:number}>('hdnd_freeze_transition',{
      p_expected:expectedRevision,p_next:next,p_force:force
    });
    if(ack?.mode!==next||!Number.isSafeInteger(ack.revision)||ack.revision<=expectedRevision)
      throw new Error('Máy chủ chưa xác nhận trạng thái đóng băng.');
    return ack;
  }
  /** UI control only: server independently validates every subsequent SQL write. */
  setVerifiedWriteMode(enabled:boolean):void{
    const a=this.lastAccess;
    const draining=!!a&&a.mode==='DRAINING'&&this.leaseManager.activeCount()>0&&
      !!a.deadline&&Date.now()<Date.parse(a.deadline);
    this.verifiedWrites=enabled&&!!a&&(a.mode==='OPEN'||draining)&&
      (!a.guestEditingLocked||a.isAdmin);
  }
  list():Promise<Item[]>{return this.backing.list();}
  history(id:string):Promise<AuditEntry[]>{return this.backing.history(id);}
  subscribe(next:(items:Item[])=>void,error:(cause:Error)=>void):()=>void{
    return this.backing.subscribe(next,error);
  }
  save(patches:Patch[]):Promise<SaveResult[]>{
    if(!this.verifiedWrites)return Promise.reject(new Error('Supabase staging chỉ được đọc cho đến khi máy chủ xác nhận quyền chỉnh sửa trong phiên này.'));
    return this.backing.save(patches);
  }
}
