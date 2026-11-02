/**
 * COORD-01: Windows-native regression against the SHIPPED operator CLI.
 * No Emulator, Firebase client authentication, real credentials or CAS occurs:
 * all cases stop at the output preflight or at empty stdin, before Auth/RTDB.
 */
import {strict as assert} from 'node:assert';
import {mkdtempSync,mkdirSync,existsSync,rmSync,writeFileSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as XLSX from 'xlsx';

if(process.platform!=='win32')throw Error('COORD01_REQUIRES_REAL_WINDOWS_NODE_RUNNER');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const checkout=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const root=mkdtempSync(join(tmpdir(),'chat3-coord01-real-cli-'));
const sibling=mkdtempSync(join(dirname(checkout),basename(checkout)+'-coord01-'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const headers=['Mã nội dung','STT','Nội dung trình','Sở, ngành','Loại VB',
 'Cấp cho ý kiến Thành ủy','Tiến độ xin ý kiến Thành ủy','Trình HĐND xây dựng NQ',
 'Trình HĐND ban hành NQ','Chuyên viên','Phòng','Lãnh đạo VP','Lãnh đạo UBND',
 'Tiến độ hiện tại','Ghi chú'];
const data=['NQ-COORD01-01',1,'Hồ sơ tổng hợp COORD-01','Sở mẫu','QPPL',
 'BCH','Sở chưa trình','Sở chưa trình','Sở chưa trình','Chuyên viên mẫu',
 'Phòng mẫu','','','',''];
const env={...process.env,GCLOUD_PROJECT:'demo-hdnd',
 FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',
 FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',
 FIREBASE_EMULATOR_HUB:'127.0.0.1:4400'};
let cases=0;

function invoke(args,expected,output,preexists=false){
 const result=spawnSync(process.execPath,['scripts/operator-first-import.mjs',...args,
  '--output',output],{cwd:process.cwd(),env,input:'',encoding:'utf8',timeout:60000});
 assert.equal(result.status,2,
  'real CLI expected prewrite exit 2; observed '+result.status+' / '+result.stderr);
 assert(result.stderr.includes(expected),
  'real CLI expected '+expected+'; got '+result.stderr);
 assert.equal(existsSync(output),preexists,'the CLI must not create an output receipt before CAS');
 assert(!result.stderr.includes('PR147_OPERATOR_FIRST_IMPORT_CAS_ATTEMPT_MARKED_NO_AUTO_RETRY'));
 assert(!result.stdout.includes('PR147_OPERATOR_FIRST_IMPORT_CAS_READBACK_PASS'));
 console.log('CHAT3_COORD01_WINDOWS_CLI_PASS',++cases,expected);
}

try{
 const workbook=join(root,'approved.xlsx'),approvalFile=join(root,'approval.json');
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers,data]),'Approved');
 const bytes=Buffer.from(XLSX.write(wb,{bookType:'xlsx',type:'buffer'}));
 writeFileSync(workbook,bytes);
 const digest=sha(bytes);
 const approval={schema:'PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1',
  project:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com/',
  sourceSha,workbookSha256:digest,sheet:'Approved',expectedRows:1,
  expectedState:'EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT',fullRootSnapshotSha256:sha('null'),
  operatorEmail:'cavoixanh638@gmail.com',approved:true};
 writeFileSync(approvalFile,JSON.stringify(approval));
 const args=['--mode','emulator','--project','demo-hdnd','--database-url',
 'https://demo-hdnd.firebaseio.com','--api-key','demo-key','--auth-domain',
 'demo-hdnd.firebaseapp.com','--app-id','demo-operator','--xlsx',workbook,
 '--sheet','Approved','--approval-file',approvalFile,'--source-sha',sourceSha,
 '--confirm','IMPORT_ONCE_demo-hdnd_'+digest.slice(0,12)];

 // Checkout root itself, and two nesting levels including a path outside source/.
 invoke(args,'PR147_BOOTSTRAP_HOLD_PRIVATE_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED',checkout,true);
 const inside=[join(checkout,'coord01-should-not-exist.json'),
  join(process.cwd(),'parallel-qa','chat3','coord01-should-not-exist.json')];
 for(const path of inside)
  invoke(args,'PR147_BOOTSTRAP_HOLD_PRIVATE_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED',path);

 // A symlink/junction outside the checkout pointing inside must be resolved
 // BEFORE containment is checked. Windows junctions work without admin rights.
 const alias=join(root,'junction-into-checkout');
 symlinkSync(join(process.cwd(),'parallel-qa','chat3'),alias,'junction');
 invoke(args,'PR147_BOOTSTRAP_HOLD_PRIVATE_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED',
  join(alias,'coord01-should-not-exist.json'));

 // Reaching missing stdin proves the REAL production path guard passed.
 // No token, network authentication, CAS or output receipt is attempted.
 const outsideDir=join(root,'private');mkdirSync(outsideDir,{recursive:true});
 invoke(args,'PR147_BOOTSTRAP_HOLD_GOOGLE_ID_TOKEN_STDIN_REQUIRED',
  join(outsideDir,'outside-receipt.json'));

 // Same-prefix sibling must NOT be mistaken for a child of checkout.
 invoke(args,'PR147_BOOTSTRAP_HOLD_GOOGLE_ID_TOKEN_STDIN_REQUIRED',
  join(sibling,'sibling-receipt.json'));

 console.log('CHAT3_COORD01_WINDOWS_REAL_CLI_TOTAL',cases);
 assert.equal(cases,6);
}finally{
 rmSync(root,{recursive:true,force:true});
 rmSync(sibling,{recursive:true,force:true});
}
