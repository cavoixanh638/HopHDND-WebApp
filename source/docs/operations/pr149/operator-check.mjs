#!/usr/bin/env node
/** PR149 operator command: local files ONLY, runs repository's Vitest + A–O parser. */
import {spawnSync} from 'node:child_process';
import {resolve,isAbsolute,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
const here=dirname(fileURLToPath(import.meta.url));
const source=resolve(here,'../../..');
const tests=resolve(here,'operator-check.test.ts');
const help='Usage: node docs/operations/pr149/operator-check.mjs --source ABSOLUTE.xlsx --sheet SHEET_NAME --snapshot ABSOLUTE.json --manifest ABSOLUTE/manifest.json --output ABSOLUTE/report.json [--previous ABSOLUTE/previous.json]';
const args=process.argv.slice(2),o={};
if(args.length===1&&args[0]==='--help'){console.log(help);process.exit(0);}
try{
 if(args.length%2)throw Error('missing flag value');
 for(let i=0;i<args.length;i+=2){
  if(!['--source','--sheet','--snapshot','--manifest','--output','--previous'].includes(args[i])||
      o[args[i]]||!args[i+1])throw Error('unexpected or duplicate parameter '+args[i]);
  o[args[i]]=args[i+1];
 }
 for(const name of ['--source','--sheet','--snapshot','--manifest','--output'])
  if(!o[name])throw Error('required parameter '+name);
 for(const name of ['--source','--snapshot','--manifest','--output','--previous']){
  if(o[name]&&(!isAbsolute(o[name])||/^(https?|gs|firebase):/i.test(o[name])))
   throw Error(name+' must be a local absolute path');
  if(name!=='--output'&&o[name]&&!existsSync(o[name]))throw Error('missing local file '+name);
 }
 const runner=resolve(source,'node_modules/vitest/vitest.mjs');
 if(!existsSync(runner))throw Error('Run npm ci in source/ before offline preflight (network-free validation)');
 const processResult=spawnSync(process.execPath,[runner,'run',tests,'--reporter=verbose','--maxWorkers=1'],
   {cwd:source,stdio:'inherit',env:{...process.env,PR149_AUDIT_ARGS:JSON.stringify(o)},
    timeout:120000});
 if(processResult.error)throw processResult.error;
 process.exitCode=processResult.status??2;
}catch(e){console.error('PR149_OPERATOR_CHECK_HOLD:',e.message);console.error(help);process.exitCode=2;}
