/** BACKEND PROTOTYPE ONLY — no Firebase writes, no production import.
 * A clear operation is a new zero-row active generation, NOT physical root
 * deletion. Existing rows, permissions, backups and operation journal remain.
 *
 * Requires a separately audited update of the FULL RTDB Rules, active-pointer
 * validators, UI 0-row handling and the server CAS before enabling. This module
 * deliberately exposes no HTTP handler or UI trigger.
 */
import {createHash} from 'node:crypto';
import {stable} from './parent-contract.mjs';

const invariant=(test,message)=>{
  if(!test)throw Error('CLEAR_CONTRACT_DENIED: '+message);
};
const isMap=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>stable(a)===stable(b);
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{12,80}$/.test(x);
export const EMPTY_GENERATION_DIGEST=createHash('sha256').update('[]').digest('hex');

/** Input is trusted in-memory server data, not browser-supplied snapshot.
 * Backup proof must come from an INDEPENDENT server-side read/verification;
 * comparing a caller-supplied checksum is never enough.
 */
export function proposeClearGeneration(before,context){
  const {operationId,actorUid,expected,freeze,activeLeases,backupVerified}=context??{};
  invariant(token(operationId),'operationId invalid');
  invariant(typeof actorUid==='string'&&actorUid.length>0,'missing authorized actor');
  invariant(backupVerified===true,'independent persistent backup must be verified');
  invariant(freeze?.mode==='FROZEN'&&Number.isSafeInteger(freeze.revision)&&
    Number.isSafeInteger(freeze.epoch)&&freeze.epoch>0,'writes must be frozen');
  invariant(activeLeases===0,'active leases must be zero');
  invariant(isMap(before)&&isMap(before.active)&&isMap(before.generations),
    'missing active V2 data');
  invariant(same(before.active,expected),'stale expected active generation');
  const source=before.generations[expected.generationId];
  invariant(isMap(source)&&isMap(source.items),'source generation rows missing');
  invariant(Object.keys(source.items).length===expected.rowCount&&expected.rowCount>0,
    'source row count or pointer mismatch');
  const nextGen='gen_'+operationId;
  invariant(!Object.hasOwn(before.generations,nextGen)&&
    !Object.hasOwn(before.operations??{},operationId),'operation reuse or collision');
  const proposed={
    ...before,
    active:{generationId:nextGen,operationId,
      revision:expected.revision+1,rowCount:0,digest:EMPTY_GENERATION_DIGEST},
    generations:{...before.generations,
      [nextGen]:{cleared:true,sourceGeneration:expected.generationId}},
    operations:{...(before.operations??{}),
      [operationId]:{status:'COMMITTED',from:expected.generationId,to:nextGen,at:Date.now()}},
  };
  // Invariants before any hypothetical CAS; this is not a live writer.
  invariant(isMap(proposed.generations[nextGen])&&
    proposed.generations[nextGen].cleared===true,'missing empty-generation marker');
  invariant(Object.keys(proposed.generations).length===
    Object.keys(before.generations).length+1,'historical generation lost');
  invariant(same(before.generations[expected.generationId],
    proposed.generations[expected.generationId]),'historical source mutated');
  invariant(same(before.backups??null,proposed.backups??null),
    'existing backup changed');
  invariant(same(before.permissions??null,proposed.permissions??null),
    'existing permissions changed');
  invariant(same(before.leases??null,proposed.leases??null),
    'existing leases changed');
  return proposed;
}
