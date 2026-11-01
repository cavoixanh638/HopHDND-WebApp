
/** Reviewer-only appendix; appended to real Auth -> real Callable/onRequest
 * -> FULL Rules regression harness copied from the immutable target SHA.
 * No production calls, and no fixture bypass after the initial synthetic data setup.
 */
import {update,goOffline,goOnline} from 'firebase/database';
import {CellEditSessionManager} from '../../src/data/cell-edit-leases';
import {FirebaseRepository} from '../../src/data/firebase-repository';
import {updateDraft} from '../../src/domain/items';

const FRV_SHA=process.env.FINAL_VERIFY_TARGET_SHA??'UNPINNED';
const FRV_RULES='source/firebase/database.exclusive-candidate.rules.json';
async function frvDenied(label:string,req:()=>Promise<unknown>){
 const before=await witness();let result='ACCEPTED',reason='';
 try {await req();}catch(error:any){result='DENIED';reason=String(error?.code??error?.message??error);}
 const after=await witness();
 const unchanged=stable(before)===stable(after);
 const details={candidateSha:FRV_SHA,request:label,result,reason,
   beforeSha256:sha(stable(before)),afterSha256:sha(stable(after)),serverUnchanged:unchanged};
 console.log('FINAL_RELEASE_VERIFICATION_REQUEST '+JSON.stringify(details));
 log('FRV_'+label,before,after,details,'real signed-in Firebase Auth client SDK + FULL RTDB Rules');
 expect(result,JSON.stringify(details)).toBe('DENIED');
 expect(reason,JSON.stringify(details)).toMatch(/permission.denied|permission denied/i);
 expect(unchanged,JSON.stringify(details)).toBe(true);
 return details;
}
async function frvStageInitial(op:string,note:string){
 const imported=await bootstrapApprovedRowsToPrimary(db,admin,[row('FRV LEGACY')]);
 expect(imported.importedCount).toBe(1);
 const closed=await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
 expect(closed.mode).toBe('FROZEN');
 const approval=await prepareInitialDatasetActivation(db,admin,[row(note)],op,'frv-initial.xlsx');
 const result=await commitInitialDatasetActivation(db,admin,approval,
  'KHOI TAO V2 '+op+' '+approval.legacyRowCount+' '+approval.preview.newCount);
 expect(result.status).toBe('committed');
 const open=await setFreezeMode(db,admin,closed,'OPEN');
 expect(open.mode).toBe('OPEN');
 return await witness();
}
async function frvGuestNoteEdit(dbClient:any,user:User,expected:any,text:string){
 const gen=expected.generationId;const manager=new CellEditSessionManager(dbClient,()=>user,gen);
 try{
   const repo=new FirebaseRepository(dbClient,()=>user,
     ()=>({columns:{note:true}}),ROOT+'/generations/'+gen+'/items',expected);
   repo.leaseManager=manager;
   const original=(await repo.list())[0];
   const acquired=await manager.acquire(original.recordId,'note','multiline');
   expect(acquired).toBe(true);
   const save=(await repo.save([updateDraft(original,undefined,{note:text})!]))[0];
   expect(save.ok,save.message).toBe(true);
   await manager.finish(original.recordId,'note');
 }finally{await manager.dispose();}
 const state=await witness();
 expect(state.datasetV2.generations[gen].items.r1.note).toBe(text);
 return state;
}
it('FINAL-RELEASE-VERIFICATION FRCR-01 live A rights, A→B, historical paths denied, valid restore and B/C rights',async()=>{
 expect(FRV_SHA).toMatch(/^[0-9a-f]{40}$/);
 const first='frv_initial_admin_0001',second='frv_replace_admin_0002',restore='frv_restore_admin_0003';
 const stateA=await frvStageInitial(first,'FRV ORIGINAL A');
 const genA='gen_'+first;
 const aGrant=ROOT+'/permissions/'+genA+'/columns/note';
 // Positive: the currently active generation must still accept verified admin ACL edits.
 await set(ref(db,aGrant),true);
 const currentA=await witness();
 expect(currentA.datasetV2.permissions[genA].columns.note).toBe(true);
 const editor=await sdk('frv-guest-a');
 const guest=(await signInAnonymously(editor.auth)).user;
 const afterAEdit=await frvGuestNoteEdit(editor.database,guest,currentA.datasetV2.active,'FRV VALID A GUEST EDIT');
 const oldLease=afterAEdit.datasetV2.leases[genA]?.r1?.note;
 expect(oldLease).toBeTruthy();
 const approval=await stageDatasetReplacement(db,admin,[row('FRV ORIGINAL B')],second,'frv-replace.xlsx');
 const backupA=JSON.parse((await witness()).datasetV2.backups[second]);
 expect(JSON.parse(backupA.permissionsJson).columns.note).toBe(true);
 const beforeSwitch=await witness();
 const switched=await commitDatasetReplacement(db,admin,approval,
  'THAY '+second+' '+approval.preview.oldCount+' '+approval.preview.newCount);
 expect(switched.status).toBe('committed');
 const afterSwitch=await witness(),genB='gen_'+second;
 expect(afterSwitch.datasetV2.active.generationId).toBe(genB);
 expect(afterSwitch.datasetV2.operations[second]?.status).toBe('COMMITTED');
 expect(afterSwitch.datasetV2.generations[genA]).toEqual(beforeSwitch.datasetV2.generations[genA]);
 expect(afterSwitch.datasetV2.leases?.[genA]).toEqual(beforeSwitch.datasetV2.leases?.[genA]);
 expect(afterSwitch.datasetV2.backups[second]).toBe(beforeSwitch.datasetV2.backups[second]);
 log('FRV_REAL_PARENT_SWITCH_A_TO_B',beforeSwitch,afterSwitch,switched,'real authenticated HTTP parent CAS');
 // The real legacy FRCR-01 exploit and all related alternate administrator paths.
 const oldRoot=ROOT+'/permissions/'+genA;
 await frvDenied('HISTORICAL_PERMISSION_LEAF_SET',()=>set(ref(db,aGrant),false));
 await frvDenied('HISTORICAL_PERMISSION_LEAF_DELETE',()=>set(ref(db,aGrant),null));
 await frvDenied('HISTORICAL_PERMISSION_GEN_REPLACE',()=>set(ref(db,oldRoot),{columns:{note:false}}));
 await frvDenied('HISTORICAL_PERMISSION_GEN_DELETE',()=>set(ref(db,oldRoot),null));
 await frvDenied('HISTORICAL_PERMISSION_ROW_INSERT',()=>set(ref(db,oldRoot+'/rows/r1'),true));
 await frvDenied('HISTORICAL_PERMISSION_CELL_INSERT',()=>set(ref(db,oldRoot+'/cells/r1/note'),false));
 await frvDenied('HISTORICAL_PERMISSION_MULTI_UPDATE',()=>update(ref(db,ROOT+'/permissions'),{
    [genA+'/columns/note']:false
 }));
 await frvDenied('HISTORICAL_PERMISSION_ROOT_UPDATE',()=>update(ref(db,ROOT),{
    ['permissions/'+genA+'/columns/note']:false
 }));
 // Contrasts: unrelated historic data and ledger must not be mutable by raw admin SDK.
 await frvDenied('HISTORICAL_ROW_DIRECT_SET',()=>set(ref(db,ROOT+'/generations/'+genA+'/items/r1/note'),'FORGED'));
 await frvDenied('HISTORICAL_LEASE_DIRECT_DELETE',()=>set(ref(db,ROOT+'/leases/'+genA+'/r1/note'),null));
 await frvDenied('COMMITTED_BACKUP_REWRITE',()=>set(ref(db,ROOT+'/backups/'+second),'{"unapproved":true}'));
 await frvDenied('COMMITTED_BACKUP_DELETE',()=>set(ref(db,ROOT+'/backups/'+second),null));
 await frvDenied('COMMITTED_JOURNAL_REWRITE',()=>set(ref(db,ROOT+'/operations/'+second+'/status'),'NOT_COMMITTED'));
 await frvDenied('COMMITTED_JOURNAL_DELETE',()=>set(ref(db,ROOT+'/operations/'+second),null));
 await frvDenied('COMMITTED_CANDIDATE_REWRITE',()=>set(ref(db,ROOT+'/candidates/'+second),'{"unapproved":true}'));
 // Positive B: new generation is active, its grant can be written normally;
 // an authenticated guest can use the actual cell callable, unlike a direct raw write.
 const bGrant=ROOT+'/permissions/'+genB+'/columns/note';
 await set(ref(db,bGrant),true);
 const bGrantState=await witness();
 expect(bGrantState.datasetV2.permissions[genB].columns.note).toBe(true);
 const afterBEdit=await frvGuestNoteEdit(editor.database,guest,bGrantState.datasetV2.active,'FRV VALID B GUEST EDIT');
 expect(afterBEdit.datasetV2.generations[genB].items.r1.note).toBe('FRV VALID B GUEST EDIT');
 // Restore the sealed A; actor/provenance/digest must be recalculated, NOT copied
 // from unapproved client payload or blindly inherited pointer digest.
 const restoreApproval=afterBEdit.datasetV2.active;
 const beforeRestore=await witness();
 const restored=await restoreDatasetBackup(db,admin,second,restore,restoreApproval,'KHOI PHUC '+restore);
 const afterRestore=await witness(),genC='gen_'+restore;
 expect(restored.status).toBe('committed');
 expect(afterRestore.datasetV2.active.generationId).toBe(genC);
 expect(afterRestore.datasetV2.operations[restore]).toMatchObject({
  status:'COMMITTED',from:genB,to:genC});
 expect(afterRestore.datasetV2.permissions[genC]?.columns?.note).toBe(true);
 expect(afterRestore.datasetV2.permissions[genA]?.columns?.note).toBe(true);
 expect(afterRestore.datasetV2.permissions[genB]?.columns?.note).toBe(true);
 expect(afterRestore.datasetV2.leases?.[genC]).toBeUndefined();
 expect(afterRestore.datasetV2.backups[second]).toBe(beforeRestore.datasetV2.backups[second]);
 expect(afterRestore.datasetV2.generations[genA]).toEqual(beforeRestore.datasetV2.generations[genA]);
 expect(afterRestore.datasetV2.generations[genB]).toEqual(beforeRestore.datasetV2.generations[genB]);
 expect(afterRestore.datasetV2.leases?.[genA]).toEqual(beforeRestore.datasetV2.leases?.[genA]);
 expect(afterRestore.datasetV2.leases?.[genB]).toEqual(beforeRestore.datasetV2.leases?.[genB]);
 expect(afterRestore.datasetV2.active.digest).toMatch(/^[a-f0-9]{64}$/);
 expect(afterRestore.datasetV2.active.digest).not.toBe(beforeRestore.datasetV2.active.digest);
 log('FRV_RESTORE_ORIGINAL_COMMITTED_BACKUP',beforeRestore,afterRestore,restored,'real authenticated HTTP parent CAS');
 const afterCEdit=await frvGuestNoteEdit(editor.database,guest,afterRestore.datasetV2.active,'FRV VALID C GUEST EDIT');
 expect(afterCEdit.datasetV2.generations[genC].items.r1.note).toBe('FRV VALID C GUEST EDIT');
 await frvDenied('HISTORICAL_B_PERMISSION_AFTER_RESTORE',()=>set(ref(db,bGrant),false));
 console.log('FINAL_RELEASE_VERIFICATION_COMPLETE '+JSON.stringify({
  candidateSha:FRV_SHA,frcr01:'FIX_VERIFIED',oldGeneration:genA,replacedGeneration:genB,restoredGeneration:genC,
  restoredRights:afterRestore.datasetV2.permissions[genC],
  sourceOperation:afterRestore.datasetV2.operations[second],
  activeAfterRestore:afterCEdit.datasetV2.active,
  sourceBackupUnchanged:true}));
},120000);

