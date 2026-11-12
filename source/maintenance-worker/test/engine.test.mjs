import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFrozenTree,sanitizeRows,manifestForRows,confirmationText,sha256,stableJson
} from '../src/domain.mjs';
import {
  exportArchive,verifySignedArchive,prepareMaintenance,commitMaintenance,inspectOperation
} from '../src/engine.mjs';

// R2-like memory store used ONLY in offline tests, never an external service.
const archiveObjects=new Map();
const archiveStore={
  async get(key){const value=archiveObjects.get(key);return value===undefined?null:{text:async()=>value};},
  async put(key,value){archiveObjects.set(key,value);}
};
const env={MAINTENANCE_ARCHIVE_BUCKET:archiveStore,FIREBASE_PROJECT_ID:'hophdnd-8b7b2',
  FIREBASE_DATABASE_URL:'https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app',
  BACKUP_HMAC_SECRET:'test-only-32-byte-strong-HMAC-key-never-deploy'};
const initialId='initial_123456789012';
const uid='verified-admin-uid';
const identity={uid};
const clone=obj=>JSON.parse(JSON.stringify(obj));
function row(code='NQ01'){
  return {recordId:'x-4e513031',displayCode:code,stt:1,documentKind:'NQ',
    content:'Kế hoạch đầu tư công',department:'Sở Tài chính',type:'HC',partyLevel:'BTV',
    progressParty:'Sở chưa trình',progressBuild:'VP đang xử lý',progressCouncil:'Hoàn thành',
    specialist:'Chuyên viên A',room:'Phòng TC',vpLeader:'Lãnh đạo B',ubndLeader:'Lãnh đạo C',
    specificProgress:'Đang thực hiện',note:'Ghi chú',isDropped:false,
    archivedAt:null,revision:1};
}
function fixture(){
  const pointer={generationId:'gen_'+initialId,operationId:initialId,revision:1,
    rowCount:1,digest:'a'.repeat(64)};
  return {hdnd:{
    datasetV2:{active:pointer,generations:{[pointer.generationId]:{items:{[row().recordId]:{...row(),
      operationId:initialId,updatedAt:1700000000000,updatedBy:uid}}}},
      permissions:{[pointer.generationId]:{columns:{}}},leases:{},operations:{[initialId]:{
        status:'COMMITTED',from:'legacy',to:pointer.generationId,at:1700000000000}}},
    freezeControl:{mode:'FROZEN',revision:4,epoch:1,actor:uid,
      changedAt:1700000000000,deadline:0,closedAt:1700000000000,
      datasetV2:pointer,closeKind:'forced'},
    profile:{revision:1,payload:'{}'},items:{},permissions:{columns:{}},editLocks:{},
    editors:{admin:true},control:{revision:1},sparkSessions:{inflight:'TEMP'},
    unknownBranch:{preserveMe:true}
  },hdndReviews:{revisions:{r1:true}},outside:{secret:'unchanged'}};
}
class MemoryDb{
  constructor(root=fixture()){this.root=clone(root);this.rev=1;this.conflictNext=false;this.unknownAck=false;}
  path(p){const keys=p.split('/');let cur=this.root;for(const k of keys){cur=cur?.[k];}return cur===undefined?null:clone(cur)}
  async get(path){return this.path(path)}
  async getWithEtag(path){return {data:this.path(path),etag:'"revision-'+this.rev+'"'}}
  async putIfMatch(path,value,tag){
    if(this.conflictNext){this.conflictNext=false;return {conflict:true}}
    if(tag!=='"revision-'+this.rev+'"')return {conflict:true};
    if(path!=='hdnd')throw Error('TEST_UNEXPECTED_ROOT_WRITE');
    this.root.hdnd=clone(value);this.rev++;
    if(this.unknownAck){this.unknownAck=false;throw Error('NETWORK_ACK_LOST_AFTER_SERVER_COMMIT')}
    return {conflict:false};
  }
}
const op=(suffix='1234567890123456')=>'maint_'+suffix;
const now=1700000100000;

test('missing independent archive store blocks preparation without any database write',async()=>{
  const db=new MemoryDb();
  await assert.rejects(()=>prepareMaintenance(db,{...env,MAINTENANCE_ARCHIVE_BUCKET:null},identity,
    {operationId:op('8765432187654321'),action:'clear',expected:db.root.hdnd.datasetV2.active},{now}),
    /OFFSITE_BACKUP_STORE_NOT_CONFIGURED/);
  assert.equal(db.rev,1);
  assert.equal(db.root.hdnd.maintenanceOps,undefined);
});

