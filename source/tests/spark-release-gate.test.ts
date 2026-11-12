import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifySparkRelease,canonical,SPARK_PROJECT,SPARK_DATABASE} from '../parent-commit-service/src/spark-release-gate.mjs';

const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const cases=['valid','no-consent','no-ui','no-review','stale','bad-backup','bad-restore','live-rules-changed','live-data-changed','dirty-source','wrong-source'] as const;
for(const scenario of cases)it('Spark production release gate: '+scenario,()=>{
  const folder=mkdtempSync(join(tmpdir(),'hdnd-spark-gate-'));
  // All data is synthetic; the test has no network or Firebase credentials.
  try{
    const checkout=join(folder,'checkout');
    mkdirSync(join(checkout,'source/firebase'),{recursive:true});
    const backup={hdnd:{profile:{dataSource:'excel'}}},rules={rules:{'.write':false}},oldRules=JSON.stringify(rules);
    const raw=JSON.stringify(backup),rulesRaw=JSON.stringify(rules),sourceSha='a'.repeat(40);
    const now=Date.now(),approval=join(folder,'approval.json');
    writeFileSync(join(checkout,'source/firebase/database.spark.rules.json'),rulesRaw);
    writeFileSync(join(folder,'rtdb.json'),scenario==='bad-backup'?raw+' ':raw);
    writeFileSync(join(folder,'rules.json'),oldRules);
    writeFileSync(join(folder,'restore.json'),JSON.stringify({
      status:'PASS_LIVE_BACKUP_RESTORED_TO_LOCAL_EMULATOR_ONLY',productionWrites:0,
      backupRawSha256:sha(raw),rulesRawSha256:sha(oldRules),publishedRulesCompileAndReadback:true,
      canonicalSourceSha256:sha(canonical(backup)),
      canonicalRestoredSha256:scenario==='bad-restore'?'0'.repeat(64):sha(canonical(backup))
    }));
    writeFileSync(join(folder,'manifest.json'),JSON.stringify({projectId:SPARK_PROJECT,
      restoreDrillPerformed:true,rtdbFile:'rtdb.json',rulesFile:'rules.json',restoreEvidence:'restore.json',
      rtdbSha256:sha(raw),rtdbBytes:Buffer.byteLength(raw),rulesSha256:sha(oldRules)}));
    writeFileSync(approval,JSON.stringify({schema:'SPARK_OPERATOR_RELEASE_V1',project:SPARK_PROJECT,
      databaseURL:SPARK_DATABASE,sourceSha,rulesSha256:sha(rulesRaw),
      userAcceptedLocalOperator:scenario!=='no-consent',userProductionGo:true,
      browserUiVerified:scenario!=='no-ui',independentRulesApproved:true,liveFreshBackupRestoreVerified:true,
      independentReviewReference:scenario==='no-review'?'':'synthetic-review-only',
      checkedAt:new Date(now-(scenario==='stale'?16*60*1000:1000)).toISOString(),
      backupManifestFile:join(folder,'manifest.json')}));
    const check=()=>verifySparkRelease(approval,{checkout,sourceSha:scenario==='wrong-source'?'b'.repeat(40):sourceSha,
      clean:scenario!=='dirty-source',now,
      liveRoot:scenario==='live-data-changed'?{...backup,unexpected:'new ACK'}:backup,
      liveRules:scenario==='live-rules-changed'?{rules:{'.write':true}}:rules});
    if(scenario==='valid')expect(check()).toMatchObject({sourceSha,rulesSha256:sha(rulesRaw)});
    else expect(check).toThrow(/SPARK_RELEASE_HOLD_/);
  }finally{
    const target=realpathSync(folder);
    if(!target.startsWith(realpathSync(tmpdir()))||!target.includes('hdnd-spark-gate-'))throw Error('Unexpected cleanup target');
    rmSync(target,{recursive:true,force:true});
  }
});
