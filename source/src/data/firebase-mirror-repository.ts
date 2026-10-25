import {get,onValue,ref,runTransaction,serverTimestamp,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item,AuditEntry,EditableField,Patch,SaveResult} from '../../shared/types';
import {validateChanges} from '../domain/items';
import {firebaseAdmin,mayEdit,type CellPermissions} from './firebase-repository';
import {applyMirrorEdits,mirrorEditsPath,mirrorEditKey,parseMirrorEdits,type MirrorEdits} from './mirror-edit-overlay';
import type {Repository} from './repository';
import type {SheetConfig} from './sheet-config';
import {markStartup} from './startup-timings';
import {loadSessionMirror,storeSessionMirror} from './firebase-snapshot-cache';
import {subscribeMirrorStream} from './authenticated-mirror-stream';

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
  readonly subscribeInitial=true;
  readonly canDraft:boolean;
  readonly readOnly:boolean;
  checkAssignment?:(item:Item)=>string;
  snapshot:ExcelMirrorSnapshot|null=null;
  liveConfirmed=false;
  private baseRows:Item[]=[];
  private edits:MirrorEdits={};
  constructor(private readonly database:Database,private readonly source:SheetConfig,
    private readonly viewerUid:()=>string|null=()=>null,canDraft=true,
    private readonly sessionCacheEnabled=true,
    private readonly user:()=>User|null=()=>null,
    private readonly permissions:()=>CellPermissions=()=>({columns:{}}),
    private readonly canWrite:()=>boolean=()=>false) {
    this.canDraft=canDraft;
    this.readOnly=!canDraft;
  }
  cachedRows():Item[]|null{
    if(!this.sessionCacheEnabled)return null;
    const uid=this.viewerUid();
    if(!uid)return null;
    const snapshot=loadSessionMirror(uid,this.source);
    if(!snapshot)return null;
    this.snapshot=snapshot;
    markStartup('data-cache-hydrated',snapshot.rows.length+' dòng (chưa xác nhận trực tuyến)');
    return snapshot.rows; // provisional cache never includes unconfirmed edits
  }
  private parse(raw:unknown) {
    const verified=validateExcelMirror(raw,this.source);
    this.snapshot=verified;
    this.baseRows=verified.rows;
    return verified.rows;
  }
  private combined():Item[]{
    return applyMirrorEdits(this.baseRows,this.source,this.edits);
  }
  async list():Promise<Item[]> {
    const [snapshot,edits]=await Promise.all([
      get(ref(this.database,mirrorPath(this.source))),
      get(ref(this.database,mirrorEditsPath(this.source)))
    ]);
    this.parse(snapshot.val());
    this.edits=parseMirrorEdits(edits.val());
    this.liveConfirmed=true;
    return this.combined();
  }
  subscribe(next:(items:Item[])=>void,error:(cause:Error)=>void) {
    markStartup('data-subscribe');
    let mirrorReady=false,editsReady=false,closed=false;
    const publish=()=>{
      if(closed||!mirrorReady||!editsReady)return;
      this.liveConfirmed=true;
      const uid=this.viewerUid();
      if(uid&&this.snapshot&&this.sessionCacheEnabled)storeSessionMirror(uid,this.source,this.snapshot);
      const rows=this.combined();
      markStartup('data-first',rows.length+' dòng (mirror + bản sửa realtime)');
      next(rows);
    };
    const stopMirror=subscribeMirrorStream(this.database,this.viewerUid()??'',mirrorPath(this.source),
      value=>{try{this.parse(value);mirrorReady=true;publish();}catch(cause){error(cause as Error);}},
      cause=>error(cause));
    const stopEdits=onValue(ref(this.database,mirrorEditsPath(this.source)),snapshot=>{
      try{this.edits=parseMirrorEdits(snapshot.val());editsReady=true;publish();}
      catch(cause){error(cause as Error);}
    },cause=>error(cause));
    return()=>{closed=true;stopMirror();stopEdits();};
  }
  async save(patches:Patch[]):Promise<SaveResult[]> {
    const results:SaveResult[]=[];
    for(const patch of patches){
      let reason='Dữ liệu đã thay đổi ở một phiên khác. Phần sửa vẫn được giữ để đối chiếu.';
      try{
        const actor=this.user();
        if(this.readOnly||!this.canWrite()||!actor||!this.liveConfirmed)
          throw new Error('Chưa được phép hoặc chưa xác nhận Database trực tuyến để lưu.');
        const issue=validateChanges(patch.changes);
        if(issue)throw new Error(issue);
        const fields=Object.keys(patch.changes) as EditableField[];
        if(!fields.length||fields.some(field=>!(field in patch.baseValues)||
          !mayEdit(this.permissions(),patch.recordId,field,firebaseAdmin(actor))))
          throw new Error('Bạn chưa được cấp quyền sửa một hoặc nhiều ô này.');
        const base=this.baseRows.find(item=>item.recordId===patch.recordId);
        if(!base)throw new Error('Dòng chưa tồn tại trong bản sao Database.');
        const rowPath=mirrorEditsPath(this.source)+'/'+mirrorEditKey(patch.recordId,this.source);
        const target=ref(this.database,rowPath);
        // Warm current server state first; a null transaction callback is then
        // an actually empty overlay row, not assumed proof of an absent record.
        const original=(await get(target)).val();
        if(original!=null)parseMirrorEdits({[mirrorEditKey(patch.recordId,this.source)]:original});
        let replay=false;
        const transaction=await runTransaction(target,raw=>{
          if(raw!==null)parseMirrorEdits({[mirrorEditKey(patch.recordId,this.source)]:raw});
          if(raw?.operationId===patch.operationId){
            replay=fields.every(field=>raw.values?.[field]===patch.changes[field]);
            return undefined;
          }
          const current={...base,...(raw?.values??{})} as Item;
          const conflicted=fields.find(field=>current[field]!==patch.baseValues[field]);
          if(conflicted){
            reason='Ô '+conflicted+' đã được sửa ở phiên khác. Giá trị mới đang có trên Database: “'
              +String(current[conflicted])+'”. Phần bạn nhập vẫn được giữ để đối chiếu.';
            return undefined;
          }
          if(fields.some(field=>field==='specialist'||field==='room')){
            const assignmentError=this.checkAssignment?.({...current,...patch.changes});
            if(assignmentError)throw new Error(assignmentError);
          }
          return {
            revision:(raw?.revision??0)+1,
            operationId:patch.operationId,
            updatedAt:serverTimestamp(),
            updatedBy:actor.uid,
            values:{...(raw?.values??{}),...patch.changes}
          };
        },{applyLocally:false});
        const raw=transaction.snapshot.val();
        const confirmed=(transaction.committed||replay)&&raw?.operationId===patch.operationId&&
          fields.every(field=>raw.values?.[field]===patch.changes[field]);
        if(confirmed){
          const row=applyMirrorEdits([base],this.source,
            {[mirrorEditKey(patch.recordId,this.source)]:raw})[0];
          results.push({recordId:patch.recordId,ok:true,item:row});
        }else results.push({recordId:patch.recordId,ok:false,error:'CONFLICT',message:reason});
      }catch(cause){
        results.push({recordId:patch.recordId,ok:false,error:'VALIDATION',
          message:'Chưa lưu vào Database: '+(cause instanceof Error?cause.message:'lỗi kết nối')+
            '. Bản nháp được giữ; không tự gửi lặp không giới hạn.'});
      }
    }
    return results;
  }
  async history(_recordId:string):Promise<AuditEntry[]> {return [];}
}