test('offsite snapshot must match exact live business rows, not just pointer',async()=>{
  const db=new MemoryDb(),originalGet=db.getWithEtag.bind(db);
  let calls=0;
  db.getWithEtag=async path=>{
    if(++calls===2){
      db.root.hdnd.datasetV2.generations['gen_'+initialId].items[row().recordId].note=
        'Changed between initial read and signed backup';
      db.rev++;
    }
    return originalGet(path);
  };
  await assert.rejects(()=>prepareMaintenance(db,env,identity,{
    operationId:op('8765432187654323'),action:'clear',
    expected:db.root.hdnd.datasetV2.active
  },{now}),/OFFSITE_BACKUP_ACTIVE_BASELINE_MISMATCH/);
  assert.equal(db.root.hdnd.maintenanceOps,undefined);
});

test('deleted or corrupted offsite backup blocks commit and preserves active pointer',async()=>{
  const db=new MemoryDb(),operationId=op('8765432187654322');
  const expected=clone(db.root.hdnd.datasetV2.active);
  const prepared=await prepareMaintenance(db,env,identity,{operationId,action:'clear',expected},{now});
  const reference=db.root.hdnd.maintenanceOps[operationId].offsiteBackup;
  const original=archiveObjects.get(reference.key);
  archiveObjects.delete(reference.key);
  await assert.rejects(()=>commitMaintenance(db,env,identity,
    {operationId,confirmation:prepared.confirmation},{now:now+1000}),/OFFSITE_BACKUP_MISSING/);
  assert.deepEqual(db.root.hdnd.datasetV2.active,expected);
  archiveObjects.set(reference.key,original+' ');
  await assert.rejects(()=>commitMaintenance(db,env,identity,
    {operationId,confirmation:prepared.confirmation},{now:now+1000}),/OFFSITE_BACKUP_CORRUPTED/);
  assert.deepEqual(db.root.hdnd.datasetV2.active,expected);
  archiveObjects.set(reference.key,original);
  assert.equal((await commitMaintenance(db,env,identity,
    {operationId,confirmation:prepared.confirmation},{now:now+1000})).status,'committed');
});

test('archive includes app paths but never unknown root/auth/sessions and is signed',async()=>{
  const db=new MemoryDb();
  const archive=await exportArchive(db,env,{now});
  assert.equal(archive.payload.projectId,env.FIREBASE_PROJECT_ID);
  assert.equal(archive.payload.nodes['hdnd/profile'].revision,1);
  assert.equal(archive.payload.nodes['hdnd/maintenanceOps'],null);
  assert.equal(Object.hasOwn(archive.payload.nodes,'hdnd/sparkSessions'),false);
  assert.equal(Object.hasOwn(archive.payload.nodes,'outside'),false);
  assert.equal(await verifySignedArchive(archive,env),archive.payload);
});

test('signature rejects tampering even when attacker recomputes public SHA-256',async()=>{
  const db=new MemoryDb();const archive=await exportArchive(db,env,{now});
  const changed=clone(archive);changed.payload.nodes['hdnd/profile'].payload='malicious';
  changed.sha256=await sha256(stableJson(changed.payload));
  await assert.rejects(()=>verifySignedArchive(changed,env),/BACKUP_AUTHENTICITY_FAILED/);
  const wrongProject=clone(archive);wrongProject.payload.projectId='other';
  await assert.rejects(()=>verifySignedArchive(wrongProject,env),/BACKUP_SHA256_MISMATCH/);
});

