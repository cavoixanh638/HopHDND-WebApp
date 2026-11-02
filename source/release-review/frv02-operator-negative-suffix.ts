
/** Independent QA-only negative suite appended to a detached exact-SHA parent
 * Auth + real two-Functions + FULL RTDB Rules harness. No production access,
 * no Rules bypass, no direct seed for the bootstrap operation under test.
 */
function qaOperatorFixture(folder:string) {
 const sheet='Approved',excel=join(folder,'source.xlsx'),approval=join(folder,'approval.json');
 const wb=XLSX.utils.book_new();
 const values=['NQ-QA-0001',1,'Synthetic QA operator approved row','QA office',
  'QPPL','BCH','Sở chưa trình','Sở chưa trình','Sở chưa trình',
  'QA expert','QA room','QA VP','QA UBND','QA progress','QA note'];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([[...BUSINESS_HEADERS],values]),sheet);
 const buffer=Buffer.from(XLSX.write(wb,{bookType:'xlsx',type:'buffer'}));
 writeFileSync(excel,buffer);
 const parsed=parseBusinessExcel(buffer,sheet);
 const workbookHash=createHash('sha256').update(buffer).digest('hex');
 const a={schema:'PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1',
  project:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com/',
  sourceSha:FRV_SHA,workbookSha256:workbookHash,sheet,
  expectedRows:parsed.count,expectedState:'EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT',
  fullRootSnapshotSha256:sha(stable(null)),fullRootSnapshotReadAt:new Date().toISOString(),
  operatorEmail:ADMIN_EMAIL,approved:true};
 writeFileSync(approval,JSON.stringify(a));
 const args=['scripts/operator-first-import.mjs','--mode','emulator','--project','demo-hdnd',
  '--database-url','https://demo-hdnd.firebaseio.com',
  '--api-key','demo-key','--auth-domain','demo-hdnd.firebaseapp.com',
  '--app-id','demo-qa-operator','--xlsx',excel,'--sheet',sheet,
  '--approval-file',approval,'--source-sha',FRV_SHA,
  '--confirm','IMPORT_ONCE_demo-hdnd_'+workbookHash.slice(0,12),
  '--output',join(folder,'result.json')];
 return {args,excel,approval,workbookHash,parsed};
}
function qaRunOperator(args:string[],input:string){
 return spawnSync(process.execPath,args,{
  cwd:process.cwd(),input,encoding:'utf8',timeout:45000,
  env:{...process.env,GCLOUD_PROJECT:'demo-hdnd'}});
}
const qaAdminToken=()=>JSON.stringify({sub:'qa-operator-reviewer',email:ADMIN_EMAIL,
 email_verified:true,name:'synthetic QA only'});
