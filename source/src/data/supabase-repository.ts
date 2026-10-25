/**
 * Supabase PostgreSQL adapter for HopHDND. STAGING ONLY until all release gates pass.
 * No supabase-js dependency here: Auth and the Postgres Changes connection are
 * injected by a controller. This file never embeds project keys or bypasses RLS.
 */
import type {AuditEntry,EditableField,Item,Patch,SaveResult,Changes} from '../../shared/types';
import type {Repository} from './repository';
import {EDITABLE_FIELDS,validateChanges} from '../domain/items';

export interface SupabaseConnection {
  url:string;
  /** Supabase publishable / anon key, NEVER a service_role or secret key. */
  publishableKey:string;
  /** Live JWT obtained from Supabase Auth; no cached Firebase token. */
  getAccessToken:()=>Promise<string>;
  /** Returns an unsubscribe function for Postgres Changes hdnd_items only. */
  onBusinessChange:(change:()=>void,failed:(error:Error)=>void)=>()=>void;
  /** Per-tab, per-field lock proof owned by the active Supabase identity. */
  getLease:(recordId:string,field:EditableField)=>{session:string;token:string}|null;
  fetcher?:typeof fetch;
}

type DbItem={record_id:string;display_code:string;stt:number;fields:unknown;
  revision:number;archived_at:string|null;};
type DbHistory={operation_id:string;record_id:string;at:string;changes:Changes;old_values:Changes};
type RpcSaved={ok:boolean;item:unknown;replay?:boolean};
type SupabaseError={message?:string;code?:string;details?:string};

const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const FIELD_SET=new Set<string>(EDITABLE_FIELDS);
const isObject=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);

/** Fail closed: server payload can never alter record IDs or UI metadata via fields JSON. */
export function parseSupabaseItem(raw:unknown):Item {
  if(!isObject(raw))throw new Error('Dòng Supabase không hợp lệ.');
  const row=raw as unknown as DbItem;
  if(typeof row.record_id!=='string'||!/^[A-Za-z0-9_:-]{1,200}$/.test(row.record_id)
    ||typeof row.display_code!=='string'||!row.display_code||row.display_code.length>100
    ||!Number.isSafeInteger(row.stt)||row.stt<1
    ||!Number.isSafeInteger(row.revision)||row.revision<1
    ||!(row.archived_at===null||typeof row.archived_at==='string')
    ||!isObject(row.fields))throw new Error('Thiếu ID/phiên bản hoặc cấu trúc dòng.');
  const clean:Record<string,unknown>={};
  for(const field of EDITABLE_FIELDS){
    if(!(field in row.fields))throw new Error('Thiếu trường dữ liệu: '+field);
    clean[field]=row.fields[field];
  }
  if(validateChanges(clean as Changes))throw new Error('Giá trị nguồn Supabase không hợp lệ.');
  return {
    ...(clean as unknown as Omit<Item,'recordId'|'displayCode'|'stt'|'revision'|'archivedAt'>),
    recordId:row.record_id,displayCode:row.display_code,stt:row.stt,
    revision:row.revision,archivedAt:row.archived_at
  };
}

