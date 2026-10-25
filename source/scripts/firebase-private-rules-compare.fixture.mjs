import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('private Rules comparison stays offline, keeps expressions private and never claims GO',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'hdnd-rules-private-fixture-'));
  const original='PRIVATE_TEST_RULE_SECRET_DO_NOT_PRINT';
  try{
    const live=join(dir,'rules-live.json');
    await writeFile(live,JSON.stringify({rules:{'.read':false,'.write':false,hdnd:{
      '.read':original,items:{'.write':'auth != null'}}}}),'utf8');
    const command=resolve('scripts/firebase-private-rules-compare.mjs');
    const check=spawnSync(process.execPath,[command,'--live-file',live],{
      cwd:resolve('.'),encoding:'utf8',timeout:12000,env:{...process.env},
    });
    assert.equal(check.status,0,check.stderr);
    assert.match(check.stdout,/OFFLINE_RULES_COMPARE_COMPLETED/);
    assert.match(check.stdout,/Changed rule locations:/);
    assert.match(check.stdout,/RELEASE_GATE=HOLD/);
    assert.doesNotMatch(check.stdout+check.stderr,/PRIVATE_TEST_RULE_SECRET_DO_NOT_PRINT/);
    const missing=spawnSync(process.execPath,[command],{cwd:resolve('.'),encoding:'utf8',timeout:12000});
    assert.notEqual(missing.status,0);
    assert.match(missing.stderr,/RULES_COMPARE_HOLD/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
