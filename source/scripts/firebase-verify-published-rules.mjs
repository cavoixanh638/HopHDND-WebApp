#!/usr/bin/env node
/**
 * Read-only proof that the operator-private rules snapshot equals the
 * effective Published Rules currently active on the exact Firebase RTDB instance.
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
// Prefer the RTDB management REST endpoint exposed by the existing
// firebase database:get command. Metadata ruleset:list is not required,
// so environments where the metadata endpoint is restricted still work.
// The CLI streams a raw JSON payload for database:get; do NOT pass --json,
// which wraps structured CLI output differently and can obscure this payload.
const readPublishedRules=(run=spawnSync)=>{
  if(process.env.FIREBASE_DATABASE_EMULATOR_HOST||process.env.FIREBASE_REALTIME_URL)
    throw Error('RULES_PROVENANCE_HOLD: emulator/custom database URL override detected.');
  const child=run(process.execPath,[CLI,
    'database:get','/.settings/rules',
    '--project',PROJECT,'--instance',INSTANCE],{
    cwd:resolve('.'),encoding:'utf8',maxBuffer:8*1024*1024,timeout:90000,
    env:{...process.env,CI:'true'}
  });
  if(child.error)throw Error(
    'RULES_PROVENANCE_HOLD: cannot run CLI read-only database:get (spawn/timeout).');
  if(child.status!==0)throw Error(
    'RULES_PROVENANCE_HOLD: CLI read-only database:get failed (exit '+
    String(child.status)+'); inspect Firebase CLI login, IAM, connection or instance.');
  try{return requireRules(JSON.parse(child.stdout));}
  catch{throw Error(
    'RULES_PROVENANCE_HOLD: live /.settings/rules response is not Rules JSON.');}
};
// Never touch the network in fixture mode. Assert the exact read-only
// command and that failed or malformed Firebase responses cannot imply PASS.
if(process.argv.length===3&&process.argv[2]==='--self-test'){
  let requestCount=0;
  const fake=(executable,args)=>{
    requestCount++;
    if(executable!==process.execPath||args[1]!=='database:get'||
      args[2]!=='/.settings/rules'||args[3]!=='--project'||
      args[4]!==PROJECT||args[5]!=='--instance'||args[6]!==INSTANCE||
      args.includes('--json'))throw Error('FIXTURE_BAD_READ_ONLY_COMMAND');
    return {status:0,stdout:JSON.stringify({rules:{'.read':false,'.write':false}})};
  };
  const got=readPublishedRules(fake);
  if(got.rules['.write']!==false||requestCount!==1)
    throw Error('FIXTURE_UNEXPECTED_LIVE_RESPONSE');
  let rejected=false;
  try{readPublishedRules(()=>({status:1,stdout:'',stderr:'PRIVATE_TOKEN_DO_NOT_LOG'}));}
  catch(err){rejected=/RULES_PROVENANCE_HOLD/.test(String(err))&&
    !String(err).includes('PRIVATE_TOKEN_DO_NOT_LOG');}
  if(!rejected)throw Error('FIXTURE_FAILED_DENIAL');
  console.log('RULES_PROVENANCE_OFFLINE_FIXTURE_PASS (no network)');
  process.exit(0);
}
try{
  const args=process.argv.slice(2),index=args.indexOf('--live-file');
  if(args.length!==2||index<0||!args[index+1]||!isAbsolute(args[index+1]))
    throw Error('RULES_PROVENANCE_HOLD: use --live-file ABSOLUTE_PATH.');
  const file=resolve(args[index+1]),stats=statSync(file);
  if(!stats.isFile()||stats.size<3||stats.size>3*1024*1024)
    throw Error('RULES_PROVENANCE_HOLD: private file size invalid.');
  const saved=requireRules(JSON.parse(readFileSync(file,'utf8')));
  const published=readPublishedRules();
  const savedHash=sha(canonical(saved)),publishedHash=sha(canonical(published));
  console.log('READONLY_PUBLISHED_RULES_INSTANCE: '+PROJECT+'/'+INSTANCE);
  console.log('PUBLISHED_RULES_QUERY: database:get /.settings/rules (effective rules; GET only)');
  console.log('SAVED_PRIVATE_CANONICAL_SHA256: '+savedHash);
  console.log('CURRENT_PUBLISHED_CANONICAL_SHA256: '+publishedHash);
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