export class SupabaseRepository implements Repository {
  readonly sourceKind='supabase' as const;
  readonly canDraft=true;
  readonly readOnly=false;
  readonly subscribeInitial=true;
  private readonly base:string;
  constructor(private readonly connection:SupabaseConnection){
    const u=new URL(connection.url);
    if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co'))
      throw new Error('Cấu hình staging Supabase không hợp lệ.');
    if(!connection.publishableKey||/^sb_secret_|^service_role/.test(connection.publishableKey))
      throw new Error('Không được dùng khóa bí mật trong trình duyệt.');
    this.base=u.origin+'/rest/v1';
  }
  private async request<T>(relative:string,options:{method?:string;body?:unknown}={}):Promise<T> {
    const jwt=await this.connection.getAccessToken();
    if(!jwt)throw new Error('Chưa xác thực Supabase; không đọc/ghi dữ liệu.');
    const http=this.connection.fetcher??fetch;
    const response=await http(this.base+relative,{
      method:options.method??'GET',
      headers:{
        apikey:this.connection.publishableKey,
        authorization:'Bearer '+jwt,
        accept:'application/json',
        ...(options.body!==undefined?{'content-type':'application/json'}:{})
      },
      ...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})
    });
    const text=await response.text();
    let result:unknown;
    try{result=text?JSON.parse(text):null;}catch{throw new Error('Supabase trả về dữ liệu không hợp lệ.');}
    if(!response.ok){
      const e=(isObject(result)?result:{}) as SupabaseError;
      throw new Error('Supabase '+response.status+': '+String(e.message??e.code??'Lỗi truy cập'));
    }
    return result as T;
  }
  async list():Promise<Item[]>{
    const rows=await this.request<DbItem[]>('/hdnd_items?select=record_id,display_code,stt,fields,revision,archived_at&order=stt.asc,record_id.asc');
    if(!Array.isArray(rows))throw new Error('Danh sách Supabase phải là mảng.');
    return rows.map(parseSupabaseItem).sort((a,b)=>a.stt-b.stt||a.recordId.localeCompare(b.recordId));
  }
  subscribe(next:(items:Item[])=>void,error:(cause:Error)=>void):()=>void{
    let active=true;
    let sequence=0;
    // Initial read and changes use the same callback and are verified with Auth JWT.
    // Dropping stale responses avoids an older snapshot overwriting a newer update.
    const refresh=()=>{const ticket=++sequence;
      void this.list().then(rows=>{if(active&&ticket===sequence)next(rows);})
        .catch(cause=>{if(active)error(cause as Error);});};
    const stop=this.connection.onBusinessChange(refresh,error);
    refresh();
    return ()=>{active=false;sequence++;stop();};
  }
  async save(patches:Patch[]):Promise<SaveResult[]>{
    const results:SaveResult[]=[];
    for(const patch of patches){
      try{
        if(!patch||!UUID.test(patch.operationId)||!patch.recordId)
          throw new Error('Mã thao tác/ID không hợp lệ.');
        const issue=validateChanges(patch.changes);if(issue)throw new Error(issue);
        const fields=Object.keys(patch.changes) as EditableField[];
        if(!fields.length||fields.some(f=>!FIELD_SET.has(f)||!(f in patch.baseValues)))
          throw new Error('Thiếu giá trị gốc hoặc trường không hợp lệ.');
        const tokens:Record<string,string>={};
        let session:string|undefined;
        for(const field of fields){
          const proof=this.connection.getLease(patch.recordId,field);
          if(!proof||!UUID.test(proof.token)||!UUID.test(proof.session))
            throw new Error('Không có khóa ô Supabase hợp lệ: '+field);
          if(session&&session!==proof.session)throw new Error('Phiên khóa ô không nhất quán.');
          session=proof.session;tokens[field]=proof.token;
        }
        const confirmed=await this.request<RpcSaved>('/rpc/hdnd_save_cell_changes',{method:'POST',body:{
          p_record_id:patch.recordId,p_session:session,p_operation_id:patch.operationId,
          p_base:patch.baseValues,p_changes:patch.changes,p_tokens:tokens}});
        if(!confirmed?.ok||!isObject(confirmed.item))
          throw new Error('Máy chủ chưa xác nhận lưu.');
        const source=confirmed.item;
        // SQL save RPC returns the canonical Item contract, unlike table SELECT.
        const candidate={
          record_id:source.recordId,display_code:source.displayCode,
          stt:source.stt,revision:source.revision,archived_at:source.archivedAt,
          fields:source
        };
        const item=parseSupabaseItem(candidate);
        if(item.recordId!==patch.recordId||
          fields.some(f=>item[f]!==patch.changes[f]))
          throw new Error('Readback chưa khớp giá trị đã gửi.');
        results.push({recordId:patch.recordId,ok:true,item});
      }catch(cause){
        const message=cause instanceof Error?cause.message:'Lỗi không xác định';
        results.push({recordId:patch.recordId,ok:false,
          error:/CONFLICT|_BUSY|LEASE_LOST|EXPIRED|DRAINING|FROZEN/.test(message)?'CONFLICT':'VALIDATION',
          message:'Chưa xác nhận đã lưu: '+message+'. Giữ nguyên nháp trên máy để đối chiếu.'});
      }
    }
    return results;
  }
  async history(recordId:string):Promise<AuditEntry[]>{
    if(!/^[A-Za-z0-9_:-]{1,200}$/.test(recordId))throw new Error('ID không hợp lệ.');
    const rows=await this.request<DbHistory[]>('/hdnd_audit?record_id=eq.'+
      encodeURIComponent(recordId)+'&select=operation_id,record_id,at,changes,old_values&order=at.asc');
    if(!Array.isArray(rows))throw new Error('Lịch sử Supabase không hợp lệ.');
    return rows.map(row=>({
      operationId:row.operation_id,recordId:row.record_id,at:row.at,
      changes:row.changes,oldValues:row.old_values
    }));
  }
}
