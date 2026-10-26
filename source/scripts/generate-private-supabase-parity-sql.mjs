/** LOCAL ONLY: Firebase /hdnd/mirrors/<spreadsheetId>/<gid> JSON -> guarded Supabase staging SQL.
 * No network and NO storage of actual records on GitHub.
 * node scripts/generate-private-supabase-parity-sql.mjs <private-items.json> <private-staging.sql>
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const REQUIRED=['documentKind','content','department','type','partyLevel','progressParty',
  'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader',
  'specificProgress','note','isDropped'];
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const inside=p=>resolve(p)===repo||resolve(p).startsWith(repo+sep);
const fail=msg=>{throw new Error(msg);};
const ID=/^[A-Za-z0-9_:-]{1,200}$/;

export function convertFirebaseRows(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Cần đối tượng JSON mirror Firebase.');
  let entries;
  if(Array.isArray(raw.rows)){
    if(raw.schemaVersion!==1||
       raw.source!=='1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344'||
       !/^[a-f0-9]{64}$/.test(String(raw.sha256??'')))
      fail('Sai Firebase mirror source/schema/sha256.');
    entries=raw.rows.map(item=>[item?.recordId,item]);
  }else entries=Object.entries(raw); // legacy private /hdnd/items input; must be 50+ rows

  if(entries.length<50||entries.length>1000)fail('Cần từ 50 đến 1000 dòng thực; nhận '+entries.length+'.');
  const codes=new Set(),stts=new Set();
  return entries.map(([id,row])=>{
    if(!ID.test(id)||!row||typeof row!=='object'||Array.isArray(row)||row.recordId!==id)
      fail('recordId/path Firebase không hợp lệ.');
    if(typeof row.displayCode!=='string'||!row.displayCode||row.displayCode.length>100||codes.has(row.displayCode))
      fail('displayCode trùng hoặc sai.');
    if(!Number.isSafeInteger(row.stt)||row.stt<1||stts.has(row.stt))fail('STT trùng hoặc sai.');
    if(!Number.isSafeInteger(row.revision)||row.revision<0)fail('revision sai.');
    if(row.archivedAt!=null&&(typeof row.archivedAt!=='string'||!Number.isFinite(Date.parse(row.archivedAt))))
      fail('archivedAt không hợp lệ.');
    const fields={};
    for(const key of REQUIRED){
      const v=row[key];
      const bad=key==='isDropped'?typeof v!=='boolean':
        key==='documentKind'?!['NQ','BC','UNCLASSIFIED'].includes(v):
        typeof v!=='string'||v.length>20000||(key==='content'&&!v.trim());
      if(bad)fail('Giá trị sai ở trường '+key);
      fields[key]=v;
    }
    for(const key of ['partyMeeting','examined']){
      if(row[key]!==undefined){
        if(typeof row[key]!=='string')fail('Trường mở rộng sai: '+key);
        fields[key]=row[key];
      }
    }
    codes.add(row.displayCode);stts.add(row.stt);
    return {record_id:id,display_code:row.displayCode,stt:row.stt,
      revision:Math.max(1,row.revision),archived_at:row.archivedAt??null,fields};
  }).sort((a,b)=>a.stt-b.stt||a.record_id.localeCompare(b.record_id));
}
export function generateSql(items){
  const payload=JSON.stringify(items).replaceAll("'","''");
  const count=items.length;
  return [
    '-- PRIVATE BUSINESS DATA. Supabase STAGING uguhyunuzsdrkykqgdmq ONLY.',
    '-- Never commit/upload this SQL. Requires verified Google-admin read RLS.',
    'BEGIN;',
    'SET LOCAL standard_conforming_strings=on;',
    'DO $guard$ BEGIN',
    " IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='hdnd_items' AND policyname='hdnd_items_read' AND qual LIKE '%is_admin%') THEN",
    "   RAISE EXCEPTION 'SECURITY_GATE: tighten RLS to verified Google admin first'; END IF;",
    " IF EXISTS (SELECT 1 FROM public.hdnd_items WHERE record_id !~ '^qa-supa-000[1-6]$') THEN",
    "   RAISE EXCEPTION 'STAGING_NOT_EMPTY: will not overwrite existing business data'; END IF;",
    ' IF EXISTS (SELECT 1 FROM public.hdnd_cell_locks) OR EXISTS (SELECT 1 FROM public.hdnd_audit) THEN',
    "   RAISE EXCEPTION 'STAGING_ACTIVITY: review locks/audit before import'; END IF;",
    'END $guard$;',
    "DELETE FROM public.hdnd_items WHERE record_id ~ '^qa-supa-000[1-6]$';",
    'INSERT INTO public.hdnd_items (record_id,display_code,stt,fields,revision,archived_at)',
    'SELECT x.record_id,x.display_code,x.stt,x.fields,x.revision,x.archived_at',
    "FROM jsonb_to_recordset('"+payload+"'::jsonb)",
    'AS x(record_id text,display_code text,stt integer,fields jsonb,revision bigint,archived_at timestamptz);',
    'DO $verify$ BEGIN',
    ' IF (SELECT count(*) FROM public.hdnd_items) <> '+count+' THEN',
    "  RAISE EXCEPTION 'PARITY_COUNT_MISMATCH: snapshot changed'; END IF;",
    'END $verify$;',
    'COMMIT;',
    'SELECT count(*) AS parity_rows FROM public.hdnd_items;',
    ''
  ].join('\n');
}
function main(){
  const [source,out]=process.argv.slice(2);
  if(!source||!out)fail('Cách dùng: node scripts/generate-private-supabase-parity-sql.mjs <firebase-items.json> <private-output.sql>');
  if(inside(source)||inside(out))fail('Không để dữ liệu thật bên trong thư mục GitHub.');
  if(resolve(source)===resolve(out))fail('Không ghi đè file nguồn.');
  if(!out.toLowerCase().endsWith('.sql'))fail('Đường dẫn đầu ra phải có đuôi .sql.');
  const raw=JSON.parse(readFileSync(resolve(source),'utf8').replace(/^\uFEFF/,''));
  const rows=convertFirebaseRows(raw);
  mkdirSync(dirname(resolve(out)),{recursive:true});
  writeFileSync(resolve(out),generateSql(rows),{encoding:'utf8',flag:'wx',mode:0o600});
  console.log('SQL RIÊNG TƯ: '+resolve(out));
  console.log('Số dòng: '+rows.length+'; SHA-256: '+createHash('sha256').update(JSON.stringify(rows)).digest('hex'));
  console.log('Chỉ tạo file SQL; CHƯA GHI bất kỳ database nào. Cần xác minh RLS trước khi chạy SQL.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(e){console.error('ABORT: '+e.message);process.exitCode=1;}
}
