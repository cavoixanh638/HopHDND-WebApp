#!/usr/bin/env node
/**
 * PR147 docs-only, read-only offline preflight.
 * Does not execute Firebase CLI, contact networks, read production, or deploy.
 * Run from the release documentation branch; only docs/releases may differ
 * from the locked PR147 source commit.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
import {dirname,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const releaseDir=dirname(fileURLToPath(import.meta.url));
const sourceDir=resolve(releaseDir,'../..');
const repositoryDir=resolve(sourceDir,'..');
const json=file=>JSON.parse(readFileSync(file,'utf8'));
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const guard=(value,message)=>{if(!value)throw Error('PR147_OFFLINE_HOLD: '+message);};
const git=(...args)=>execFileSync('git',args,{
  cwd:repositoryDir,encoding:'utf8',stdio:['ignore','pipe','pipe']
}).trim();
const file=part=>{
  const target=resolve(sourceDir,part);
  guard(target.startsWith(sourceDir+sep),'file outside pinned source: '+part);
  guard(statSync(target).isFile(),'not a file: '+part);
  return target;
};
const safeChanged=out=>out.split(/\r?\n/).filter(Boolean).every(
  name=>name.startsWith('source/docs/releases/')
);
try{
  const manifest=json(resolve(releaseDir,'PR147_RELEASE_MANIFEST.json'));
  guard(manifest.status==='DOCS_PREPARED_PRODUCTION_NO_GO','manifest status changed');
  const sha=manifest.source?.releaseSourceSha;
  guard(/^[a-f0-9]{40}$/.test(sha??''),'invalid locked source SHA');
  guard(manifest.source?.repository==='cavoixanh638/HopHDND-WebApp',
    'unexpected repository identity');
  const root=git('rev-parse','--show-toplevel');
  guard(resolve(root)===repositoryDir,'script was not run in its own repository');
  const head=git('rev-parse','HEAD');
  git('merge-base','--is-ancestor',sha,'HEAD');
  guard(safeChanged(git('diff','--name-only','--no-ext-diff',sha,'HEAD')),
    'non-documentation source changed between locked SHA and HEAD');
  guard(safeChanged(git('diff','--name-only','--no-ext-diff','HEAD')),
    'dirty non-documentation working tree');
  let count=0;
  for(const [part,wanted] of Object.entries(manifest.source.sourceFilesSha256Utf8Raw)){
    guard(/^[0-9a-f]{64}$/.test(wanted),'malformed SHA256: '+part);
    guard(hash(readFileSync(file(part)))===wanted,'SHA256 mismatch: '+part);
    count++;
  }
  const staging=json(file('firebase.staging.json'));
  const defaults=json(file('firebase.json'));
  const expected={
    'pr142-cell-edit':['cell-edit-service','nodejs22'],
    'parent-v2':['parent-commit-service','nodejs22']
  };
  guard(staging.database?.rules==='firebase/database.exclusive-candidate.rules.json',
    'staging config did not pin FULL Rules');
  guard(Array.isArray(staging.functions)&&staging.functions.length===2,
    'expected exactly two Functions codebases');
  for(const f of staging.functions){
    const want=expected[f.codebase];
    guard(want&&f.source===want[0]&&f.runtime===want[1],
      'unexpected Functions source/runtime/codebase');
    delete expected[f.codebase];
  }
  guard(Object.keys(expected).length===0,'missing Functions codebase');
  guard(defaults.database?.rules!==staging.database.rules,
    'the default config unexpectedly equals the approved candidate');
  const cell=json(file('cell-edit-service/package.json'));
  const parent=json(file('parent-commit-service/package.json'));
  guard(cell.engines?.node==='22'&&parent.engines?.node==='22',
    'Functions runtimes are not pinned to Node 22');
  guard(hash(readFileSync(file('firebase/database.exclusive-candidate.rules.json')))===
    manifest.artifacts.fullRules.rawSha256,'FULL Rules source hash differs');
  const args=process.argv.slice(2);
  guard(args.length===0||(args.length===2&&args[0]==='--web-archive'),
    'usage: node docs/releases/pr147-offline-preflight.mjs [--web-archive artifact.zip]');
  let archive='REQUIRED_UNVERIFIED';
  if(args.length){
    const archiveFile=resolve(args[1]);
    guard(statSync(archiveFile).isFile(),'CI web artifact is not a file');
    guard(hash(readFileSync(archiveFile))===manifest.artifacts.web.ciArchive.archiveZipSha256,
      'CI web ZIP checksum mismatch');
    archive='CI_ZIP_SHA256_PASS';
  }
  console.log('PR147_OFFLINE_SOURCE_PASS');
  console.log('LOCKED_SHA='+sha);
  console.log('LOCAL_HEAD='+head);
  console.log('VERIFIED_FILES='+count);
  console.log('FULL_RULES_RAW_SHA256='+manifest.artifacts.fullRules.rawSha256);
  console.log('WEB_ARCHIVE='+archive);
  console.log('CONFIG_TWO_CODEBASES_FULL_RULES_PASS');
  console.log('FUNCTION_TRANSITIVE_LOCKS=REQUIRED_UNVERIFIED');
  console.log('PRODUCTION_TARGET_IAM_CORS_FLAGS=REQUIRED_UNVERIFIED');
  console.log('PRODUCTION_GO=NO (this script never contacts production)');
}catch(error){
  console.error(error instanceof Error?error.message:'PR147_OFFLINE_HOLD');
  process.exitCode=2;
}
