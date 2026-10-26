#!/usr/bin/env node
/**
 * READ-ONLY RTDB backup for the operator's already-authenticated Firebase CLI.
 * Nothing is uploaded to GitHub and this script has no deploy/set/remove code.
 *
 * Example on Windows (after firebase login):
 * node scripts/firebase-production-readonly-backup.mjs \
 *   --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb \
 *   --rules-file "C:\private\firebase-rules-export.json" \
 *   --output-dir "C:\private\hophdnd-backup-20261025"
 *
 * The Rules file must be an exact export of the CURRENT Firebase Console rules,
 * not the GitHub candidate. Operator must verify its provenance manually.
 */
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,copyFile,rm,stat,chmod} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,relative,resolve,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
const PROJECT='hophdnd-8b7b2';
const INSTANCE='hophdnd-8b7b2-default-rtdb';
const MAX_BYTES=100*1024*1024;
const hash=input=>createHash('sha256').update(input).digest('hex');
const inside=(parent,target)=>{const r=relative(parent,target);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!isAbsolute(r));};
const fail=message=>{throw Error(message);};
const readJson=async(path)=>{
  const raw=await readFile(path);
  if(raw.byteLength<3||raw.byteLength>MAX_BYTES)fail('File JSON trống hoặc vượt giới hạn 100MB.');
  try{return {value:JSON.parse(raw.toString('utf8')),digest:hash(raw),bytes:raw.byteLength};}
  catch{fail('File không phải JSON hợp lệ.');}
};
const args=process.argv.slice(2);
if(args.includes('--help')){
  process.stdout.write([
    'Firebase RTDB READ-ONLY backup (không ghi Database, không deploy)',
    'Yêu cầu: npm ci tại source/; đăng nhập Firebase CLI trên chính máy vận hành.',
    'node scripts/firebase-production-readonly-backup.mjs',
    '  --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb',
    '  --rules-file PATH_TO_CURRENT_CONSOLE_RULES.json --output-dir ABSOLUTE_PRIVATE_DIRECTORY',
    'Lưu ý: Rules phải sao chép từ Firebase Console thật ở thời điểm backup.',
    'Script đọc lại database lần 2 để xác minh snapshot ổn định, không ghi database.'
  ].join('\n')+'\n');process.exit(0);
}
const options={};
for(let i=0;i<args.length;i+=2){
  const key=args[i],value=args[i+1];
  if(!['--project','--instance','--rules-file','--output-dir'].includes(key)||!value||options[key])
    fail('Sai tham số hoặc thiếu đường dẫn. Chạy --help để xem hướng dẫn.');
  options[key]=value;
}
if(options['--project']!==PROJECT||options['--instance']!==INSTANCE)
  fail('Sai Firebase project/instance. Script chỉ cho phép dự án HopHDND đã xác định.');
if(!options['--rules-file']||!options['--output-dir'])
  fail('Thiếu --rules-file hoặc --output-dir.');
const out=resolve(options['--output-dir']),rulesFile=resolve(options['--rules-file']);
if(!isAbsolute(options['--output-dir'])||inside(REPO_ROOT,out))
  fail('Thư mục backup phải dùng đường dẫn tuyệt đối và nằm NGOÀI Git repository.');
if(inside(out,rulesFile))fail('Rules nguồn phải nằm ngoài thư mục backup sắp tạo.');
const currentRules=await readJson(rulesFile);
if(!currentRules.value||typeof currentRules.value!=='object'||
  !currentRules.value.rules||typeof currentRules.value.rules!=='object')
  fail('Rules xuất từ Console không có cấu trúc rules hợp lệ.');
