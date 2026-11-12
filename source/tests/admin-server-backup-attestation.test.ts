import {describe,it,expect} from 'vitest';
import {randomBytes,createHash} from 'node:crypto';
import {sealServerBackup,verifyServerBackup,SERVER_BACKUP_PATHS}
  from '../parent-commit-service/src/backup-attestation.mjs';
const scope={projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com'};
const secret=randomBytes(48);
const keys={key_test_2026:secret};
const input=()=>{
  const nodes:Record<string,any>=Object.fromEntries(SERVER_BACKUP_PATHS.map(p=>[p,null]));
  nodes['hdnd/freezeControl']={mode:'FROZEN',revision:7,epoch:2};
  nodes['hdnd/items']={r1:{recordId:'r1',displayCode:'NQ01'}};
  return {format:'hophdnd-admin-archive',schemaVersion:1,
    projectId:scope.projectId,databaseURL:scope.databaseURL,
    createdAt:'2026-11-12T06:30:00.000Z',paths:[...SERVER_BACKUP_PATHS],nodes};
};
describe('backend-only signed HopHDND backup',()=>{
  it('signs and authenticates a server issued frozen application archive',()=>{
    const env=sealServerBackup(input(),{...scope,keyId:'key_test_2026',secret});
    expect(env.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(env.sha256).toMatch(/^[0-9a-f]{64}$/);
    const result=verifyServerBackup(env,{...scope,keyRing:keys});
    expect(result.keyId).toBe('key_test_2026');
    expect(result.payload.nodes['hdnd/items'].r1.displayCode).toBe('NQ01');
  });
  it('rejects tamper even if client recomputes the unsigned SHA-256',()=>{
    const env=sealServerBackup(input(),{...scope,keyId:'key_test_2026',secret});
    const changed=structuredClone(env);
    changed.payload.nodes['hdnd/items'].r1.displayCode='NQ99';
    // An attacker can recompute the unkeyed digest, but cannot mint the
    // backend-held HMAC. Prove the server checks BOTH independently.
    const sort=(v:any):any=>Array.isArray(v)?v.map(sort):
      v&&typeof v==='object'?Object.fromEntries(Object.entries(v)
        .sort(([a],[b])=>a.localeCompare(b,'en'))
        .map(([k,x])=>[k,sort(x)])):v;
    changed.sha256=createHash('sha256').update(JSON.stringify(sort(changed.payload))).digest('hex');
    expect(()=>verifyServerBackup(changed,{...scope,keyRing:keys})).toThrow('HMAC');
  });
  it('rejects invented HMAC and wrong server key, unknown key id and wrong instance',()=>{
    const env=sealServerBackup(input(),{...scope,keyId:'key_test_2026',secret});
    expect(()=>verifyServerBackup({...env,signature:'0'.repeat(64)},
      {...scope,keyRing:keys})).toThrow('HMAC');
    expect(()=>verifyServerBackup(env,{...scope,keyRing:{key_test_2026:randomBytes(48)}}))
      .toThrow('HMAC');
    expect(()=>verifyServerBackup(env,{...scope,keyRing:{wrong_id:secret}}))
      .toThrow('key is unavailable');
    expect(()=>verifyServerBackup(env,{...scope,databaseURL:'https://wrong.example',keyRing:keys}))
      .toThrow('database mismatch');
  });
  it('rejects unfrozen scope, unknown root path and weak keys',()=>{
    const archive=input();archive.nodes['hdnd/freezeControl'].mode='OPEN';
    expect(()=>sealServerBackup(archive,{...scope,keyId:'key_test_2026',secret}))
      .toThrow('not frozen');
    const outside=input();outside.nodes['firebase-auth']={credentials:true};
    expect(()=>sealServerBackup(outside,{...scope,keyId:'key_test_2026',secret}))
      .toThrow('missing/extra path');
    expect(()=>sealServerBackup(input(),{...scope,keyId:'key_test_2026',secret:Buffer.alloc(8)}))
      .toThrow('32+');
  });
  it('never contains a credential or network write path',async()=>{
    const {readFileSync}=await import('node:fs');
    const src=readFileSync(new URL('../parent-commit-service/src/backup-attestation.mjs',import.meta.url),'utf8');
    for(const danger of ['db.ref(', 'getDatabase(', 'fetch(', 'transaction(']){
      expect(src).not.toContain(danger);
    }
  });
});
