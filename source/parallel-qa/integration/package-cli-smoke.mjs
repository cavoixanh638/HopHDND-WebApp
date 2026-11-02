// Exercise the actual extracted operator archive, without credentials or network.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve('.');
const output=resolve(root,'qa-results/pr147-release-package');
const manifest=JSON.parse(readFileSync(join(output,'release-manifest.json'),'utf8'));
const name='operator-first-import-node22-sources.tar.gz';
const archive=manifest.archives.find(a=>a.file===name);
assert.ok(archive.entries.some(e=>e.path==='scripts/operator-first-import-path.mjs'));
const directory=mkdtempSync(join(tmpdir(),'integration-extracted-cli-'));
try {
  const unpack=spawnSync('tar',['-xzf',join(output,name),'-C',directory],{encoding:'utf8'});
  assert.equal(unpack.status,0,unpack.stderr);
  // Reuse the just-installed exact lock graph; all application sources are extracted.
  symlinkSync(join(root,'node_modules'),join(directory,'node_modules'),'dir');
  const run=spawnSync(process.execPath,['scripts/operator-first-import.mjs'],{
    cwd:directory,encoding:'utf8',timeout:60000,
    env:{...process.env,GOOGLE_APPLICATION_CREDENTIALS:'',FIREBASE_TOKEN:''}
  });
  assert.equal(run.status,2,run.stderr);
  assert.match(run.stderr,/PR147_BOOTSTRAP_HOLD_MODE_REQUIRED/);
  assert.doesNotMatch(run.stderr,/LAUNCH_HOLD|Could not resolve|MODULE_NOT_FOUND/);
  console.log('INTEGRATION_EXTRACTED_OPERATOR_CLI_PASS',manifest.sourceSha);
} finally { rmSync(directory,{recursive:true,force:true}); }