if((await stat(rulesFile)).isFile()!==true)fail('Đường dẫn Rules không phải file.');
// Fail instead of overwriting any prior backup, even when the folder exists.
await mkdir(out,{mode:0o700,recursive:false});
if(process.platform!=='win32')await chmod(out,0o700);
let keep=false;
try{
  const firebaseBin=resolve(REPO_ROOT,'source','node_modules','firebase-tools','lib','bin','firebase.js');
  const output=join(out,'rtdb.before.json');
  async function dump(to){
    await new Promise((ok,bad)=>{
      const child=spawn(process.execPath,[firebaseBin,'database:get','/',
        '--project',PROJECT,'--instance',INSTANCE],{cwd:resolve(REPO_ROOT,'source'),
        stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'false'}});
      const target=createWriteStream(to,{flags:'wx',mode:0o600});
      let errorText='',bytes=0,done=false;
      const reject=e=>{if(done)return;done=true;child.kill('SIGTERM');target.destroy();bad(e);};
      child.on('error',e=>reject(Error('Không chạy được Firebase CLI: '+e.message)));
      target.on('error',e=>reject(e));
      child.stderr.on('data',part=>{
        // Do not print potentially identifying CLI diagnostic payloads.
        errorText+=(part.toString('utf8').slice(0,512));if(errorText.length>1024)errorText=errorText.slice(0,1024);
      });
      child.stdout.on('data',part=>{
        bytes+=part.length;
        if(bytes>MAX_BYTES){reject(Error('RTDB export vượt 100MB, hủy an toàn.'));return;}
        if(!target.write(part))child.stdout.pause();
      });
      target.on('drain',()=>child.stdout.resume());
      child.on('close',code=>{
        if(done)return;
        target.end(()=>{
          if(done)return;done=true;
          code===0?ok():bad(Error('Firebase CLI export thất bại, exit='+code+
            '. Kiểm tra firebase login/quyền READ, không chạy lệnh ghi.'));
        });
      });
    });
  }
  await dump(output);
  const first=await readJson(output);
  if(!first.value||typeof first.value!=='object'||Array.isArray(first.value))
    fail('Bản sao RTDB không phải JSON object chứa gốc dữ liệu; không nghiệm thu.');
  const recheck=join(out,'rtdb.verify.tmp.json');
  await dump(recheck);
  const second=await readJson(recheck);
  if(first.digest!==second.digest)
    fail('Database thay đổi giữa hai lần đọc: chưa có snapshot ổn định. Giữ các file để kiểm tra, KHÔNG tiếp tục phát hành.');
  await rm(recheck);
  const rulesPath=join(out,'rules.before.json');
  await copyFile(rulesFile,rulesPath);
  if(process.platform!=='win32')await chmod(rulesPath,0o600);
  const backupRules=await readJson(rulesPath);
  if(backupRules.digest!==currentRules.digest)
    fail('Rules backup không khớp nguồn.');
  const hdnd=first.value.hdnd??{};
  const count=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value).length:0;
  const manifest={
    purpose:'HopHDND operator READ-ONLY Firebase predeployment backup',
    projectId:PROJECT,instanceId:INSTANCE,createdAt:new Date().toISOString(),
    provenance:'RTDB exported using authenticated Firebase CLI; Rules manually supplied from Firebase Console, operator must independently verify CURRENT version.',
    rtdbFile:'rtdb.before.json',rtdbSha256:first.digest,rtdbBytes:first.bytes,
    rulesFile:'rules.before.json',rulesSha256:backupRules.digest,rulesBytes:backupRules.bytes,
    rootKeysCount:count(first.value),hdndItemsCount:count(hdnd.items),
    hdndMirrorsCount:count(hdnd.mirrors),
    hdndHasProfile:!!hdnd.profile,hdndHasPermissions:!!hdnd.permissions,
    stability:'Two successive exports matched byte-for-byte',
    productionRulesIndependentlyVerified:false,restoreDrillPerformed:false,
    releaseAuthorization:false
  };
  await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
  keep=true;
  process.stdout.write('BACKUP_READONLY_OK: '+out+'\n'+
    'RTDB SHA-256: '+first.digest+'\nRules SHA-256: '+backupRules.digest+'\n'+
    'Chưa được phép deploy: cần đối chiếu Rules thật, thử khôi phục và xác nhận GO.\n');
}catch(e){
  // Retain partial evidence in the operator-private directory for forensic
  // review; never upload or print the contents. No Firebase write occurred.
  process.stderr.write('BACKUP_NOT_VERIFIED: '+e.message+'\n'+'Dữ liệu tạm nằm trong thư mục riêng tư: '+out+'\n');
  process.exitCode=1;
}
