#!/usr/bin/env node
/**
 * Read-only proof that the operator-private rules snapshot equals the
 * stable (Published) Rules currently active on the exact Firebase RTDB instance.
 *
 * Run from source/:
 * node scripts/firebase-verify-published-rules.mjs --live-file "D:\\...\\rules-live.json"
 *
 * Never sends/prints raw Rules, tokens or credentials and never writes Firebase.
 */
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const PROJECT='hophdnd-8b7b2';
const INSTANCE='hophdnd-8b7b2-default-rtdb';
const CLI=resolve('node_modules/firebase-tools/lib/bin/firebase.js');
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)
  ?'['+x.map(canonical).join(',')+']'
  :x&&typeof x==='object'
    ?'{'+Object.keys(x).sort().map(key=>JSON.stringify(key)+':'+canonical(x[key])).join(',')+'}'
    :JSON.stringify(x);
const requireRules=raw=>{
  const parsed=typeof raw==='string'?JSON.parse(raw):raw;
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||
     !parsed.rules||typeof parsed.rules!=='object'||Array.isArray(parsed.rules))
    throw Error('RULES_PROVENANCE_HOLD: unexpected Rules JSON shape.');
  return parsed;
};
const query=args=>{
  const child=spawnSync(process.execPath,[CLI,...args,'--project',PROJECT,'--instance',INSTANCE,'--json'],{
    cwd:resolve('.'),encoding:'utf8',maxBuffer:8*1024*1024,timeout:90000,
    env:{...process.env,CI:'true'}
  });
  if(child.error||child.status!==0)throw Error(
    'RULES_PROVENANCE_HOLD: Firebase CLI read-only query failed; verify login, access or network.'
  );
  let output;
  try{output=JSON.parse(child.stdout);}catch{
    throw Error('RULES_PROVENANCE_HOLD: CLI did not return machine-readable JSON.');
  }
  if(output?.status!=='success'||!output?.result)
    throw Error('RULES_PROVENANCE_HOLD: CLI did not confirm successful query.');
  return output.result;
};
try{
  const args=process.argv.slice(2),index=args.indexOf('--live-file');
  if(args.length!==2||index<0||!args[index+1]||!isAbsolute(args[index+1]))
    throw Error('RULES_PROVENANCE_HOLD: use --live-file ABSOLUTE_PATH.');
  const file=resolve(args[index+1]),stats=statSync(file);
  if(!stats.isFile()||stats.size<3||stats.size>3*1024*1024)
    throw Error('RULES_PROVENANCE_HOLD: private file size invalid.');
  const saved=requireRules(JSON.parse(readFileSync(file,'utf8')));
  const list=query(['database:rules:list']);
  const stable=list.labeled?.stable;
  if(typeof stable!=='string'||!stable||stable.length>200||!/^[A-Za-z0-9_./:-]+$/.test(stable))
    throw Error('RULES_PROVENANCE_HOLD: stable Ruleset label not found.');
  const version=query(['database:rules:get',stable]);
  // A Ruleset must retain the requested ID. This catches stale/wrong API results.
  if(version.id!==stable)throw Error('RULES_PROVENANCE_HOLD: returned Ruleset ID mismatch.');
  const published=requireRules(version.source);
  const savedHash=sha(canonical(saved)),publishedHash=sha(canonical(published));
  console.log('READONLY_STABLE_RULES_INSTANCE: '+PROJECT+'/'+INSTANCE);
  console.log('STABLE_RULESET_ID: '+stable);
  console.log('SAVED_PRIVATE_CANONICAL_SHA256: '+savedHash);
  console.log('CURRENT_STABLE_CANONICAL_SHA256: '+publishedHash);
  if(savedHash!==publishedHash){
    console.log('PUBLISHED_RULES_SNAPSHOT_MISMATCH (HOLD; no changes made)');
    process.exitCode=2;
  }else{
    console.log('PUBLISHED_RULES_SNAPSHOT_MATCH_PASS (READ-ONLY; NO DEPLOY)');
    console.log('SECURITY_REVIEW_STILL_REQUIRED: matching Rules is not approval to deploy the candidate.');
  }
}catch(err){
  console.error(err instanceof Error?err.message:'RULES_PROVENANCE_HOLD');
  process.exitCode=1;
}