test('clear is a reversible zero-record generation, not a root DELETE',async()=>{
  const db=new MemoryDb();const expected=db.root.hdnd.datasetV2.active;
  const prepared=await prepareMaintenance(db,env,identity,{operationId:op(),action:'clear',expected},{now});
  assert.equal(prepared.oldCount,1);assert.equal(prepared.newCount,0);
  assert.equal(prepared.confirmation,`XOA ${op()} 1 0`);
  assert.equal(db.root.hdnd.datasetV2.active.rowCount,1); // staging never changes active
  assert.equal(db.root.hdnd.datasetV2.backups[op()]!==undefined,true);
  const result=await commitMaintenance(db,env,identity,{operationId:op(),confirmation:prepared.confirmation},{now:now+1000});
  assert.equal(result.status,'committed');assert.equal(result.newCount,0);
  assert.equal(db.root.hdnd.datasetV2.active.rowCount,0);
  assert.equal(db.root.hdnd.datasetV2.generations['gen_'+op()].emptyGeneration,true);
  assert.equal(db.root.hdnd.datasetV2.generations[expected.generationId].items[row().recordId].content,row().content);
  assert.equal(db.root.hdnd.profile.revision,1);
  assert.equal(db.root.hdnd.unknownBranch.preserveMe,true);
  assert.equal(db.root.outside.secret,'unchanged');
  assert.equal(db.root.hdnd.freezeControl.mode,'FROZEN');
  assert.deepEqual(db.root.hdnd.freezeControl.datasetV2,db.root.hdnd.datasetV2.active);
  assert.equal((await inspectOperation(db,op())).status,'committed-active');
  assert.equal((await commitMaintenance(db,env,identity,{operationId:op(),confirmation:prepared.confirmation},{now:now+2000})).status,'already-committed');
});

test('restore from signed archive after clear makes new generation with exact business fields',async()=>{
  const db=new MemoryDb();const backup=await exportArchive(db,env,{now});
  const first=await prepareMaintenance(db,env,identity,{operationId:op('2222222222222222'),action:'clear',expected:db.root.hdnd.datasetV2.active},{now});
  await commitMaintenance(db,env,identity,{operationId:first.operationId,confirmation:first.confirmation},{now:now+500});
  const expected=clone(db.root.hdnd.datasetV2.active);
  const prepared=await prepareMaintenance(db,env,identity,{operationId:op('3333333333333333'),action:'restore',archive:backup,expected},{now:now+2000});
  assert.equal(prepared.oldCount,0);assert.equal(prepared.newCount,1);
  assert.equal(prepared.confirmation,`KHOI PHUC ${op('3333333333333333')} 0 1`);
  await commitMaintenance(db,env,identity,{operationId:prepared.operationId,confirmation:prepared.confirmation},{now:now+3000});
  assert.equal(db.root.hdnd.datasetV2.active.rowCount,1);
  const rows=db.root.hdnd.datasetV2.generations['gen_'+prepared.operationId].items;
  assert.equal(Object.values(rows)[0].content,'Kế hoạch đầu tư công');
  assert.equal(db.root.hdnd.datasetV2.generations['gen_'+first.operationId].emptyGeneration,true);
  assert.equal((await inspectOperation(db,first.operationId)).status,'committed-historical');
});

test('Excel replacement checks record validity, CAS, reset grants and preserves old immutable generation',async()=>{
  const db=new MemoryDb();db.root.hdnd.datasetV2.permissions[db.root.hdnd.datasetV2.active.generationId]={columns:{note:true}};
  const r=row('NQ01');r.note='Hồ sơ cập nhật từ Excel';
  const proposed=[r,{...row('NQ02'),recordId:'x-4e513032',stt:2,documentKind:'NQ',content:'Mở rộng đường'}];
  const pre=await prepareMaintenance(db,env,identity,{operationId:op('4444444444444444'),action:'replace',
    expected:db.root.hdnd.datasetV2.active,rows:proposed,sourceName:'Du lieu.xlsx'},{now});
  assert.equal(pre.newCount,2);
  await commitMaintenance(db,env,identity,{operationId:pre.operationId,confirmation:pre.confirmation},{now:now+2000});
  assert.equal(db.root.hdnd.datasetV2.active.rowCount,2);
  assert.deepEqual(db.root.hdnd.datasetV2.permissions['gen_'+pre.operationId],{columns:{}});
  assert.equal(db.root.hdnd.datasetV2.permissions['gen_'+initialId].columns.note,true);
  assert.equal(db.root.hdnd.datasetV2.generations['gen_'+initialId].items[row().recordId].note,'Ghi chú');
});

