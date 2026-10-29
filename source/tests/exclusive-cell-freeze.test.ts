import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update,serverTimestamp} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {CellEditSessionManager,lockPath} from '../src/data/cell-edit-leases';
import {initialFreeze,readFreeze,setFreezeMode,activeEditLeaseCount} from '../src/data/freeze-control';
import {migrateMirrorToPrimary,bootstrapApprovedRowsToPrimary} from '../src/data/firebase-primary-bootstrap';
import {parseSheetConfig,DEFAULT_SHEET_URL} from '../src/data/sheet-config';

const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const candidate=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
const adminClaims={email:'cavoixanh638@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com' as const}};
const actor=(id:string,admin=false)=>({uid:id,email:admin?adminClaims.email:id+'@example.test',
  emailVerified:true,isAnonymous:false,providerData:[{providerId:'google.com'}]}) as User;
const row={...createDemoItems()[0],recordId:'r1',displayCode:'NQ01',revision:1,archivedAt:null};
describe.skipIf(!enabled)('exclusive cell edit leases + drain/freeze RTDB security',()=>{
  let env:RulesTestEnvironment;
  const guest=(id:string)=>env.authenticatedContext(id,{email:id+'@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}}).database();
  const anonymous=(id:string)=>env.authenticatedContext(id,{firebase:{sign_in_provider:'anonymous'}}).database();
  const admin=()=>env.authenticatedContext('administrator',adminClaims).database();
  const manager=(id:string,isAdmin=false)=>new CellEditSessionManager(
    (isAdmin?admin():guest(id)) as never,()=>actor(id,isAdmin));
  const publicManager=(id:string)=>new CellEditSessionManager(
    anonymous(id) as never,()=>({uid:id,isAnonymous:true,providerData:[]} as unknown as User));
  const publicRepo=(id:string,session:CellEditSessionManager)=>{
    const r=new FirebaseRepository(anonymous(id) as never,
      ()=>({uid:id,isAnonymous:true,providerData:[]} as unknown as User),
      ()=>({columns:{note:true,specificProgress:true,progressParty:true}}));
    r.leaseManager=session;return r;
  };
  const repo=(id:string,session:CellEditSessionManager,isAdmin=false)=>{
    const r=new FirebaseRepository((isAdmin?admin():guest(id)) as never,()=>actor(id,isAdmin),
      ()=>({columns:{note:true,specificProgress:true,progressParty:true}}));
    r.leaseManager=session;return r;
  };
  beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-hdnd-exclusivity',database:{
    host:'127.0.0.1',port:9000,rules:JSON.stringify(candidate)
  }});},30000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async context=>{
      const {archivedAt,...record}=row;
      await set(ref(context.database() as never),{
        hdnd:{items:{r1:{...record,operationId:'initial',updatedAt:Date.now(),updatedBy:'administrator'}},
          permissions:{columns:{note:true,specificProgress:true,progressParty:true}},
          editors:{a:true,b:true,forger:true,ungranted:true,untrusted:true},
          control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()}}
      });
    });
  });
  afterAll(async()=>env?.cleanup());
  it('limits Firebase read scope without breaking ordinary ItemList, grants and freeze watchers',async()=>{
    const visitor=anonymous('anon-read'),staff=guest('a'),unknown=guest('stranger'),root=admin();
    // Public viewing is the product policy: anonymous, unknown Google and no auth can read business rows.
    for(const db of [visitor,staff,unknown]){
      await assertFails(get(ref(db as never,'hdnd')));
      await get(ref(db as never,'hdnd/items'));
      await get(ref(db as never,'hdnd/profile'));
      await get(ref(db as never,'hdnd/permissions'));
      await get(ref(db as never,'hdnd/control'));
      await get(ref(db as never,'hdnd/freezeControl'));
      await get(ref(db as never,'hdnd/mirrors/example-sheet/example-gid'));
      await assertFails(get(ref(db as never,'hdnd/editors')));
      await assertFails(get(ref(db as never,'hdnd/editLocks')));
      await assertFails(get(ref(db as never,'hdnd/freezeReceipts')));
    }
    // Staff can only discover THEIR membership; anonymous visitors see no other UID.
    expect((await get(ref(staff as never,'hdnd/editors/a'))).val()).toBe(true);
    await assertFails(get(ref(staff as never,'hdnd/editors/b')));
    await assertFails(get(ref(visitor as never,'hdnd/editors/a')));
    expect((await get(ref(visitor as never,'hdnd/editors/anon-read'))).val()).toBe(null);
    await assertFails(get(ref(unknown as never,'hdnd/editLocks/r1/note')));
    expect((await get(ref(visitor as never,'hdnd/editLocks/r1/note'))).val()).toBe(null);
    // An allowlisted editor must still read the exact lock node to perform CAS.
    expect((await get(ref(staff as never,'hdnd/editLocks/r1/note'))).val()).toBe(null);
    await get(ref(root as never,'hdnd/editors'));
    await get(ref(root as never,'hdnd/editLocks'));
    await get(ref(root as never,'hdnd/freezeReceipts'));
    await assertFails(get(ref(root as never,'hdnd')));
    // Product policy: viewing business data is PUBLIC, even without Firebase
    // Auth; only modifications and internal editor/token registry are restricted.
    const publicDb=env.unauthenticatedContext().database();
    for(const node of ['items','profile','permissions','control','freezeControl','mirrors']){
      await get(ref(publicDb as never,'hdnd/'+node));
    }
    await assertFails(get(ref(publicDb as never,'hdnd')));
    await assertFails(get(ref(publicDb as never,'hdnd/editors')));
    await assertFails(get(ref(publicDb as never,'hdnd/editLocks')));
    await assertFails(get(ref(publicDb as never,'hdnd/freezeReceipts')));
  });
  it('public anonymous visitor saves only granted cells through a lease with server audit',async()=>{
    const id='anon-a',session=publicManager(id),writer=publicRepo(id,session),db=anonymous(id);
    const [original]=await writer.list();
    await session.acquire('r1','note','multiline');
    const [saved]=await writer.save([updateDraft(original,undefined,{note:'Khách cập nhật ô được phép'})!]);
    expect(saved.ok,saved.message).toBe(true);
    const fresh=(await get(ref(db as never,'hdnd/items/r1'))).val();
    expect(fresh.note).toBe('Khách cập nhật ô được phép');
    expect(fresh.updatedBy).toBe(id);
    expect(fresh.history[String(fresh.revision%50)].changes.note).toBe('Khách cập nhật ô được phép');
    await session.finish('r1','note');await session.dispose();
  });
  it('public anonymous cannot bypass per-cell deny, lease or edit permission revocation',async()=>{
    const id='anon-denied',db=anonymous(id),session=publicManager(id),writer=publicRepo(id,session);
    const [before]=await writer.list();
    await assertFails(set(ref(db as never,'hdnd/items'),{r1:{}}));
    // A public granted COLUMN must not permit arbitrary lock spam for fake IDs.
    await assertFails(set(ref(db as never,'hdnd/editLocks/nonexistent/note'),{
      uid:id,session:crypto.randomUUID(),token:crypto.randomUUID(),
      revision:1,kind:'multiline',acquiredAt:Date.now(),expiresAt:Date.now()+30000
    }));
    await assertFails(update(ref(db as never,'hdnd/items/r1'),{
      note:'Forged direct write',revision:before.revision+1}));
    await set(ref(admin() as never,'hdnd/permissions/cells/r1/note'),false);
    await expect(session.acquire('r1','note','multiline')).rejects.toThrow();
    await assertFails(get(ref(db as never,'hdnd/editLocks/r1/note')));
    const [denied]=await writer.save([updateDraft(before,undefined,{note:'Cố ghi ô bị chặn'})!]);
    expect(denied.ok).toBe(false);
    await session.acquire('r1','specificProgress','multiline');
    await set(ref(admin() as never,'hdnd/permissions/cells/r1/specificProgress'),false);
    const [revoked]=await writer.save([updateDraft(before,undefined,{specificProgress:'Quyền bị thu hồi'})!]);
    expect(revoked.ok).toBe(false);
    expect((await writer.list())[0].specificProgress).toBe(before.specificProgress);
    await session.dispose();
  });
  it('locks out anonymous visitors whenever admin locks editing or freezes data',async()=>{
    const id='anon-locked',session=publicManager(id),writer=publicRepo(id,session);
    await set(ref(admin() as never,'hdnd/control'),{
      revision:2,editingLocked:true,changedAt:new Date().toISOString()});
    await expect(session.acquire('r1','note','multiline')).rejects.toThrow();
    await set(ref(admin() as never,'hdnd/control'),{
      revision:3,editingLocked:false,changedAt:new Date().toISOString()});
    await setFreezeMode(admin() as never,actor('administrator',true),initialFreeze,'FROZEN',true);
    await expect(session.acquire('r1','note','multiline')).rejects.toThrow();
    const [baseline]=await writer.list();
    const [failed]=await writer.save([updateDraft(baseline,undefined,{note:'Cấm ghi khi đã chốt'})!]);
    expect(failed.ok).toBe(false);
    await session.dispose();
  });
  it('denies unregistered Google employee even if global column permission allows note',async()=>{
    const other=guest('not-on-allowlist');
    await assertFails(set(ref(other as never,'hdnd/editLocks/r1/note'),{
      uid:'not-on-allowlist',session:crypto.randomUUID(),token:crypto.randomUUID(),
      revision:1,kind:'multiline',acquiredAt:Date.now(),expiresAt:Date.now()+30000
    }));
    const baseline=(await get(ref(other as never,'hdnd/items/r1'))).val();
    await assertFails(update(ref(other as never,'hdnd/items/r1'),{
      note:'UID without grant',revision:baseline.revision+1
    }));
  });
  it('admits only enrolled Google UID, admin can revoke without altering cell grants',async()=>{
    const staff=guest('a'),list=ref(staff as never,'hdnd/editors/a');
    expect((await get(list)).val()).toBe(true);
    await assertFails(set(list,false));
    await set(ref(admin() as never,'hdnd/editors/a'),false);
    const managerA=manager('a');
    await expect(managerA.acquire('r1','note','multiline')).rejects.toThrow();
    await set(ref(admin() as never,'hdnd/editors/a'),true);
    await managerA.acquire('r1','note','multiline');
    await managerA.cancel('r1','note');
    await managerA.dispose();
  });
  it('QA permission guard: revoking Google UID mid-edit blocks server save even with a held lease',async()=>{
    const editor=manager('a'),writer=repo('a',editor);
    const [initial]=await writer.list();
    await editor.acquire('r1','note','multiline');
    await set(ref(admin() as never,'hdnd/editors/a'),false);
    const [result]=await writer.save([updateDraft(initial,undefined,{note:'revoked UID must not write'})!]);
    expect(result.ok).toBe(false);
    const after=(await writer.list())[0];
    expect(after.note).toBe(initial.note);
    expect(after.revision).toBe(initial.revision);
    await editor.dispose();
  });
  it('QA permission guard: per-cell deny overrides a global column allow at the lock server',async()=>{
    await set(ref(admin() as never,'hdnd/permissions/cells/r1/note'),false);
    const editor=manager('a');
    await expect(editor.acquire('r1','note','multiline')).rejects.toThrow();
    expect((await get(ref(guest('a') as never,'hdnd/editLocks/r1/note'))).val()).toBe(null);
    await editor.acquire('r1','specificProgress','multiline');
    expect(editor.proof('r1','specificProgress')).toBeTruthy();
    await editor.cancel('r1','specificProgress');await editor.dispose();
  });
  it('accepts approved one-time primary import under exclusive candidate Rules (no live Sheets)',async()=>{
    const source=parseSheetConfig(DEFAULT_SHEET_URL);
    const recordId=source.spreadsheetId+':'+source.gid+':row:3';
    const mirrored={...row,recordId,displayCode:'NQ-IM1',stt:3};
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.database() as never;
      await set(ref(db,'hdnd/items'),null);
      await set(ref(db,'hdnd/mirrors/'+source.spreadsheetId+'/'+source.gid),{
        schemaVersion:1,source:source.spreadsheetId+':'+source.gid,
        syncedAt:'2026-10-25T00:00:00Z',sourceModifiedAt:'2026-10-24T23:00:00Z',
        sha256:'a'.repeat(64),rows:[mirrored]
      });
    });
    const result=await migrateMirrorToPrimary(admin() as never,actor('administrator',true),source);
    expect(result).toEqual({sourceCount:1,importedCount:1});
    const imported=(await get(ref(admin() as never,'hdnd/items/'+recordId))).val();
    expect(imported.recordId).toBe(recordId);
    await expect(migrateMirrorToPrimary(admin() as never,actor('administrator',true),source))
      .rejects.toThrow(/đã có dữ liệu/);
  });
  it('one-time approved current Excel/Sheets snapshot initializes empty primary, reads back, never overwrites',async()=>{
    const snapshot={...row,recordId:'1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344:row:4',displayCode:'NQ-CURRENT-01'};
    await env.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database() as never,'hdnd/items'),null);
    });
    const db=admin() as never;
    const count=await bootstrapApprovedRowsToPrimary(db,actor('administrator',true),[snapshot]);
    expect(count).toEqual({sourceCount:1,importedCount:1});
    const saved=(await get(ref(db,'hdnd/items/'+snapshot.recordId))).val();
    expect(saved.recordId).toBe(snapshot.recordId);
    expect(saved.note).toBe(snapshot.note);
    expect(saved.revision).toBe(1);
    await expect(bootstrapApprovedRowsToPrimary(db,actor('administrator',true),[snapshot]))
      .rejects.toThrow(/đã có dữ liệu/);
    expect((await get(ref(db,'hdnd/items/'+snapshot.recordId))).val()).toEqual(saved);
  });
  it('approved initial bootstrap denies non-admin, duplicate business codes and closed freeze',async()=>{
    await env.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database() as never,'hdnd/items'),null);
    });
    const proposed={...row,recordId:'bootstrap-a',displayCode:'NQ-READY'};
    await expect(bootstrapApprovedRowsToPrimary(guest('a') as never,actor('a'),[proposed]))
      .rejects.toThrow(/Chỉ quản trị/);
    await expect(bootstrapApprovedRowsToPrimary(admin() as never,actor('administrator',true),[
      proposed,{...proposed,recordId:'bootstrap-b'}
    ])).rejects.toThrow(/Trùng/);
    expect((await get(ref(admin() as never,'hdnd/items'))).exists()).toBe(false);
    await env.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database() as never,'hdnd/freezeControl'),{
        mode:'FROZEN',revision:1,epoch:1,actor:'administrator',
        changedAt:Date.now(),deadline:0,closedAt:Date.now()
      });
    });
    await expect(bootstrapApprovedRowsToPrimary(admin() as never,actor('administrator',true),[proposed]))
      .rejects.toThrow(/FROZEN/);
    expect((await get(ref(admin() as never,'hdnd/items'))).exists()).toBe(false);
  });
  it('only one of two different users (or two tabs same UID) can hold the same field',async()=>{
    const a=manager('a'),b=manager('b');
    expect(await a.acquire('r1','note','multiline')).toBe(true);
    await expect(b.acquire('r1','note','multiline')).rejects.toThrow(/đang được sửa/);
    const otherTab=manager('a');
    await expect(otherTab.acquire('r1','note','multiline')).rejects.toThrow();
    expect(await b.acquire('r1','specificProgress','multiline')).toBe(true);
    expect(await activeEditLeaseCount(admin() as never)).toBe(2);
    await a.cancel('r1','note');await b.cancel('r1','specificProgress');
    await a.dispose();await b.dispose();await otherTab.dispose();
  });
  it('refuses to let a guest monopolize a field without effective permission',async()=>{
    const stranger=manager('a');
    await expect(stranger.acquire('r1','department','short')).rejects.toThrow();
    const snapshot=(await get(ref(guest('a') as never,'hdnd/editLocks/r1/department'))).val();
    expect(snapshot).toBe(null);
    const granted=manager('a');
    await granted.acquire('r1','note','multiline');
    await granted.cancel('r1','note');
    await stranger.dispose();await granted.dispose();
  });
  it('guest pause blocks new leases while a verified admin can still edit',async()=>{
    await set(ref(admin() as never,'hdnd/control'),{revision:2,editingLocked:true,changedAt:new Date().toISOString()});
    const guestManager=manager('guest'),adminManager=manager('administrator',true);
    await expect(guestManager.acquire('r1','note','multiline')).rejects.toThrow();
    expect(await adminManager.acquire('r1','note','multiline')).toBe(true);
    await adminManager.cancel('r1','note');
    await guestManager.dispose();await adminManager.dispose();
  });
  it('old tab cannot expire another lease after ownership changes within the same UID',async()=>{
    const first=manager('a'),nextTab=manager('a');
    await first.acquire('r1','note','multiline');
    const lockRef=ref(guest('a') as never,lockPath('r1','note'));
    const previous=(await get(lockRef)).val();
    await first.cancel('r1','note');
    await nextTab.acquire('r1','note','multiline');
    const current=(await get(lockRef)).val();
    expect(current.token).not.toBe(previous.token);
    await assertFails(update(lockRef,{session:previous.session,token:previous.token,
      expiresAt:0,revision:current.revision+1}));
    expect((await get(lockRef)).val().token).toBe(current.token);
    await nextTab.cancel('r1','note');
    await first.dispose();await nextTab.dispose();
  });
  it('rejects forging a longer edit category inside an active lease',async()=>{
    const a=manager('a');
    await a.acquire('r1','progressParty','status');
    const at=ref(guest('a') as never,lockPath('r1','progressParty'));
    const before=(await get(at)).val();
    await assertFails(update(at,{kind:'long',revision:before.revision+1}));
    expect((await get(at)).val().kind).toBe('status');
    await a.dispose();
  });
  it('server accepts separate fields on one row, rejects forged writes and rejects no-lease admin write',async()=>{
    const a=manager('a'),b=manager('b'),writerA=repo('a',a),writerB=repo('b',b);
    const original=(await writerA.list())[0];
    await a.acquire('r1','note','multiline');
    await b.acquire('r1','specificProgress','multiline');
    const first=(await writerA.save([updateDraft(original,undefined,{note:'Nội dung do A lưu'})!]))[0];
    expect(first.ok,first.message).toBe(true);
    const second=(await writerB.save([updateDraft(original,undefined,{specificProgress:'Tiến độ do B lưu'})!]))[0];
    expect(second.ok,second.message).toBe(true);
    const fresh=(await writerA.list())[0];
    expect(fresh.note).toBe('Nội dung do A lưu');
    expect(fresh.specificProgress).toBe('Tiến độ do B lưu');
    await assertFails(set(ref(guest('ungranted') as never,'hdnd/items/r1/note'),'bypass'));
    const adminWithoutLease=new FirebaseRepository(admin() as never,()=>actor('administrator',true),
      ()=>({columns:{note:true}}));
    const [base]=await adminWithoutLease.list();
    const denied=(await adminWithoutLease.save([updateDraft(base,undefined,{note:'Admin bypass'})!]))[0];
    expect(denied.ok).toBe(false);
    await a.cancel('r1','note');await b.cancel('r1','specificProgress');
    await a.dispose();await b.dispose();
  });
  it('denies row/collection/metadata bypass even for verified admin without cell lease',async()=>{
    const untrusted=guest('untrusted'),verified=admin();
    const original=(await get(ref(untrusted as never,'hdnd/items/r1'))).val();
    const originalNote=original.note as string;
    const forbiddenUpdate={
      note:'Attempt without acquiring lease',
      revision:original.revision+1,operationId:'forged-update',
      updatedAt:Date.now(),updatedBy:'untrusted',
    };
    // The collection-level bootstrap grant must never be reusable after a primary row exists.
    await assertFails(set(ref(verified as never,'hdnd/items'),{r1:original}));
    await assertFails(set(ref(untrusted as never,'hdnd/items'),{r1:original}));
    await assertFails(update(ref(untrusted as never,'hdnd/items/r1'),forbiddenUpdate));
    await assertFails(update(ref(verified as never,'hdnd/items/r1'),{
      ...forbiddenUpdate,updatedBy:'administrator'}));
    await assertFails(set(ref(verified as never,'hdnd/items/r1/displayCode'),'NQ-FORGED'));
    await assertFails(set(ref(untrusted as never,'hdnd/items/r1/stt'),999));
    await assertFails(set(ref(untrusted as never,'hdnd/items/r1'),null));
    const after=(await get(ref(untrusted as never,'hdnd/items/r1'))).val();
    expect(after.note).toBe(originalNote);
    expect(after.revision).toBe(original.revision);
    expect(after.displayCode).toBe(original.displayCode);
    expect(after.stt).toBe(original.stt);
  });

  it('refuses one-time primary bootstrap from non-admin and while FROZEN',async()=>{
    await env.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database() as never,'hdnd/items'),null);
    });
    const {archivedAt,...base}=row;
    const initial={r1:{...base,operationId:'bootstrap-1',
      updatedAt:Date.now(),updatedBy:'administrator'}};
    await assertFails(set(ref(guest('untrusted') as never,'hdnd/items'),initial));
    const spoof=env.authenticatedContext('spoof',{
      ...adminClaims,firebase:{sign_in_provider:'anonymous'},
    }).database();
    await assertFails(set(ref(spoof as never,'hdnd/items'),initial));
    await env.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database() as never,'hdnd/freezeControl'),{
        mode:'FROZEN',revision:1,epoch:1,actor:'administrator',
        changedAt:Date.now(),deadline:0,closedAt:Date.now(),
      });
    });
    await assertFails(set(ref(admin() as never,'hdnd/items'),initial));
    expect((await get(ref(admin() as never,'hdnd/items'))).exists()).toBe(false);
  });

  it('rejects ghost metadata-only revisions and forged audit without a changed leased field',async()=>{
    const client=guest('forger');
    const original=(await get(ref(client as never,'hdnd/items/r1'))).val();
    const forgedId='forged-metadata-only-2';
    await assertFails(update(ref(client as never,'hdnd/items/r1'),{
      revision:original.revision+1,
      operationId:forgedId,
      updatedAt:{'.sv':'timestamp'},
      updatedBy:'forger',
      history:{2:{
        operationId:forgedId,recordId:'r1',at:{'.sv':'timestamp'},
        actor:'forger',changes:{note:'fake record'},
        oldValues:{note:original.note}
      }}
    }));
    const after=(await get(ref(client as never,'hdnd/items/r1'))).val();
    expect(after.revision).toBe(original.revision);
    expect(after.operationId).toBe(original.operationId);
    expect(after.history?.['2']).toBeUndefined();
  });
  it('denies a direct field overwrite while a valid lease and saved editProof still exist',async()=>{
    const owner=guest('a'),session=manager('a'),writer=repo('a',session);
    const [original]=await writer.list();
    await session.acquire('r1','note','multiline');
    const saved=(await writer.save([updateDraft(original,undefined,{note:'Server-confirmed edit'})!]))[0];
    expect(saved.ok,saved.message).toBe(true);
    const before=(await get(ref(owner as never,'hdnd/items/r1'))).val();
    expect(before.editProofs.note).toBeTruthy();
    await assertFails(set(ref(owner as never,'hdnd/items/r1/note'),'Bypass without revision/history'));
    const after=(await get(ref(owner as never,'hdnd/items/r1'))).val();
    expect(after.note).toBe(before.note);
    expect(after.revision).toBe(before.revision);
    await session.finish('r1','note');
    await session.dispose();
  });

  it('denies rewriting existing structured audit values via descendant path',async()=>{
    const owner=guest('a'),session=manager('a'),writer=repo('a',session);
    const [original]=await writer.list();
    await session.acquire('r1','note','multiline');
    const saved=(await writer.save([updateDraft(original,undefined,{note:'Audit that must remain immutable'})!]))[0];
    expect(saved.ok,saved.message).toBe(true);
    const current=(await get(ref(owner as never,'hdnd/items/r1'))).val();
    const slot=String(current.revision%50);
    const auditPath='hdnd/items/r1/history/'+slot+'/changes/note';
    const before=(await get(ref(owner as never,auditPath))).val();
    await assertFails(set(ref(owner as never,auditPath),'{"note":"forged by direct child write"}'));
    const after=(await get(ref(owner as never,auditPath))).val();
    expect(after).toEqual(before);
    await session.finish('r1','note');
    await session.dispose();
  });

  it('saves truthful structured audit before/after values for a legitimate edit',async()=>{
    const session=manager('a'),db=guest('a'),writer=repo('a',session);
    const [original]=await writer.list();
    await session.acquire('r1','note','multiline');
    const [result]=await writer.save([updateDraft(original,undefined,{note:'Verified structured audit'})!]);
    expect(result.ok,result.message).toBe(true);
    const current=(await get(ref(db as never,'hdnd/items/r1'))).val();
    const event=current.history?.[String(current.revision%50)];
    expect(event?.changes).toEqual({note:'Verified structured audit'});
    expect(event?.oldValues).toEqual({note:original.note});
    expect(event?.changesJson).toBeUndefined();
    expect(event?.oldValuesJson).toBeUndefined();
    const retrieved=await writer.history('r1');
    expect(retrieved.at(-1)?.changes).toEqual({note:'Verified structured audit'});
    expect(retrieved.at(-1)?.oldValues).toEqual({note:original.note});
    await session.finish('r1','note');
    await session.dispose();
  });

  // KNOWN NO-GO SECURITY LIMITATION: the owning user's read access exposes
  // the lease token to another tab carrying the same Firebase auth.uid.
  // RTDB Rules cannot distinguish two browser tabs sharing one auth identity.
  // Vitest expected failure keeps this adversarial regression visible in CI,
  // without hiding it as a PASS/solved security property. Do not remove the
  // expected-failure marker without a server-enforced session isolation design.
  it.fails('KNOWN BLOCKER: deny same-UID second tab replaying a visible foreign tab lease token',async()=>{
    const first=manager('a');
    await first.acquire('r1','note','multiline');
    // Both tabs have the same Firebase UID, but NOT the same tab-local session.
    // The second tab has not obtained a lease and must not be able to save.
    const secondTab=guest('a');
    const original=(await get(ref(secondTab as never,'hdnd/items/r1'))).val();
    const visibleLease=(await get(ref(secondTab as never,'hdnd/editLocks/r1/note'))).val();
    const revision=original.revision+1;
    await assertFails(update(ref(secondTab as never,'hdnd/items/r1'),{
      note:'Unauthorised same-UID second tab',
      revision,
      operationId:'different-tab-lease-replay',
      updatedAt:serverTimestamp(),updatedBy:'a',
      ['editProofs/note']:visibleLease.token,
      ['history/'+String(revision%50)]:{
        operationId:'different-tab-lease-replay',recordId:'r1',
        at:serverTimestamp(),actor:'a',
        changes:{note:'Unauthorised same-UID second tab'},
        oldValues:{note:original.note}
      }
    }));
    const after=(await get(ref(secondTab as never,'hdnd/items/r1'))).val();
    expect(after.revision).toBe(original.revision);
    await first.cancel('r1','note');
    await first.dispose();
  });

  it('rejects a different UID even if that user learns another editor lease token',async()=>{
    const owner=manager('a');await owner.acquire('r1','note','multiline');
    const second=guest('b'),before=(await get(ref(second as never,'hdnd/items/r1'))).val();
    const lease=(await get(ref(second as never,'hdnd/editLocks/r1/note'))).val();
    const rev=before.revision+1;
    await assertFails(update(ref(second as never,'hdnd/items/r1'),{
      note:'Attempt by a different UID',revision:rev,
      operationId:'foreign-uid-token-replay',updatedAt:serverTimestamp(),updatedBy:'b',
      ['editProofs/note']:lease.token,
      ['history/'+(rev%50)]:{operationId:'foreign-uid-token-replay',
        recordId:'r1',at:serverTimestamp(),actor:'b',
        changes:{note:'Attempt by a different UID'},oldValues:{note:before.note}}
    }));
    expect((await get(ref(second as never,'hdnd/items/r1'))).val().revision).toBe(before.revision);
    await owner.cancel('r1','note');await owner.dispose();
  });

  it('prevents a valid editor from forging structured audit values while changing a leased cell',async()=>{
    const session=manager('a'),db=guest('a');
    const original=(await get(ref(db as never,'hdnd/items/r1'))).val();
    await session.acquire('r1','note','multiline');
    const nextRevision=original.revision+1;
    const historySlot=String(nextRevision%50);
    const recordRef=ref(db as never,'hdnd/items/r1');
    // A genuine edit with a genuine lease must not let the writer lie
    // about previous values or fabricate changes in the audit trail.
    await assertFails(update(recordRef,{
      note:'Real edited note',
      revision:nextRevision,
      operationId:'attack-legit-edit-fake-audit',
      updatedAt:serverTimestamp(),
      updatedBy:'a',
      ['editProofs/note']:session.proof('r1','note'),
      ['history/'+historySlot]:{
        operationId:'attack-legit-edit-fake-audit',
        recordId:'r1',at:serverTimestamp(),actor:'a',
        changes:{note:'Completely different forged content'},
        oldValues:{note:'Not the actual old note'}
      }
    }));
    expect((await get(recordRef)).val().revision).toBe(original.revision);
    await session.cancel('r1','note');
    await session.dispose();
  });

  it('publishes a server-ACKed edit to two other accounts via live RTDB onValue, without reloading',async()=>{
    const session=manager('a');
    const writer=repo('a',session);
    const readerB=repo('b',manager('b'));
    const readerAdmin=repo('administrator',manager('administrator',true),true);
    const awaitUpdate=(client:FirebaseRepository,label:string)=>new Promise<void>((resolve,reject)=>{
      let stop=()=>{};
      const timeout=setTimeout(()=>{stop();reject(new Error('Missing realtime update for '+label));},7000);
      stop=client.subscribe(rows=>{
        if(rows.find(item=>item.recordId==='r1')?.note==='Realtime đã được xác nhận'){
          clearTimeout(timeout);queueMicrotask(stop);resolve();
        }
      },error=>{clearTimeout(timeout);stop();reject(error);});
    });
    // Both observers subscribe before the writer sends anything to the server.
    const fromB=awaitUpdate(readerB,'independent verified Google employee');
    const fromAdmin=awaitUpdate(readerAdmin,'authenticated administrator');
    const [original]=await writer.list();
    await session.acquire('r1','note','multiline');
    const result=(await writer.save([updateDraft(original,undefined,{note:'Realtime đã được xác nhận'})!]))[0];
    expect(result.ok,result.message).toBe(true);
    expect(result.item?.revision).toBe(original.revision+1);
    await Promise.all([fromB,fromAdmin]);
    expect((await readerB.list())[0].note).toBe('Realtime đã được xác nhận');
    expect((await readerAdmin.list())[0].note).toBe('Realtime đã được xác nhận');
    await session.finish('r1','note');
    await session.dispose();
  });

  it('DRAINING refuses new locks but accepts previously acquired save; then FROZEN rejects everyone',async()=>{
    const a=manager('a'),writer=repo('a',a),baseline=(await writer.list())[0];
    await a.acquire('r1','note','multiline');
    const drain=await setFreezeMode(admin() as never,actor('administrator',true),initialFreeze,'DRAINING');
    expect((await readFreeze(guest('a') as never)).mode).toBe('DRAINING');
    const b=manager('b');
    await expect(b.acquire('r1','progressParty','status')).rejects.toThrow(/chốt/);
    const saved=(await writer.save([updateDraft(baseline,undefined,{note:'Lưu trước chốt'})!]))[0];
    expect(saved.ok,saved.message).toBe(true);
    await a.finish('r1','note');
    const frozen=await setFreezeMode(admin() as never,actor('administrator',true),drain,'FROZEN');
    expect(frozen.mode).toBe('FROZEN');
    await assertFails(set(ref(admin() as never,'hdnd/items/r1/note'),'Admin cố vượt chốt'));
    await assertFails(set(ref(guest('b') as never,'hdnd/items/r1/note'),'Khách cố vượt chốt'));
    await expect(b.acquire('r1','note','multiline')).rejects.toThrow();
    const reopened=await setFreezeMode(admin() as never,actor('administrator',true),frozen,'OPEN');
    expect(reopened.mode).toBe('OPEN');
    await b.acquire('r1','note','multiline');
    await b.cancel('r1','note');await a.dispose();await b.dispose();
  });
  it('server rejects all edits after DRAINING deadline even if admin browser disappeared',async()=>{
    const a=manager('a'),writer=repo('a',a);
    const [old]=await writer.list();
    await a.acquire('r1','note','multiline');
    const lease=(await get(ref(guest('a') as never,lockPath('r1','note')))).val();
    const now=Date.now();
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,'hdnd/freezeControl'),{
        mode:'DRAINING',revision:1,epoch:1,actor:'administrator',
        changedAt:lease.acquiredAt+2000,deadline:now-1000,closedAt:0
      });
    });
    // A raw authenticated write and the normal editor save both fail closed.
    const locked=await writer.save([updateDraft(old,undefined,{note:'late after drain'})!]);
    expect(locked[0].ok).toBe(false);
    const after=(await writer.list())[0];
    expect(after.note).toBe(old.note);
    const current=(await get(ref(guest('a') as never,lockPath('r1','note')))).val();
    await assertFails(update(ref(guest('a') as never,lockPath('r1','note')),{
      token:current.token,session:current.session,revision:current.revision+1,
      expiresAt:Date.now()+40000
    }));
    await a.cancel('r1','note');
    await a.dispose();
  });
  it('emergency freeze rejects in-flight old editor, whose locally retained values cannot become saved',async()=>{
    const a=manager('a'),writer=repo('a',a);
    const [original]=await writer.list();
    await a.acquire('r1','note','multiline');
    const frozen=await setFreezeMode(admin() as never,actor('administrator',true),initialFreeze,'FROZEN',true);
    expect(frozen.mode).toBe('FROZEN');
    const result=(await writer.save([updateDraft(original,undefined,{note:'Chưa từng được server xác nhận'})!]))[0];
    expect(result.ok).toBe(false);
    expect((await writer.list())[0].note).toBe(original.note);
    await a.dispose();
  });
});
