#!/usr/bin/env node
/** Verify demo-only restored snapshot beyond existing whole-root hash. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {audit,sha,stable} from './offline-audit-core.mjs';
const stop=m=>{throw Error('PR149_SYNTHETIC_RESTORE_HOLD: '+m);};
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9198'||
   (process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!=='demo-hdnd-restore'))
 stop('ONLY isolated localhost restore emulator allowed');
const source=resolve('pr149-ops-evidence/rtdb.before.json');
const originalBytes=readFileSync(source),snapshot=JSON.parse(originalBytes.toString('utf8'));
const manifest=JSON.parse(readFileSync('pr149-ops-evidence/manifest.demo.json','utf8'));
if(manifest.projectId!=='demo-hdnd'||manifest.origin!=='ONLY_SYNTHETIC_EMULATOR_NOT_PRODUCTION')
 stop('Input manifest MUST be synthetic');
if(sha(originalBytes)!==manifest.rtdbSha256)stop('source backup bytes changed');
const r=await fetch('http://127.0.0.1:9198/.json?ns=demo-hdnd-restore');
if(!r.ok)stop('local restore readback HTTP '+r.status);
const current=await r.json();
if(stable(current)!==stable(snapshot))stop('full-root restored state differs');
const report=audit({snapshot:current,manifest,rawBytes:originalBytes});
if(report.target!=='V2_ACTIVE'||report.issues.some(x=>x.code!=='DATA_DELTA_REQUIRES_APPROVAL'))
 stop('restored V2 pointer/journal/backup/rights validation denied '+JSON.stringify(report.issues));
const v=current.hdnd.datasetV2,from=snapshot.hdnd.datasetV2;
if(!v?.active||Object.keys(v.generations??{}).length<2||
   Object.keys(v.operations??{}).length<2||
   !Object.values(v.generations).some(g=>Object.values(g.items??{}).some(r=>
     r.history&&Object.keys(r.history).length>0)))
 stop('fixture must contain multiple generations AND an audited ACK');
if(stable(v.permissions)!==stable(from.permissions)||
   stable(v.backups)!==stable(from.backups)||
   stable(v.leases)!==stable(from.leases)||
   stable(v.operations)!==stable(from.operations)||
   stable(current.hdnd.items)!==stable(snapshot.hdnd.items)||
   stable(current.hdnd.freezeControl)!==stable(snapshot.hdnd.freezeControl))
 stop('rights/backup/leases/journal/legacy/freeze changed');
const witness={
 status:'PASS_SYNTHETIC_RESTORE_VERIFIED_NO_PRODUCTION',sourceSha:'02964722ae405a7ccf70f2b88bfe21cb7d0bcca7',
 backupRawSha256:manifest.rtdbSha256,canonicalSha256:sha(snapshot),
 restoredCanonicalSha256:sha(current),active:v.active,
 generations:Object.keys(v.generations).length,committedOperations:Object.values(v.operations).filter(x=>x.status==='COMMITTED').length,
 rightsHash:sha(v.permissions??null),legacyItems:Object.keys(current.hdnd.items??{}).length,
 historyRows:Object.values(v.generations).flatMap(g=>Object.values(g.items??{})).filter(r=>r.history&&Object.keys(r.history).length).length,
 stopAfterAck:'S3 rehearsal previously refused stale backup restore; preserved latest backup'
};
mkdirSync('pr149-ops-evidence',{recursive:true});
writeFileSync('pr149-ops-evidence/emulator-restore-verdict.json',JSON.stringify(witness,null,2)+'\n');
console.log('PR149_EMULATOR_SYNTHETIC_RESTORE_PASS',JSON.stringify(witness));
