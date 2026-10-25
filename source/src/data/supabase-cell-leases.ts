import type {EditableField} from '../../shared/types';
import type {SupabaseConnection} from './supabase-repository';

/**
 * Supabase per-tab lease session.
 * SQL RPC checks caller identity, per-field ACL and token on every commit.
 * UI state is advisory: this class never authorizes writes by itself.
 */
export type SupabaseEditorKind='status'|'search'|'short'|'multiline'|'long';
export type SupabaseLease={
  session:string;token:string;expiresAt:string;acquiredAt?:string;
  revision?:number;kind?:SupabaseEditorKind;
};
export interface SupabaseLeaseRpc {
  invoke<T>(fn:string,args:Record<string,unknown>):Promise<T>;
}
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const makeKey=(id:string,field:EditableField)=>id+'|'+field;
export class SupabaseCellLeaseManager {
  private readonly session=crypto.randomUUID();
  private readonly held=new Map<string,{lease:SupabaseLease;timer:ReturnType<typeof setInterval>}>();
  private readonly errors=new Map<string,string>();
  private readonly releasePending=new Set<string>();
  constructor(private readonly rpc:SupabaseLeaseRpc,
    private readonly userScope:()=>string|null,
    private readonly onLost:(id:string,field:EditableField,reason:string)=>void=()=>{}){}
  private readonly draftPrefix='hdnd.supabase.unsaved.v1:';
  private draftKey(id:string,field:EditableField){
    return this.draftPrefix+(this.userScope()??'unknown')+':'+id+':'+field;
  }
  preserveDraft(id:string,field:EditableField,value:unknown):boolean {
    try {localStorage.setItem(this.draftKey(id,field),JSON.stringify({at:Date.now(),value}));return true;}
    catch {return false;}
  }
  recoverDraft(id:string,field:EditableField):string|null {
    try{const saved=JSON.parse(localStorage.getItem(this.draftKey(id,field))||'null');
      return typeof saved?.value==='string'?saved.value:null;}catch{return null;}
  }
  private clearDraft(id:string,field:EditableField){
    try {localStorage.removeItem(this.draftKey(id,field));}catch{/* keep server ACK */}
  }
  has(id:string,field:EditableField){return this.held.has(makeKey(id,field));}
  error(id:string,field:EditableField){return this.errors.get(makeKey(id,field))??null;}
  /** Only proofs actually held by this browser tab can enter SupabaseRepository.save. */
  getLease:SupabaseConnection['getLease']=(id,field)=>{
    const lease=this.held.get(makeKey(id,field))?.lease;
    return lease?{session:lease.session,token:lease.token}:null;
  };
  async acquire(id:string,field:EditableField,kind:SupabaseEditorKind):Promise<boolean>{
    const key=makeKey(id,field);
    if(this.held.has(key))return true;
    const lease=await this.rpc.invoke<SupabaseLease>('hdnd_acquire_cell',{
      p_record_id:id,p_field:field,p_kind:kind,p_session:this.session
    });
    if(!lease||!UUID.test(lease.token)||lease.session!==this.session||
       !Number.isFinite(Date.parse(lease.expiresAt)))throw new Error('Supabase chưa xác nhận khóa ô.');
    const timer=setInterval(()=>{void this.renew(id,field).catch(cause=>{
      const held=this.held.get(key);if(!held)return;
      clearInterval(held.timer);this.held.delete(key);
      const message=cause instanceof Error?cause.message:'Mất khóa ô';
      this.errors.set(key,message);
      this.onLost(id,field,message);
      // IMPORTANT: never clear the local draft upon lease failure.
    });},12000);
    this.held.set(key,{lease,timer});this.errors.delete(key);
    return true;
  }
  async renew(id:string,field:EditableField):Promise<void>{
    const key=makeKey(id,field),entry=this.held.get(key);
    if(!entry)throw new Error('Không còn khóa ô.');
    const update=await this.rpc.invoke<SupabaseLease>('hdnd_renew_cell',{
      p_record_id:id,p_field:field,p_session:entry.lease.session,p_token:entry.lease.token
    });
    if(!update||update.token!==entry.lease.token||
       update.session!==entry.lease.session||!Number.isFinite(Date.parse(update.expiresAt)))
      throw new Error('Khóa ô đã chuyển phiên.');
    entry.lease={...entry.lease,...update};
  }
  async release(id:string,field:EditableField):Promise<void>{
    const key=makeKey(id,field),entry=this.held.get(key);
    if(!entry)return;
    // Drop only local lease. SQL checks token+session, so late release cannot
    // delete a newer session's lock. Draft intentionally preserved.
    clearInterval(entry.timer);this.held.delete(key);
    this.releasePending.add(key);
    try {await this.rpc.invoke<boolean>('hdnd_release_cell',{
      p_record_id:id,p_field:field,p_session:entry.lease.session,p_token:entry.lease.token
    });}
    finally{this.releasePending.delete(key);}
  }
  /** Call only after repository.save returned a verified server ACK. */
  async finish(id:string,field:EditableField):Promise<void>{
    this.clearDraft(id,field);
    await this.release(id,field);
  }
  async cancel(id:string,field:EditableField):Promise<void>{
    await this.release(id,field);
  }
  async dispose():Promise<void>{
    const keys=[...this.held.keys()];
    await Promise.allSettled(keys.map(async key=>{
      const i=key.indexOf('|');if(i<0)return;
      await this.release(key.slice(0,i),key.slice(i+1) as EditableField);
    }));
  }
  activeCount(){return this.held.size;}
  pendingReleases(){return this.releasePending.size;}
}