it('FINAL-RELEASE-VERIFICATION FRCR-01 queued permissions write races real parent pointer switch',async()=>{
 expect(FRV_SHA).toMatch(/^[0-9a-f]{40}$/);
 const first='frv_race_initial_0001',second='frv_race_replace_0002';
 await frvStageInitial(first,'FRV RACE A');
 const genA='gen_'+first,path=ROOT+'/permissions/'+genA+'/columns/note';
 await set(ref(db,path),true);
 const staged=await stageDatasetReplacement(db,admin,[row('FRV RACE B')],second,'frv-race.xlsx');
 const race=await sdk('frv-race-admin');
 const raceAdmin=await google(race,'real-google-admin-test');
 expect(raceAdmin.email).toBe(ADMIN_EMAIL);
 await get(ref(race.database,ROOT+'/active')); // connected, valid credential before going offline
 const initial=await witness();
 expect(initial.datasetV2.active.generationId).toBe(genA);
 goOffline(race.database);
 const pending=set(ref(race.database,path),false);
 // Firebase SDK queues the write locally. It cannot have reached the server.
 const queued=await witness();expect(stable(queued)).toBe(stable(initial));
 const replaced=await commitDatasetReplacement(db,admin,staged,
  'THAY '+second+' '+staged.preview.oldCount+' '+staged.preview.newCount);
 expect(replaced.status).toBe('committed');
 const afterCommit=await witness();
 expect(afterCommit.datasetV2.active.generationId).toBe('gen_'+second);
 expect(afterCommit.datasetV2.permissions[genA].columns.note).toBe(true);
 const afterServerCommitHash=sha(stable(afterCommit));
 goOnline(race.database);
 const outcome=await Promise.race([
  pending.then(()=>({state:'ACCEPTED',error:''})).catch((e:any)=>({
    state:'DENIED',error:String(e?.code??e?.message??e)})),
  new Promise<{state:string,error:string}>(resolve=>setTimeout(
    ()=>resolve({state:'TIMEOUT',error:'queued SDK request never resolved'}),10000))
 ]);
 const afterFlush=await witness();
 const details={candidateSha:FRV_SHA,request:'queued verified-admin permission change A before real A→B',
  order:'client offline queue → real authenticated parent CAS B commit → client reconnect + Rules server decision',
  pointerBefore:initial.datasetV2.active.generationId,
  pointerAfter:afterCommit.datasetV2.active.generationId,
  queuedBeforeServerWrite:sha(stable(initial))===sha(stable(queued)),
  outcome,serverAfterCommitSha256:afterServerCommitHash,
  serverAfterQueuedWriteSha256:sha(stable(afterFlush)),
  afterA:afterFlush.datasetV2.permissions[genA]?.columns?.note,
  noMutation:stable(afterCommit)===stable(afterFlush)};
 console.log('FINAL_RELEASE_VERIFICATION_POINTER_RACE '+JSON.stringify(details));
 log('FRV_QUEUED_PERMISSION_POINTER_SWITCH_COMMIT_RACE',afterCommit,afterFlush,details,
   'real verified Google Auth SDK queued offline; server Rules evaluate after actual parent HTTP CAS');
 expect(outcome.state,JSON.stringify(details)).toBe('DENIED');
 expect(outcome.error).toMatch(/permission.denied|permission denied/i);
 expect(details.noMutation).toBe(true);
 expect(details.afterA).toBe(true);
 const backed=JSON.parse(afterFlush.datasetV2.backups[second]);
 expect(JSON.parse(backed.permissionsJson).columns.note).toBe(true);
 const restore='frv_race_restore_0003',prior=await witness();
 const result=await restoreDatasetBackup(db,admin,second,restore,prior.datasetV2.active,'KHOI PHUC '+restore);
 const final=await witness();
 expect(result.status).toBe('committed');
 expect(final.datasetV2.active.generationId).toBe('gen_'+restore);
 log('FRV_RESTORE_AFTER_RACE_DENIAL',prior,final,result,'real authenticated parent CAS');
},120000);
