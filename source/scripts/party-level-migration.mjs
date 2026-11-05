// Offline-only migration planner. No Firebase imports, credentials or network calls.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const TARGET={project:'hophdnd-8b7b2',instance:'hophdnd-8b7b2-default-rtdb'};
const allowed=new Set(['Không','TTTU','BTV','BCH']);
const oldToNew={'Không phải trình':'Không','BTV TU':'BTV'};
const noParty=new Set(['Không','Không phải trình']);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const assert=x=>{if(!x)throw Error('MIGRATION_SAFETY_ABORT');};
export function plan(snapshot){
  assert(snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot));
  const rows=snapshot.items;
  assert(rows&&typeof rows==='object'&&!Array.isArray(rows));
  const inventory={partyLevel:{},progressParty:{}},unknown={},patches=[];
  for(const [id,row] of Object.entries(rows)){
    assert(/^[A-Za-z0-9_:-]{1,200}$/.test(id)&&row&&typeof row==='object'&&!Array.isArray(row));
    const current=row.partyLevel,progress=row.progressParty;
    assert(typeof current==='string'&&typeof progress==='string');
    inventory.partyLevel[current]=(inventory.partyLevel[current]||0)+1;
    inventory.progressParty[progress]=(inventory.progressParty[progress]||0)+1;
    const next=oldToNew[current]||current;
    if(!allowed.has(next)){
      unknown[current]=(unknown[current]||0)+1;
      continue; // preserve unknowns and BLOCK application globally
    }
    const desired=noParty.has(next)?'Không phải trình':progress;
    const changes={};
    if(next!==current)changes.partyLevel=next;
    if(desired!==progress)changes.progressParty=desired;
    if(Object.keys(changes).length)patches.push({
      idDigest:sha(id),recordId:id,expected:{partyLevel:current,progressParty:progress,
        revision:row.revision??null,operationId:row.operationId??null},
      changes,original:{partyLevel:current,progressParty:progress}
    });
  }
  const report={target:TARGET,sourceDigest:sha(rows),totalRows:Object.keys(rows).length,
    changedRows:patches.length,levelChanges:patches.filter(p=>'partyLevel'in p.changes).length,
    progressChanges:patches.filter(p=>'progressParty'in p.changes).length,
    inventory,unknown,unknownCount:Object.values(unknown).reduce((a,b)=>a+b,0)};
  // Only redacted output is eligible for logs or commits.
  const publicManifest={...report,patches:patches.map(({idDigest,changes})=>({idDigest,fields:Object.keys(changes)}))};
  return {report,publicManifest,privatePlan:{target:TARGET,sourceDigest:report.sourceDigest,patches}};
}
export function verify(snapshot,planData){
  assert(snapshot?.items&&planData?.target?.project===TARGET.project&&planData.target.instance===TARGET.instance);
  const errors=[];
  for(const entry of planData.patches){
    const row=snapshot.items[entry.recordId];
    if(!row){errors.push({idDigest:entry.idDigest,reason:'missing'});continue;}
    for(const [field,next] of Object.entries(entry.changes))
      if(row[field]!==next)errors.push({idDigest:entry.idDigest,field,reason:'mismatch'});
  }
  return {checked:planData.patches.length,errors};
}
export function applyFixture(snapshot,planData,{stopAfter=Infinity}={}){
  assert(planData.target.project===TARGET.project&&planData.target.instance===TARGET.instance);
  assert(sha(snapshot.items)===planData.sourceDigest||Object.values(snapshot.items).some(Boolean));
  if(!Number.isInteger(stopAfter)&&stopAfter!==Infinity)throw Error('Bad stopAfter');
  const copy=structuredClone(snapshot);let writes=0,skips=0;
  for(const patch of planData.patches){
    if(writes>=stopAfter)break;
    const row=copy.items[patch.recordId];assert(row);
    const already=Object.entries(patch.changes).every(([f,v])=>row[f]===v);
    if(already){skips++;continue;}
    if(Object.entries(patch.expected).some(([f,v])=>row[f]!==v))
      throw Error('CAS_CONFLICT'); // refuse partial or concurrent writes
    Object.assign(row,patch.changes);writes++;
  }
  return {snapshot:copy,writes,skips};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
  const [,,mode,input,output]=process.argv;
  if(mode!=='dry-run'||!input||!output||process.argv.length!==5)
    throw Error('OFFLINE_ONLY: node migration.mjs dry-run INPUT_JSON REDACTED_OUTPUT_JSON');
  const snapshot=JSON.parse(readFileSync(input,'utf8'));
  const result=plan(snapshot);
  writeFileSync(output,JSON.stringify(result.publicManifest,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({status:result.report.unknownCount?'BLOCKED_UNKNOWN':'DRY_RUN_ONLY',
    totalRows:result.report.totalRows,changedRows:result.report.changedRows,
    levelChanges:result.report.levelChanges,progressChanges:result.report.progressChanges,
    unknownCount:result.report.unknownCount}));
}
