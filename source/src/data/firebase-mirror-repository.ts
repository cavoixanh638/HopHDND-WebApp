import {get,onValue,ref,type Database} from 'firebase/database';
import type {Item,AuditEntry,Patch,SaveResult} from '../../shared/types';
import type {Repository} from './repository';
import type {SheetConfig} from './sheet-config';
import {markStartup} from './startup-timings';
import {loadSessionMirror,storeSessionMirror} from './firebase-snapshot-cache';

/** Immutable server-published snapshot. No browser write path. */
export interface ExcelMirrorSnapshot {
  schemaVersion:1;source:string;syncedAt:string;sourceModifiedAt:string;sha256:string;rows:Item[];
}
export const mirrorPath=(source:Pick<SheetConfig,'spreadsheetId'|'gid'>)=>
  'hdnd/mirrors/'+source.spreadsheetId+'/'+source.gid;
export function validateExcelMirror(value:unknown,source:Pick<SheetConfig,'spreadsheetId'|'gid'>):ExcelMirrorSnapshot {
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new Error('Database chưa có bản sao Excel được xác nhận.');
  const raw=value as Partial<ExcelMirrorSnapshot>;
  if(raw.schemaVersion!==1||raw.source!==source.spreadsheetId+':'+source.gid||
    !Array.isArray(raw.rows)||raw.rows.length===0||raw.rows.length>5000||
    typeof raw.syncedAt!=='string'||!Number.isFinite(Date.parse(raw.syncedAt))||
    typeof raw.sourceModifiedAt!=='string'||!Number.isFinite(Date.parse(raw.sourceModifiedAt))||
    typeof raw.sha256!=='string'||!/^[a-f0-9]{64}$/.test(raw.sha256))
    throw new Error('Bản sao Database sai nguồn/phiên bản; không đổi sang dữ liệu rỗng.');
  const ids=new Set<string>();
  for(const row of raw.rows as Item[]){
    if(!row||typeof row!=='object'||typeof row.recordId!=='string'||
      !row.recordId.startsWith(raw.source+':row:')||
      !/^[-\w]{10,200}:\d+:row:\d+$/.test(row.recordId)||
      ids.has(row.recordId)||typeof row.displayCode!=='string'||!row.displayCode.trim()||
      typeof row.stt!=='number'||!Number.isInteger(row.stt)||
      !['BC','NQ','UNCLASSIFIED'].includes(row.documentKind)||
      typeof row.isDropped!=='boolean'||typeof row.revision!=='number')
      throw new Error('Bản sao Database có hàng lỗi/trùng ID; giữ nguyên nguồn trước.');
    ids.add(row.recordId);
    for(const field of ['content','department','type','partyLevel','progressParty','progressBuild',
      'progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note'] as const)
      if(typeof row[field]!=='string')throw new Error('Bản sao Database thiếu cột Excel.');
  }
  return raw as ExcelMirrorSnapshot;
}
export class FirebaseMirrorRepository implements Repository {
  readonly sourceKind='firebase' as const;
  readonly readOnly=true;
  readonly subscribeInitial=true;
  readonly canDraft:boolean;
  snapshot:ExcelMirrorSnapshot|null=null;
  liveConfirmed=false;
  constructor(private readonly database:Database,private readonly source:SheetConfig,
    private readonly viewerUid:()=>string|null=()=>null,canDraft=true,
    private readonly sessionCacheEnabled=true){this.canDraft=canDraft;}
  cachedRows():Item[]|null{
    if(!this.sessionCacheEnabled)return null;
    const uid=this.viewerUid();
    if(!uid)return null;
    const snapshot=loadSessionMirror(uid,this.source);
    if(!snapshot)return null;
    this.snapshot=snapshot;
    markStartup('data-cache-hydrated',snapshot.rows.length+' dòng (chưa xác nhận trực tuyến)');
    return snapshot.rows;
  }
  private parse(raw:unknown) {
    const verified=validateExcelMirror(raw,this.source);
    this.snapshot=verified;return verified.rows;
  }
  async list():Promise<Item[]> {
    return this.parse((await get(ref(this.database,mirrorPath(this.source)))).val());
  }
  subscribe(next:(items:Item[])=>void,error:(cause:Error)=>void) {
    markStartup('data-subscribe');
    return onValue(ref(this.database,mirrorPath(this.source)),
      snap=>{try{const rows=this.parse(snap.val());
        this.liveConfirmed=true;
        const uid=this.viewerUid();
        if(uid&&this.snapshot&&this.sessionCacheEnabled)storeSessionMirror(uid,this.source,this.snapshot);
        markStartup('data-first',rows.length+' dòng (đã xác nhận trực tuyến)');next(rows);
      }catch(cause){error(cause as Error);}},
      cause=>error(cause));
  }
  async save(_patches:Patch[]):Promise<SaveResult[]> {
    throw new Error('Database là bản sao chỉ đọc; chỉ Excel gốc được cập nhật.');
  }
  async history(_recordId:string):Promise<AuditEntry[]> {return [];}
}