test('active edit lease, unfrozen state, stale pointer and changed data all fail closed',async()=>{
  const locked=new MemoryDb();const pid=locked.root.hdnd.datasetV2.active.generationId;
  locked.root.hdnd.datasetV2.leases[pid]={r1:{note:{expiresAt:now+600000}}};
  await assert.rejects(()=>prepareMaintenance(locked,env,identity,{action:'clear',operationId:op(),expected:locked.root.hdnd.datasetV2.active},{now}),/ACTIVE_EDIT_LEASE/);
  const open=new MemoryDb();open.root.hdnd.freezeControl.mode='OPEN';
  await assert.rejects(()=>prepareMaintenance(open,env,identity,{action:'clear',operationId:op(),expected:open.root.hdnd.datasetV2.active},{now}),/FREEZE_OR_POINTER_STALE/);
  const stale=new MemoryDb();const expected=clone(stale.root.hdnd.datasetV2.active);expected.revision++;
  await assert.rejects(()=>prepareMaintenance(stale,env,identity,{action:'clear',operationId:op(),expected},{now}),/STALE_EXPECTED_POINTER/);
  const changed=new MemoryDb();const pre=await prepareMaintenance(changed,env,identity,{action:'clear',operationId:op(),expected:changed.root.hdnd.datasetV2.active},{now});
  changed.root.hdnd.datasetV2.generations['gen_'+initialId].items[row().recordId].note='CONCURRENT CHANGE';changed.rev++;
  await assert.rejects(()=>commitMaintenance(changed,env,identity,{operationId:op(),confirmation:pre.confirmation},{now:now+3000}),/ACTIVE_DATA_CHANGED_SINCE_PREPARE/);
});

test('CAS prevents simultaneous mutation; ambiguous ACK must be queried',async()=>{
  const conflict=new MemoryDb();conflict.conflictNext=true;
  await assert.rejects(()=>prepareMaintenance(conflict,env,identity,{action:'clear',operationId:op(),expected:conflict.root.hdnd.datasetV2.active},{now}),/CONCURRENT_PREPARE_CONFLICT/);
  assert.equal(conflict.root.hdnd.maintenanceOps,undefined);
  const unknown=new MemoryDb();const pre=await prepareMaintenance(unknown,env,identity,{action:'clear',operationId:op(),expected:unknown.root.hdnd.datasetV2.active},{now});
  unknown.unknownAck=true;
  await assert.rejects(()=>commitMaintenance(unknown,env,identity,{operationId:op(),confirmation:pre.confirmation},{now:now+1000}),/NETWORK_ACK_LOST/);
  assert.equal((await inspectOperation(unknown,op())).status,'committed-active');
});

test('post-CAS readback mismatch is an unknown ACK, not a success or blind retry',async()=>{
  const db=new MemoryDb(),operationId=op('8765432187654324');
  const prepared=await prepareMaintenance(db,env,identity,{
    operationId,action:'replace',expected:db.root.hdnd.datasetV2.active,
    rows:[row()],sourceName:'Replacement.xlsx'
  },{now});
  const genuineGet=db.get.bind(db);
  db.get=async path=>{
    const result=await genuineGet(path);
    if(path==='hdnd'&&result?.datasetV2?.active?.operationId===operationId){
      const saved=result.datasetV2.generations['gen_'+operationId].items;
      saved[row().recordId].note='Changed in readback only';
    }
    return result;
  };
  await assert.rejects(()=>commitMaintenance(db,env,identity,{
    operationId,confirmation:prepared.confirmation},{now:now+1000}),
    /COMMIT_UNKNOWN_CHECK_STATUS/);
  // The fake server did commit. Caller must inspect the operation, NEVER
  // create a new operation ID or blindly retry a replacement.
  assert.equal(db.root.hdnd.datasetV2.active.operationId,operationId);
  assert.equal(db.root.hdnd.datasetV2.generations['gen_'+operationId].items[row().recordId].note,'Ghi chú');
});

test('wrong confirmation / expired preparation / another UID fails',async()=>{
  const db=new MemoryDb();const p=await prepareMaintenance(db,env,identity,{action:'clear',operationId:op(),expected:db.root.hdnd.datasetV2.active},{now});
  await assert.rejects(()=>commitMaintenance(db,env,identity,{operationId:op(),confirmation:'XOA TAT CA'}, {now:now+1000}),/CONFIRMATION_MISMATCH/);
  await assert.rejects(()=>commitMaintenance(db,env,{uid:'other'},{operationId:op(),confirmation:p.confirmation}, {now:now+1000}),/PREPARATION_EXPIRED_OR_DIFFERENT_ADMIN/);
  await assert.rejects(()=>commitMaintenance(db,env,identity,{operationId:op(),confirmation:p.confirmation}, {now:now+700000}),/PREPARATION_EXPIRED_OR_DIFFERENT_ADMIN/);
});