it('FINAL-ACCEPTANCE independent operator negative matrix: corrupt XLSX, no approval/confirm, nonadmin and no token all HOLD without any server change',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'qa-operator-negative-'));
 try{
  const {args,excel,approval}=qaOperatorFixture(folder);
  const before=await witness();
  expect(before).toBeNull();
  const cases:Array<[string,string[],string]>=[];
  cases.push(['MISSING_CONFIRM',args.filter((v,i)=>i!==args.indexOf('--confirm')&&i!==args.indexOf('--confirm')+1),qaAdminToken()]);
  const badConfirm=[...args];badConfirm[badConfirm.indexOf('--confirm')+1]='UNAPPROVED';
  cases.push(['INVALID_CONFIRM',badConfirm,qaAdminToken()]);
  const noApproval=[...args];noApproval[noApproval.indexOf('--approval-file')+1]=join(folder,'missing-approval.json');
  cases.push(['MISSING_APPROVAL',noApproval,qaAdminToken()]);
  const corrupt=join(folder,'corrupt.xlsx');writeFileSync(corrupt,'not-an-excel-archive');
  const badFile=[...args];badFile[badFile.indexOf('--xlsx')+1]=corrupt;
  cases.push(['CORRUPT_XLSX',badFile,qaAdminToken()]);
  const corruptApproval=join(folder,'wrong-digest.json');
  const a=JSON.parse(readFileSync(approval,'utf8'));a.workbookSha256='f'.repeat(64);
  writeFileSync(corruptApproval,JSON.stringify(a));
  const wrongDigest=[...args];wrongDigest[wrongDigest.indexOf('--approval-file')+1]=corruptApproval;
  cases.push(['APPROVAL_WRONG_DIGEST',wrongDigest,qaAdminToken()]);
  cases.push(['NO_AUTH_TOKEN',args,'']);
  cases.push(['NOT_ADMIN_GOOGLE',args,JSON.stringify({
   sub:'qa-unauthorized-operator',email:'unauthorized@example.invalid',
   email_verified:true,name:'Synthetic nonadmin'})]);
  for(const [label,argv,stdin] of cases){
   const start=sha(stable(await witness()));
   const r=qaRunOperator(argv,stdin);
   expect(r.status,label+' unexpectedly succeeded').not.toBe(0);
   expect(r.stderr,label+' must fail closed').toContain('PR147_BOOTSTRAP_HOLD_');
   const end=sha(stable(await witness()));
   expect(end,label+' modified server').toBe(start);
   console.log('FINAL_ACCEPTANCE_OPERATOR_NEGATIVE '+JSON.stringify({
    candidateSha:FRV_SHA,request:label,result:'DENIED',serverBeforeSha256:start,
    serverAfterSha256:end,unchanged:true,secretLogged:false}));
  }
  expect(await witness()).toBeNull();
 }finally{rmSync(folder,{recursive:true,force:true});}
},180000);

it('FINAL-ACCEPTANCE independent operator nonempty server refuses approved import with exact server snapshot preserved',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'qa-operator-nonempty-'));
 try{
  const {args}=qaOperatorFixture(folder);
  const initial=await witness();expect(initial).toBeNull();
  // Establish nonempty state exclusively through the existing guarded admin
  // browser CAS API; NO privileged database seed or Rules bypass.
  const created=await bootstrapApprovedRowsToPrimary(db,admin,[row('QA EXISTING LEGACY')]);
  expect(created.importedCount).toBe(1);
  const before=await witness(),digest=sha(stable(before));
  const r=qaRunOperator(args,qaAdminToken());
  expect(r.status,'nonempty target must refuse bootstrap').not.toBe(0);
  expect(r.stderr).toContain('PR147_BOOTSTRAP_HOLD_');
  const after=await witness();
  expect(sha(stable(after))).toBe(digest);
  console.log('FINAL_ACCEPTANCE_OPERATOR_NONEMPTY '+JSON.stringify({
   candidateSha:FRV_SHA,request:'approved Excel + admin against NONEMPTY root',
   result:'DENIED',serverBeforeSha256:digest,
   serverAfterSha256:sha(stable(after)),unchanged:true,
   existingItems:Object.keys(after?.items??{}).length}));
 }finally{rmSync(folder,{recursive:true,force:true});}
},90000);

it('FINAL-ACCEPTANCE independent direct audit tamper denied under FULL Rules',async()=>{
 await frvStageInitial('qa_audit_activate_0001','QA ORIGINAL');
 const gen='gen_qa_audit_activate_0001';
 await set(ref(db,ROOT+'/permissions/'+gen+'/columns/note'),true);
 const userCtx=await sdk('qa-audit-guest');
 const guest=(await signInAnonymously(userCtx.auth)).user;
 await frvGuestNoteEdit(userCtx.database,guest,(await witness()).datasetV2.active,'QA EDITED');
 const path=ROOT+'/generations/'+gen+'/items/r1/history/2/actor';
 await frvDenied('QA_AUDIT_ACTOR_DIRECT_TAMPER',()=>set(ref(db,path),'FORGED-ACTOR'));
 await frvDenied('QA_AUDIT_ACTOR_MULTIPATH_TAMPER',()=>update(ref(db,ROOT),{
  ['generations/'+gen+'/items/r1/history/2/actor']:'FORGED-ACTOR'
 }));
},120000);
