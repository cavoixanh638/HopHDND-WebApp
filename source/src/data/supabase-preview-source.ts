/**
 * SAFE FIRST INCREMENT: Supabase Cloud staging is READ ONLY in the WebApp.
 * Auth is a separate short-lived anonymous Supabase session. Not Firebase Auth.
 * This does not claim to implement Supabase Realtime / Google OAuth / editing.
 * No service_role key, no implicit source fallback, no cross-database writes.
 */
import type {AuditEntry,Item,Patch,SaveResult} from '../../shared/types';
import type {Repository} from './repository';
import {SupabaseRepository} from './supabase-repository';

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
export function readSupabasePreviewConfig():SupabasePublicConfig|null{
  return cleanConfig(
    String(import.meta.env.VITE_HDND_SUPABASE_URL??''),
    String(import.meta.env.VITE_HDND_SUPABASE_PUBLISHABLE_KEY??'')
  );
}
export function validateSupabasePreviewConfig(url:string,key:string){
  return cleanConfig(url,key);
}
/** Session is browser-tab scoped; never reuses a Firebase access token. */
export class SupabaseAnonymousPreviewAuth {
  private pending:Promise<string>|null=null;
  private readonly storageKey:string;
  private cached:AuthSession|null=null;
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
  getAccessToken=():Promise<string>=>{
    if(!this.pending)this.pending=this.renewOrLogin().finally(()=>{this.pending=null;});
    return this.pending;
  };
}

export class SupabasePreviewRepository implements Repository {
  readonly sourceKind='supabase' as const;
  readonly readOnly=true;
  readonly canDraft=false;
  readonly subscribeInitial=true;
  private readonly backing:SupabaseRepository;
  constructor(config:SupabasePublicConfig,fetcher:typeof fetch=fetch,
    storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null){
    const auth=new SupabaseAnonymousPreviewAuth(config,fetcher,storage);
    this.backing=new SupabaseRepository({
      ...config,
      getAccessToken:auth.getAccessToken,
      getLease:()=>null,
      fetcher,
      // Polling is explicitly temporary QA behavior; NOT mislabeled as realtime.
      onBusinessChange:change=>{
        const timer=setInterval(()=>{
          if(typeof document==='undefined'||!document.hidden)change();
        },15000);
        return()=>clearInterval(timer);
      }
    });
  }
  list():Promise<Item[]>{return this.backing.list();}
  history(id:string):Promise<AuditEntry[]>{return this.backing.history(id);}
  subscribe(next:(items:Item[])=>void,error:(cause:Error)=>void):()=>void{
    return this.backing.subscribe(next,error);
  }
  save(_patches:Patch[]):Promise<SaveResult[]>{
    return Promise.reject(new Error('Supabase staging hiện chỉ được đọc; chưa phát hành chức năng ghi.'));
  }
}
