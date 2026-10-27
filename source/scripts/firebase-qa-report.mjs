#!/usr/bin/env node
/**
 * Turn Vitest's machine-readable JSON into a QA acceptance ledger.
 * NO production credentials, data, rules deployments or operations.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const dir=resolve('qa-results');
mkdirSync(dir,{recursive:true});
const source=resolve(dir,'firebase-vitest.json');
const mdPath=resolve(dir,'firebase-qa-report.md');
const jsonPath=resolve(dir,'firebase-qa-summary.json');
const htmlPath=resolve(dir,'firebase-qa-report.html');
const scenarios=[
  {id:'AUTH',label:'Xác thực, tài khoản Google, chặn khách',terms:/authentication|auth|anonymous|google|admin provider|identity|tab/i},
  {id:'ACL',label:'Cấp/cấm quyền, UID được duyệt',terms:/allowlist|permission|grant|revoke|editor|enroll|admin|unregistered|untrusted|unauthoriz|forger/i},
  {id:'LEASE',label:'Khóa ô độc quyền và token',terms:/lease|same.cell|different.cell|tab|token|session|lock|editing category/i},
  {id:'SAVE',label:'Lưu dữ liệu, xung đột, CAS',terms:/save|server|stale|revision|write|conflict|merge|replay|bypass|update/i},
  {id:'LIVE',label:'Đồng bộ realtime và mất mạng',terms:/realtime|onValue|broadcast|offline|reconnect|second browser|two other accounts/i},
  {id:'AUDIT',label:'Nhật ký và chống giả mạo',terms:/audit|history|forg|immutable/i},
  {id:'FREEZE',label:'Khóa sửa và chốt dữ liệu',terms:/freeze|frozen|draining|emergency|paused|pause|deadline|locked/i},
  {id:'IMPORT',label:'Khởi tạo và không ghi đè dữ liệu',terms:/bootstrap|import|mirror|primary|migration|overwrite|duplicate/i}
];
const knownRisk="KNOWN BLOCKER: deny same-UID second tab replaying a visible foreign tab lease token";
let results,loadError='';
try{results=JSON.parse(readFileSync(source,'utf8'));}catch(e){loadError=e.message;results={testResults:[]};}
const tests=[];
for(const file of results.testResults??[]){
  for(const t of file.assertionResults??[]){
    const name=String(t.fullName||t.title||'Unknown test');
    const status=t.status==='passed'?'PASS':t.status==='failed'?'FAIL':'SKIP';
    const groups=scenarios.filter(s=>s.terms.test(name)).map(s=>s.id);
    tests.push({name,status,groups,knownRisk:name.includes(knownRisk),
      suite:String(file.name??'').split(/[\\/]/).at(-1)??'unknown'});
  }
}
const risks=tests.filter(t=>t.knownRisk);
const failed=tests.filter(t=>t.status==='FAIL');
const passed=tests.filter(t=>t.status==='PASS');
const skipped=tests.filter(t=>t.status==='SKIP');
const ledger=scenarios.map(s=>{
  const matching=tests.filter(t=>t.groups.includes(s.id));
  return {id:s.id,name:s.label,total:matching.length,passed:matching.filter(t=>t.status==='PASS').length,
    failed:matching.filter(t=>t.status==='FAIL').length,skipped:matching.filter(t=>t.status==='SKIP').length};
});
const uncovered=ledger.filter(x=>x.total===0);
const candidateCount=tests.filter(t=>t.suite==='exclusive-cell-freeze.test.ts').length;
const legacyCount=tests.filter(t=>t.suite==='firebase-production-rules.test.ts'||t.suite==='firebase-emulator.test.ts').length;
const authCount=tests.filter(t=>t.suite==='firebase-tab-auth.test.ts').length;
const alerts=[
  'RULES CHƯA KIỂM CHỨNG: bộ kiểm thử nạp firebase/database.exclusive-candidate.rules.json trên Emulator, KHÔNG đọc Rules hiện hành trên Cloud.',
  'DATA CHƯA KIỂM CHỨNG: không đụng cơ sở dữ liệu hophdnd-8b7b2. Không chứng minh người dùng thật đã có quyền hoặc dữ liệu đã chuyển nguồn.',
  'BẢO MẬT CÒN GIỚI HẠN: hai tab chia sẻ cùng một Firebase Google UID có thể sao chép token khóa mà Rules không nhận biết đây là tab khác.',
  'PHẠM VI ĐỌC: Rules ứng viên có hdnd/.read=auth!=null, vì vậy người đã xác thực có thể đọc nhiều nhánh chung, không phải phân quyền đọc từng nhân viên.',
  'VẬN HÀNH: cần thử ít nhất 2 UID Google thật, Rules published, backup/restore và kiểm tra chuyển dữ liệu trước khi GO.'
];
const sha=createHash('sha256').update(readFileSync('firebase/database.exclusive-candidate.rules.json')).digest('hex');
const report={
  generatedAt:new Date().toISOString(),
  environment:'ISOLATED LOCAL FIREBASE AUTH + RTDB EMULATOR — NOT PRODUCTION',
  project:'demo-hdnd',
  candidateRulesSha256:sha,
  executableTests:tests.length,
  candidateRulesTestCount:candidateCount,
  legacyCompatibilityTestCount:legacyCount,
  authTestCount:authCount,
  passed:passed.length,
  failed:failed.length,
  skipped:skipped.length,
  expectedFailKnownRiskCount:risks.length,
  categories:ledger,
  hasCoverageGaps:uncovered.length>0,
  operationalVerdict:'NOT VERIFIED FOR LIVE PRODUCTION',
  emulatorVerdict:loadError||failed.length||uncovered.length||!tests.length||!risks.length?'FAIL / INCOMPLETE':'PASS WITH DOCUMENTED RISK',
  alerts,
  tests,
  ...(loadError?{reportError:loadError}:{})
};
writeFileSync(jsonPath,JSON.stringify(report,null,2)+'\n');
const headings=[
  '# HopHDND · Tự động kiểm thử Firebase — Báo cáo QA',
  '',
  '**Trạng thái:** '+report.emulatorVerdict+' (chỉ Firebase Emulator, dữ liệu mô phỏng)',
  '',
  '| Thông tin | Kết quả |',
  '|---|---|',
  '| Thời điểm | '+report.generatedAt+' |',
  '| Project kiểm thử | '+report.project+' (Emulator) |',
  '| SHA-256 Rules ứng viên | '+sha+' |',
  '| Bài kiểm thử | '+tests.length+' |',
  '| Rules ứng viên khóa ô hiện tại (exclusive-candidate) | '+candidateCount+' bài |',
  '| Tương thích Rules cũ / ứng viên trước đó | '+legacyCount+' bài |',
  '| Định danh Auth qua nhiều tab | '+authCount+' bài |',
  '| PASS / FAIL / SKIP | '+passed.length+' / '+failed.length+' / '+skipped.length+' |',
  '| Kiểm thử dự kiến THẤT BẠI do lỗ hổng đã biết | '+risks.length+' |',
  '| Firebase Cloud hiện hành | **CHƯA KIỂM CHỨNG** |',
  '',
  '## Các nhóm chức năng',
  '| Mảng | Bài kiểm tra | PASS | FAIL | SKIP |',
  '|---|---:|---:|---:|---:|',
  ...ledger.map(x=>'| '+x.name+' | '+x.total+' | '+x.passed+' | '+x.failed+' | '+x.skipped+' |'),
  '',
  '**Phạm vi Rules:** các bài trong `exclusive-cell-freeze.test.ts` dùng chính bộ Rules ứng viên khóa ô mới nhất. Các suite `firebase-emulator` và `firebase-production-rules` là kiểm thử tương thích Rules đời trước, không được cộng gộp để khẳng định tất cả là kiểm thử Rules mới.',
  '',
  '## Bài kiểm thử chi tiết',
  ...tests.map(t=>'- '+(t.knownRisk?'⚠️ EXPECTED FAILURE / CHƯA KHẮC PHỤC':t.status)+
    ' · '+t.name.replaceAll('|','/')+' [`'+t.suite+'`]'),
  '',
  '## Những gì chưa được chứng minh',
  ...alerts.map(s=>'- '+s),
  '',
  ...(uncovered.length?['## Thiếu bài thử bắt buộc',...uncovered.map(x=>'- '+x.name),'']:[]),
  ...(failed.length?['## Test FAIL',...failed.map(x=>'- '+x.name),'']:[]),
  ...(loadError?['## Không đọc được Vitest JSON',loadError,'']:[]),
  '**Không được chuyển bộ kiểm thử này thành tuyên bố production GO.**',
  ''
];
const md=headings.join('\n');
writeFileSync(mdPath,md,'utf8');
const htmlEscape=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rows=ledger.map(x=>'<tr><td>'+htmlEscape(x.name)+'</td><td>'+x.total+'</td><td>'+x.passed+'</td><td>'+x.failed+'</td><td>'+x.skipped+'</td></tr>').join('');
const cases=tests.map(t=>'<tr><td>'+htmlEscape(t.knownRisk?'KNOWN GAP':t.status)+'</td><td>'+htmlEscape(t.name)+'</td></tr>').join('');
const html='<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HopHDND · Firebase QA</title><style>body{font:15px/1.6 system-ui,sans-serif;max-width:1050px;margin:auto;padding:25px;color:#182c34}h1{font-size:26px}p{max-width:90ch}table{border-collapse:collapse;width:100%;margin:14px 0 28px}th,td{border:1px solid #d6dfe4;text-align:left;padding:8px 10px}th{background:#f3f7f8}.risk{border-left:4px solid #a76118;padding:9px 14px;background:#fff7ed}small{color:#52646e}</style></head><body>'+
'<h1>Kiểm thử Firebase HopHDND</h1><p><strong>'+htmlEscape(report.emulatorVerdict)+'</strong> — thử trên emulator, KHÔNG phải hệ thống thật</p>'+
'<p>PASS '+passed.length+' · FAIL '+failed.length+' · SKIP '+skipped.length+' · Known gap '+risks.length+'</p>'+
'<small>Candidate Rules SHA-256 '+sha+' · '+report.generatedAt+'</small>'+
'<h2>Nhóm chức năng</h2><table><thead><tr><th>Nhóm</th><th>Tổng</th><th>PASS</th><th>FAIL</th><th>SKIP</th></tr></thead><tbody>'+rows+'</tbody></table>'+
'<h2>Giới hạn chưa nghiệm thu</h2>'+alerts.map(a=>'<p class="risk">'+htmlEscape(a)+'</p>').join('')+
'<h2>Kiểm thử chi tiết</h2><table><thead><tr><th>Kết quả</th><th>Kịch bản</th></tr></thead><tbody>'+cases+'</tbody></table>'+
'</body></html>';
writeFileSync(htmlPath,html,'utf8');
if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,md,{flag:'a'});
console.log('FIREBASE_QA_REPORT',JSON.stringify({passed:passed.length,failed:failed.length,skipped:skipped.length,knownRisk:risks.length,emulator:report.emulatorVerdict,cloud:'UNVERIFIED'}));
if(report.emulatorVerdict!=='PASS WITH DOCUMENTED RISK')process.exitCode=1;
