import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyReadOnlyBackup} from './firebase-backup-verify.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('private backup offline verification catches tamper and never reports production GO',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'hdnd-private-backup-test-'));
  try{
    const json=Buffer.from(JSON.stringify({hdnd:{items:{r1:{recordId:'r1'}},mirrors:{}}})+'\n');
    const rules=Buffer.from(JSON.stringify({rules:{'.read':false,'.write':false}})+'\n');
    await writeFile(join(dir,'rtdb.before.json'),json);
    await writeFile(join(dir,'rules.before.json'),rules);
    const manifest={
      projectId:'hophdnd-8b7b2',instanceId:'hophdnd-8b7b2-default-rtdb',
      stability:'Two successive exports matched byte-for-byte',
      rtdbFile:'rtdb.before.json',rtdbSha256:sha(json),rtdbBytes:json.length,
      rulesFile:'rules.before.json',rulesSha256:sha(rules),rulesBytes:rules.length,
      hdndItemsCount:1,hdndMirrorsCount:0,
      productionRulesIndependentlyVerified:false,restoreDrillPerformed:false,releaseAuthorization:false
    };
    await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
    const result=await verifyReadOnlyBackup(dir);
    assert.equal(result.items,1);
    assert.equal(result.releaseAuthorized,false);
    assert.equal(result.restoreDrill,false);
    assert.equal(result.sourceRulesVerified,false);
    await writeFile(join(dir,'rtdb.before.json'),JSON.stringify({hdnd:{items:{r1:{recordId:'corrupted'}}}}));
    await assert.rejects(verifyReadOnlyBackup(dir),/Hash\/kích thước/);
    await writeFile(join(dir,'rtdb.before.json'),json);
    manifest.rtdbFile='../outside';
    await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
    await assert.rejects(verifyReadOnlyBackup(dir),/Tên tệp/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