test('59-row x 15-source-column synthetic fixture survives replace, signed backup, clear and restore',async()=>{
  const db=new MemoryDb();
  const sourceRows=Array.from({length:59},(_,i)=>{
    const n=i+1,code='NQ'+String(n).padStart(2,'0');
    const initial=row(code);
    return {...initial,recordId:'record_'+String(n).padStart(3,'0'),stt:n,
      content:'Nội dung trình '+n,
      department:'Sở/ngành '+n,type:'HC',partyLevel:'BTV',
      progressParty:'Sở chưa trình',progressBuild:'VP đang xử lý',
      progressCouncil:'Hoàn thành',specialist:'Chuyên viên '+n,
      room:'Phòng '+n,vpLeader:'Lãnh đạo VP '+n,ubndLeader:'Lãnh đạo UBND '+n,
      specificProgress:'Đang xử lý '+n,note:'Ghi chú Unicode '+n};
  });
  const originalPointer=clone(db.root.hdnd.datasetV2.active);
  const replaceOp=op('5555555555555555');
  const prepared=await prepareMaintenance(db,env,identity,{
    operationId:replaceOp,action:'replace',expected:originalPointer,
    rows:sourceRows,sourceName:'Test-A-O-59-row.xlsx',
  },{now});
  assert.equal(prepared.oldCount,1);
  assert.equal(prepared.newCount,59);
  await commitMaintenance(db,env,identity,{operationId:replaceOp,
    confirmation:prepared.confirmation},{now:now+300});
  assert.equal(db.root.hdnd.datasetV2.active.rowCount,59);
  const archive=await exportArchive(db,env,{now:now+400});
  assert.equal(await verifySignedArchive(archive,env),archive.payload);
  const fields=['displayCode','stt','content','department','type','partyLevel',
    'progressParty','progressBuild','progressCouncil','specialist','room',
    'vpLeader','ubndLeader','specificProgress','note'];
  assert.equal(fields.length,15);
  let checked=0;
  const verify=rows=>{
    assert.equal(Object.keys(rows).length,59);
    for(const source of sourceRows){
      const target=rows[source.recordId];
      assert.ok(target,'missing '+source.recordId);
      for(const field of fields){
        assert.equal(target[field],source[field],
          'Mismatch '+source.recordId+':'+field);
        checked++;
      }
    }
  };
  verify(db.root.hdnd.datasetV2.generations['gen_'+replaceOp].items);
  const clearOp=op('6666666666666666');
  const clear=await prepareMaintenance(db,env,identity,{operationId:clearOp,
    action:'clear',expected:clone(db.root.hdnd.datasetV2.active)},{now:now+600});
  await commitMaintenance(db,env,identity,{operationId:clearOp,
    confirmation:clear.confirmation},{now:now+800});
  assert.equal(db.root.hdnd.datasetV2.active.rowCount,0);
  const restoreOp=op('7777777777777777');
  const restored=await prepareMaintenance(db,env,identity,{
    operationId:restoreOp,action:'restore',archive,
    expected:clone(db.root.hdnd.datasetV2.active)},{now:now+1000});
  await commitMaintenance(db,env,identity,{operationId:restoreOp,
    confirmation:restored.confirmation},{now:now+1200});
  verify(db.root.hdnd.datasetV2.generations['gen_'+restoreOp].items);
  assert.equal(checked,1770); // each of 885 A–O values verified before and after restore
  assert.equal(db.root.hdnd.datasetV2.active.rowCount,59);
  assert.equal(db.root.outside.secret,'unchanged');
  assert.ok(db.root.hdnd.datasetV2.generations[originalPointer.generationId]);
});

test('rows parser rejects duplicate ID/code, imported metadata and prototype keys',()=>{
  const r=row();
  assert.throws(()=>sanitizeRows([r,{...r,recordId:'x-other'}]),/DUPLICATE_RECORD_ID_OR_CODE/);
  assert.throws(()=>sanitizeRows([{...r,recordId:'__proto__'}]),/INVALID_RECORD_ID/);
  assert.throws(()=>sanitizeRows([{...r,revision:2}],{mode:'excel'}),/INVALID_NEW_EXCEL_METADATA/);
  assert.throws(()=>sanitizeRows([{...r,note:50}],{mode:'excel'}),/INVALID_note/);
  assert.equal(confirmationText('clear',op(),59,0),`XOA ${op()} 59 0`);
});
