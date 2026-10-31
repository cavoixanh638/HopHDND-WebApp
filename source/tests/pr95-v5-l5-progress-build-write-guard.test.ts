import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {assertFails,assertSucceeds,initializeTestEnvironment,
  type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,runTransaction,serverTimestamp,set,update,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Changes,EditableField,Item,Patch} from '../shared/types';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import {FirebaseRepository,type CellPermissions} from '../src/data/firebase-repository';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {buildNotRequiredForType,violatesProgressBuildWritePolicy} from
  '../src/data/pr95-v5-l5-progress-build-policy';

const activeId='gen_v5_l5';
const path='hdnd/datasetV2/generations/'+activeId+'/items';
const epoch={generationId:activeId,operationId:'v5l5_initial_0001',
  revision:1,rowCount:7,digest:'a'.repeat(64)};
const adminClaims={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com' as const}};
const allGrants:CellPermissions={columns:{
  type:true,documentKind:true,progressBuild:true,note:true,specificProgress:true}};
const fixtureSpec:readonly (readonly [string,string,Item['documentKind'],string])[]=[
  ['qppl','QPPL','NQ','Sở chưa trình'],
  ['hc','HC','NQ','Đã trình HĐND, chưa có QĐ'],
  ['hanhchinh','Hành chính','NQ','Đã có QĐ chấp thuận'],
  ['bc','BC','NQ','Sở chưa trình'],
  ['baocao','Báo cáo','BC','Đã trình HĐND, chưa có QĐ'],
  ['kindbc','QPPL','BC','Sở chưa trình'],
  ['unknown','Không rõ','UNCLASSIFIED','Sở chưa trình']
];
const rows=():Item[]=>fixtureSpec.map(([id,type,documentKind,progressBuild],i)=>({
  ...createDemoItems(1)[0],recordId:id,displayCode:'MẪU'+String(i+1).padStart(2,'0'),
  stt:i+1,type,documentKind,progressBuild,note:'Bản ghi gốc '+id,
  specificProgress:'Đang tổng hợp',archivedAt:null,isDropped:false,revision:1
}));
const seed=()=>({hdnd:{datasetV2:{
  active:epoch,
  generations:{[activeId]:{items:Object.fromEntries(rows().map(row=>{
    const {archivedAt,...fields}=row;
    return [row.recordId,{...fields,operationId:'initial',
      updatedAt:1,updatedBy:'admin'}];
  }))}},
  permissions:{[activeId]:allGrants}
}}});
const actor=(id:string,admin=false):User=>({
  uid:id,isAnonymous:!admin,email:admin?adminClaims.email:null,
  emailVerified:admin,providerData:admin?[{providerId:'google.com'}]:[]
} as User);

describe('V5 L5 HC/BC write policy — exact data-layer contract (no migration)',()=>{
  it('recognizes HC aliases and BC kind/type without assuming unknown is HC',()=>{
    for(const type of ['HC',' hc ','Hành chính','HÀNH CHÍNH','Hanh chinh',
      'BC',' Báo cáo ','Bao cao','bÁo  cÁo']){
      expect(buildNotRequiredForType({type,documentKind:'NQ'}),type).toBe(true);
    }
    expect(buildNotRequiredForType({type:'QPPL',documentKind:'BC'})).toBe(true);
    for(const type of ['QPPL','NQ','Không rõ','']){
      expect(buildNotRequiredForType({type,documentKind:'NQ'}),type).toBe(false);
    }
  });
  it('rejects only CHANGED Build of HC/BC after applying type AND kind changes',()=>{
    const old={type:'QPPL',documentKind:'NQ' as const,progressBuild:'Sở chưa trình'};
    expect(violatesProgressBuildWritePolicy(old,{progressBuild:'Đã có QĐ'})).toBe(false);
    expect(violatesProgressBuildWritePolicy(old,{
      type:'HC',progressBuild:'Đã có QĐ'})).toBe(true);
    expect(violatesProgressBuildWritePolicy(old,{
      documentKind:'BC',progressBuild:'Đã có QĐ'})).toBe(true);
    expect(violatesProgressBuildWritePolicy({...old,type:'HC'},{
      progressBuild:'Đã có QĐ'})).toBe(true);
    expect(violatesProgressBuildWritePolicy({...old,type:'HC'},{
      note:'Giữ nguyên Build'})).toBe(false);
    expect(violatesProgressBuildWritePolicy({...old,type:'HC'},{
      progressBuild:'Sở chưa trình',note:'Không phải Build edit'})).toBe(false);
    expect(violatesProgressBuildWritePolicy({...old,type:'HC'},{
      type:'QPPL',progressBuild:'Đã có QĐ'})).toBe(false);
  });
});

const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const candidate=readFileSync('firebase/database.exclusive-candidate.rules.json','utf8');
type Harness={db:Database;session:CellEditSessionManager;repo:FirebaseRepository;uid:string};
describe.skipIf(!enabled)('PR95 V5 L5 REAL Auth/RTDB Emulator: repository + direct SDK',()=>{
  let env:RulesTestEnvironment;
  const sessions=new Set<CellEditSessionManager>();
  const adminDb=()=>env.authenticatedContext('admin',adminClaims).database() as never as Database;
  const guestDb=()=>env.authenticatedContext('guest',{
    firebase:{sign_in_provider:'anonymous'}}).database() as never as Database;
  const harness=(admin=false,staleGrants:CellPermissions=allGrants):Harness=>{
    const uid=admin?'admin':'guest',db=admin?adminDb():guestDb();
    const session=new CellEditSessionManager(db,()=>actor(uid,admin),activeId);
    sessions.add(session);
    const repo=new FirebaseRepository(db,()=>actor(uid,admin),()=>staleGrants,path,epoch);
    repo.leaseManager=session;
    return {db,session,repo,uid};
  };
  const current=async(db:Database,id:string)=>
    (await get(ref(db,path+'/'+id))).val() as Item & {history?:Record<string,unknown>;operationId:string};
  const persist=async(w:Harness,id:string,changes:Changes,old?:Item)=>{
    for(const field of Object.keys(changes) as EditableField[])
      if(!w.session.has(id,field))
        await w.session.acquire(id,field,
          field==='note'||field==='specificProgress'?'multiline':'status');
    const row=old??(await w.repo.list()).find(value=>value.recordId===id)!;
    const patch=updateDraft(row,undefined,changes)!;
    expect(patch).toBeDefined();
    return (await w.repo.save([patch]))[0];
  };
  const directSdkEdit=async(w:Harness,id:string,nextBuild:string,viaTransaction=false)=>{
    await w.session.acquire(id,'progressBuild','status');
    const before=await current(w.db,id);
    const revision=before.revision+1,operationId='v5l5_direct_'+crypto.randomUUID();
    const updateFields={
      progressBuild:nextBuild,revision,operationId,
      updatedAt:serverTimestamp(),updatedBy:w.uid,
      editProofs:{...(before as any).editProofs,progressBuild:w.session.proof(id,'progressBuild')},
      history:{...(before.history??{}),[String(revision%50)]:{
        operationId,recordId:id,at:serverTimestamp(),actor:w.uid,
        changes:{progressBuild:nextBuild},oldValues:{progressBuild:before.progressBuild}
      }}
    };
    const target=ref(w.db,path+'/'+id);
    if(viaTransaction){
      return runTransaction(target,raw=>raw===null?raw:{...raw,...updateFields},{applyLocally:false});
    }
    // Do not mix an ancestor path with a child path in one RTDB update().
    const {editProofs,history,...flat}=updateFields;
    return update(target,{
      ...flat,
      ['editProofs/progressBuild']:editProofs.progressBuild,
      ['history/'+(revision%50)]:history[String(revision%50)]
    });
  };
  beforeAll(async()=>{
    expect(enabled).toBe(true);
    env=await initializeTestEnvironment({projectId:'demo-hdnd-v5-l5',
      database:{host:'127.0.0.1',port:9000,rules:candidate}});
  },30000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>
      set(ref(ctx.database() as never),seed()));
  });
  afterEach(async()=>{
    await Promise.allSettled([...sessions].map(s=>s.dispose()));
    sessions.clear();
  });
  afterAll(async()=>env?.cleanup());

  it('READS every HC/BC legacy raw Build intact and does not convert it',async()=>{
    const w=harness();
    const items=await w.repo.list();
    expect(items).toHaveLength(7);
    expect(items.find(x=>x.recordId==='hc')?.progressBuild)
      .toBe('Đã trình HĐND, chưa có QĐ');
    expect(items.find(x=>x.recordId==='hanhchinh')?.progressBuild)
      .toBe('Đã có QĐ chấp thuận');
    expect((await current(w.db,'hc')).revision).toBe(1);
  });
  it('writes HC/BC note and specificProgress with real grant, lease and truthful audit',async()=>{
    const w=harness();
    for(const id of ['hc','baocao','kindbc']){
      const before=await current(w.db,id);
      const note='ghi chú được cấp phép '+id;
      const result=await persist(w,id,{note,specificProgress:'Cập nhật tiến độ chi tiết'});
      expect(result.ok,result.message).toBe(true);
      const after=await current(w.db,id);
      expect(after.revision).toBe(before.revision+1);
      expect(after.progressBuild).toBe(before.progressBuild);
      const audit=(after.history as any)[String(after.revision%50)];
      expect(audit.changes).toEqual({note,specificProgress:'Cập nhật tiến độ chi tiết'});
      expect(audit.oldValues).toEqual({note:before.note,specificProgress:before.specificProgress});
    }
  },40000);
  it('repository denies HC, Hành chính, BC, Báo cáo and documentKind BC even for ADMIN',async()=>{
    const w=harness(true);
    for(const id of ['hc','hanhchinh','bc','baocao','kindbc']){
      const before=await current(w.db,id);
      const result=await persist(w,id,{progressBuild:'Đã có QĐ'});
      expect(result.ok,id).toBe(false);
      expect(result.message,id).toContain('không thể chỉnh sửa');
      const after=await current(w.db,id);
      expect(after.progressBuild).toBe(before.progressBuild);
      expect(after.revision).toBe(before.revision);
      expect(after.history??{}).toEqual(before.history??{});
    }
  },50000);
  it('QPPL and UNKNOWN remain writable with actual guest grant/lease/audit',async()=>{
    const w=harness();
    for(const id of ['qppl','unknown']){
      const before=await current(w.db,id);
      const result=await persist(w,id,{progressBuild:'VP đang xử lý'});
      expect(result.ok,result.message).toBe(true);
      const after=await current(w.db,id);
      expect(after.progressBuild).toBe('VP đang xử lý');
      expect((after.history as any)[String(after.revision%50)].changes.progressBuild)
        .toBe('VP đang xử lý');
      expect(after.revision).toBe(before.revision+1);
    }
  },35000);
  it('TYPE RACE: guest obtained valid QPPL lease, admin switches to HC, stale Build is rejected',async()=>{
    const guest=harness(),admin=harness(true);
    const stale=(await guest.repo.list()).find(x=>x.recordId==='qppl')!;
    await guest.session.acquire('qppl','progressBuild','status');
    const typeOnly=await persist(admin,'qppl',{type:'HC'});
    expect(typeOnly.ok,typeOnly.message).toBe(true);
    const afterType=await current(guest.db,'qppl');
    expect(afterType.type).toBe('HC');
    expect(afterType.progressBuild).toBe('Sở chưa trình'); // Legacy raw survives.
    const attempt=(await guest.repo.save([updateDraft(stale,undefined,
      {progressBuild:'Đã có QĐ'})!]))[0];
    expect(attempt.ok).toBe(false);
    expect(attempt.message).toContain('không thể chỉnh sửa');
    const after=await current(guest.db,'qppl');
    expect(after.revision).toBe(afterType.revision);
    expect(after.history).toEqual(afterType.history);
  },35000);
  it('type+build and documentKind+build in ONE patch use the POST-PATCH classification',async()=>{
    const w=harness(true);
    const forbidden=await persist(w,'qppl',{type:'Hành chính',progressBuild:'Đã có QĐ'});
    expect(forbidden.ok).toBe(false);
    expect((await current(w.db,'qppl')).type).toBe('QPPL');
    const forbiddenKind=await persist(w,'qppl',{documentKind:'BC',progressBuild:'Đã có QĐ'});
    expect(forbiddenKind.ok).toBe(false);
    const allowed=await persist(w,'hc',{type:'QPPL',progressBuild:'VP đang xử lý'});
    expect(allowed.ok,allowed.message).toBe(true);
    const after=await current(w.db,'hc');
    expect(after.type).toBe('QPPL');
    expect(after.progressBuild).toBe('VP đang xử lý');
    expect((after.history as any)['2'].changes).toEqual({
      type:'QPPL',progressBuild:'VP đang xử lý'});
  },35000);
  it('a Build no-op on legacy HC creates NO revision/audit, and type-only change preserves H',async()=>{
    const w=harness(true);
    const before=await current(w.db,'hc');
    await w.session.acquire('hc','progressBuild','status');
    const noOp:Patch={
      recordId:'hc',sourceCode:before.displayCode,baseRevision:before.revision,
      baseValues:{progressBuild:before.progressBuild},
      changes:{progressBuild:before.progressBuild},
      operationId:'v5l5_noop_0001'
    };
    const result=(await w.repo.save([noOp]))[0];
    expect(result.ok).toBe(false);
    expect((await current(w.db,'hc')).revision).toBe(before.revision);
    const typeChange=await persist(w,'hc',{type:'QPPL'});
    expect(typeChange.ok,typeChange.message).toBe(true);
    const after=await current(w.db,'hc');
    expect(after.progressBuild).toBe(before.progressBuild);
    expect((after.history as any)['2'].changes).toEqual({type:'QPPL'});
  },30000);
  it('DIRECT SDK: valid guest grant+lease+audit edits QPPL, but cannot change HC/BC',async()=>{
    const w=harness();
    await assertSucceeds(directSdkEdit(w,'qppl','VP đang xử lý'));
    const success=await current(w.db,'qppl');
    expect(success.progressBuild).toBe('VP đang xử lý');
    expect(success.revision).toBe(2);
    for(const id of ['hc','baocao','kindbc']){
      const before=await current(w.db,id);
      await assertFails(directSdkEdit(w,id,'Đã có QĐ'));
      expect(await current(w.db,id)).toEqual(before);
    }
  },45000);
  it('DIRECT SDK TRANSACTION: verified admin lease and audit cannot bypass HC/BC guard',async()=>{
    const w=harness(true);
    // Positive same payload against QPPL proves the test does not merely fail
    // on malformed audit, missing .write or missing lease.
    await assertSucceeds(directSdkEdit(w,'qppl','VP đang xử lý',true));
    expect((await current(w.db,'qppl')).revision).toBe(2);
    for(const id of ['hc','bc']){
      const before=await current(w.db,id);
      await assertFails(directSdkEdit(w,id,'Đã có QĐ',true));
      expect(await current(w.db,id)).toEqual(before);
    }
  },45000);
  it('REVOKE: stale client grant + acquired lease cannot write QPPL Build',async()=>{
    const w=harness(false,{columns:{progressBuild:true}}),admin=adminDb();
    const old=await current(w.db,'qppl');
    await w.session.acquire('qppl','progressBuild','status');
    await assertSucceeds(set(ref(admin,
      'hdnd/datasetV2/permissions/'+activeId+'/columns/progressBuild'),false));
    const attempt=(await w.repo.save([updateDraft(old,undefined,
      {progressBuild:'Đã có QĐ'})!]))[0];
    expect(attempt.ok).toBe(false);
    const after=await current(w.db,'qppl');
    expect(after.revision).toBe(old.revision);
    expect(after.history??{}).toEqual(old.history??{});
  },25000);
  it('active V2 rejects inline insertion; legacy HC is preserved for approved restore',async()=>{
    const admin=adminDb();
    const fresh=rows().find(x=>x.recordId==='hc')!;
    // Importing directly into an active generation is deliberately forbidden:
    // there must be a reviewed candidate and atomic generation-pointer commit.
    // See firebase-versioned-replacement.test.ts (run in THIS CI matrix):
    // stage -> private backup -> commit -> restore with the legacy raw retained.
    const {archivedAt,...body}=fresh;
    await assertFails(set(ref(admin,path+'/imported_hc'),{
      ...body,recordId:'imported_hc',revision:1,operationId:'v5l5_import_0001',
      updatedAt:serverTimestamp(),updatedBy:'admin'
    }));
    expect((await get(ref(admin,path+'/imported_hc'))).exists()).toBe(false);
    expect((await current(admin,'hc')).progressBuild).toBe(fresh.progressBuild);
  },25000);
});
