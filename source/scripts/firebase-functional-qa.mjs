#!/usr/bin/env node
/**
 * One-command Firebase operational QA. Never connects to production.
 * Outer invocation starts ONLY the local Auth+Database emulators.
 * Inner invocation refuses to run without both localhost emulator endpoints.
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

const PROJECT='demo-hdnd';
const DB='127.0.0.1:9000';
const AUTH='127.0.0.1:9099';
const inner=process.argv.includes('--inside');
const err=message=>{console.error('QA_FIREBASE_HOLD: '+message);process.exit(2);};
if(process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT!==PROJECT)err('Refuse foreign GCP project.');
if(process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_PROJECT!==PROJECT)err('Refuse foreign Google Cloud project.');
if(process.env.FIREBASE_DATABASE_URL||process.env.FIREBASE_REALTIME_URL||process.env.FIREBASE_SERVICE_ACCOUNT||process.env.GOOGLE_APPLICATION_CREDENTIALS)
  err('Production URL, service credentials or custom database are forbidden in synthetic QA.');
const output='qa-results';
mkdirSync(resolve(output),{recursive:true});
if(!inner){
  if(process.env.FIREBASE_DATABASE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)
    err('Run the outer QA command from a normal terminal, without preconfigured emulator hosts.');
  const cmd=process.execPath;
  const args=['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec',
    '--project',PROJECT,'--only','database,auth','--config','firebase.staging.json',
    'node scripts/firebase-functional-qa.mjs --inside'];
  console.log('QA isolation: Firebase Auth+RTDB Emulators ONLY / project '+PROJECT);
  const p=spawnSync(cmd,args,{stdio:'inherit',env:process.env,timeout:240000});
  if(p.error)err('Emulator runner failed: '+p.error.message);
  process.exit(p.status??1);
}
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!==DB||process.env.FIREBASE_AUTH_EMULATOR_HOST!==AUTH)
  err('Local DB and Auth emulators at '+DB+' and '+AUTH+' must both be active.');
const tests=[
  'tests/firebase-emulator.test.ts',
  'tests/firebase-production-rules.test.ts',
  'tests/exclusive-cell-freeze.test.ts',
  'tests/firebase-tab-auth.test.ts'
];
const opts=['node_modules/vitest/vitest.mjs','run',...tests,'--no-file-parallelism',
  '--reporter=json','--outputFile=qa-results/firebase-vitest.json'];
const result=spawnSync(process.execPath,opts,{stdio:'inherit',env:process.env,timeout:200000});
const reporter=spawnSync(process.execPath,['scripts/firebase-qa-report.mjs'],
  {stdio:'inherit',env:process.env,timeout:15000});
if(result.error)console.error('QA test process:',result.error.message);
if(reporter.error)console.error('QA report process:',reporter.error.message);
if(!existsSync(resolve(output,'firebase-qa-report.md')))
  err('A readable QA report was not generated. This is not a PASS.');
process.exit(result.status===0&&reporter.status===0?0:1);
