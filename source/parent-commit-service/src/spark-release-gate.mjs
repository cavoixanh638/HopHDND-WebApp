import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {isAbsolute,join,dirname,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';

export const SPARK_PROJECT='hophdnd-8b7b2';
export const SPARK_DATABASE='https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app';
export const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
const hold=reason=>{throw Error('SPARK_RELEASE_HOLD_'+reason);};
function read(path){
  if(!isAbsolute(path))hold('ABSOLUTE_PRIVATE_FILE_REQUIRED');
  const stat=lstatSync(path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>100*1024*1024)hold('FILE_INVALID');
  const bytes=readFileSync(path);
  return {bytes,json:JSON.parse(bytes.toString('utf8'))};
}

/** Read-only release gate; never infers consent from a build or environment flag.
 * Current root and Rules are supplied by authenticated REST GET at startup. */
export function verifySparkRelease(file,{checkout,sourceSha,clean,liveRoot,liveRules,now=Date.now()}){
  if(!clean)hold('CLEAN_FROZEN_CHECKOUT_REQUIRED');
  const root=realpathSync(checkout),target=realpathSync(file);
  if(target.toLowerCase()===root.toLowerCase()||target.toLowerCase().startsWith((root+sep).toLowerCase()))hold('APPROVAL_OUTSIDE_CHECKOUT_REQUIRED');
  const gate=read(file).json;
  if(gate.schema!=='SPARK_OPERATOR_RELEASE_V1'||gate.project!==SPARK_PROJECT||gate.databaseURL!==SPARK_DATABASE||gate.sourceSha!==sourceSha)hold('SOURCE_PROJECT_MISMATCH');
  for(const key of ['userAcceptedLocalOperator','userProductionGo','browserUiVerified','independentRulesApproved','liveFreshBackupRestoreVerified'])
    if(gate[key]!==true)hold(key.toUpperCase()+'_REQUIRED');
  if(typeof gate.independentReviewReference!=='string'||!gate.independentReviewReference.trim())hold('INDEPENDENT_REVIEW_REQUIRED');
  const checked=Date.parse(gate.checkedAt);
  if(!Number.isFinite(checked)||checked>now||now-checked>15*60*1000)hold('FRESH_CHECKPOINT_REQUIRED');
  const manifest=read(gate.backupManifestFile).json;
  if(manifest.projectId!==SPARK_PROJECT||manifest.restoreDrillPerformed!==true)hold('BACKUP_MANIFEST_INVALID');
  const folder=dirname(gate.backupManifestFile);
  for(const key of ['rtdbFile','rulesFile','restoreEvidence'])
    if(typeof manifest[key]!=='string'||!/^[A-Za-z0-9._-]+$/.test(manifest[key]))hold('BACKUP_FILENAME_INVALID');
  const backup=read(join(folder,manifest.rtdbFile));
  const priorRules=read(join(folder,manifest.rulesFile));
  if(sha(backup.bytes)!==manifest.rtdbSha256||backup.bytes.length!==manifest.rtdbBytes||sha(priorRules.bytes)!==manifest.rulesSha256)hold('BACKUP_CHECKSUM_MISMATCH');
  const restore=read(join(folder,manifest.restoreEvidence)).json;
  if(restore.status!=='PASS_LIVE_BACKUP_RESTORED_TO_LOCAL_EMULATOR_ONLY'||restore.productionWrites!==0||restore.backupRawSha256!==manifest.rtdbSha256||restore.rulesRawSha256!==manifest.rulesSha256||restore.publishedRulesCompileAndReadback!==true||restore.canonicalSourceSha256!==sha(canonical(backup.json))||restore.canonicalRestoredSha256!==restore.canonicalSourceSha256)hold('RESTORE_EVIDENCE_MISMATCH');
  const expected=read(resolve(root,'source/firebase/database.spark.rules.json'));
  if(gate.rulesSha256!==sha(expected.bytes)||canonical(liveRules)!==canonical(expected.json))hold('LIVE_RULES_MISMATCH');
  if(canonical(liveRoot)!==canonical(backup.json))hold('LIVE_ROOT_CHANGED_REBACKUP_REQUIRED');
  return {sourceSha,rulesSha256:gate.rulesSha256,backupSha256:manifest.rtdbSha256,verifiedAt:new Date(now).toISOString()};
}
