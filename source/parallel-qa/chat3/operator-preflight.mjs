/** Chat 3: invoke the shipped CLI itself, never a test-only wrapper. */
import {strict as assert} from 'node:assert';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as XLSX from 'xlsx';
const sha=x=>createHash('sha256').update(x).digest('hex');
const root=mkdtempSync(join(tmpdir(),'chat3-first-import-'));
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const env={...process.env,GCLOUD_PROJECT:'demo-hdnd',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',
 FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',FIREBASE_EMULATOR_HUB:'127.0.0.1:4400'};
function cli(args,input=''){return spawnSync(process.execPath,['scripts/operator-first-import.mjs',...args],
 {cwd:process.cwd(),env,encoding:'utf8',input,timeout:60000});}
const headers=['Mã nội dung','STT','Nội dung trình','Sở, ngành','Loại VB',
'Cấp cho ý kiến Thành ủy','Tiến độ xin ý kiến Thành ủy','Trình HĐND xây dựng NQ',
'Trình HĐND ban hành NQ','Chuyên viên','Phòng','Lãnh đạo VP','Lãnh đạo UBND',
'Tiến độ hiện tại','Ghi chú'];
const values=['NQ-CHAT3-01',1,'Hồ sơ MẪU','Sở MẪU','QPPL','BCH','Sở chưa trình',
 'Sở chưa trình','Sở chưa trình','Chuyên viên MẪU','Phòng MẪU','','','',''];
try{
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers,values]),'Approved');
 const xlsx=join(root,'synthetic.xlsx'),approvalFile=join(root,'approval.json');
 const bytes=Buffer.from(XLSX.write(wb,{bookType:'xlsx',type:'buffer'}));
 writeFileSync(xlsx,bytes);
 const hash=sha(bytes);
 const approval={schema:'PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1',project:'demo-hdnd',
  databaseURL:'https://demo-hdnd.firebaseio.com/',sourceSha,workbookSha256:hash,
  sheet:'Approved',expectedRows:1,expectedState:'EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT',
  fullRootSnapshotSha256:sha('null'),operatorEmail:'cavoixanh638@gmail.com',approved:true};
 writeFileSync(approvalFile,JSON.stringify(approval));
 const args=['--mode','emulator','--project','demo-hdnd','--database-url',
 'https://demo-hdnd.firebaseio.com','--api-key','demo-key','--auth-domain',
 'demo-hdnd.firebaseapp.com','--app-id','demo-operator','--xlsx',xlsx,
 '--sheet','Approved','--approval-file',approvalFile,'--source-sha',sourceSha,
 '--confirm','IMPORT_ONCE_demo-hdnd_'+hash.slice(0,12)];
 let n=0;
 function rejected(name,argv,expected,input=''){
  const r=cli(argv,input);
  assert.equal(r.status,2,name+': '+r.stderr+' '+r.stdout);
  assert.match(r.stderr,new RegExp(expected),name);
  assert.doesNotMatch(r.stdout+r.stderr,/eyJhbGciOi|DO_NOT_PRINT_SECRET/);
  console.log('CHAT3_PREFLIGHT_PASS',++n,name);
 }
 rejected('no approval',[...args.slice(0,args.indexOf('--approval-file'))],'APPROVAL_FILE_REQUIRED');
 rejected('wrong source sha',args.map((x,i)=>i===args.indexOf('--source-sha')+1?'0'.repeat(40):x),'FROZEN_CHECKOUT_SHA_MISMATCH');
 rejected('wrong confirmation',args.map((x,i)=>i===args.indexOf('--confirm')+1?'NO':x),'EXPLICIT_IMPORT_ONCE_CONFIRMATION_REQUIRED');
 const wrongHash={...approval,workbookSha256:'0'.repeat(64)};
 writeFileSync(approvalFile,JSON.stringify(wrongHash));
 rejected('approval digest mismatch',args,'APPROVAL_DOES_NOT_BIND_SOURCE_PROJECT_EMPTY_STATE');
 writeFileSync(approvalFile,JSON.stringify(approval));
 const broken=join(root,'broken.xlsx');writeFileSync(broken,'bad');
 rejected('malformed Excel',args.map((x,i)=>i===args.indexOf('--xlsx')+1?broken:x),'PREWRITE_AUTH_OR_SOURCE_ERROR|Excel');
 const noToken=cli(args);
 assert.equal(noToken.status,2,noToken.stderr);
 assert.match(noToken.stderr,/GOOGLE_ID_TOKEN_STDIN_REQUIRED/);
 console.log('CHAT3_PREFLIGHT_PASS',++n,'missing stdin credential');
 const report=join(root,'private.json');
 const auth=JSON.stringify({sub:'chat3-unverified',email:'cavoixanh638@gmail.com',
  email_verified:false,name:'DO_NOT_PRINT_SECRET'});
 const denied=cli([...args,'--output',report],auth);
 assert.equal(denied.status,2,denied.stderr);
 assert.match(denied.stderr,/VERIFIED_GOOGLE_ADMIN_REQUIRED|PREWRITE_AUTH_OR_SOURCE_ERROR/);
 assert.doesNotMatch(denied.stdout+denied.stderr,/DO_NOT_PRINT_SECRET/);
 console.log('CHAT3_PREFLIGHT_PASS',++n,'unverified admin');
 assert(!readFileSync(approvalFile,'utf8').includes('DO_NOT_PRINT_SECRET'));
 console.log('CHAT3_PREFLIGHT_TOTAL',n);
}finally{rmSync(root,{recursive:true,force:true});}
