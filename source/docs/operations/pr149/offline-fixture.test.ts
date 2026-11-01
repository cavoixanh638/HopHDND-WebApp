import {it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as XLSX from 'xlsx';
import {parseBusinessExcel,BUSINESS_HEADERS} from '../../../src/data/business-excel';
import {audit,loadLocal,sha} from './offline-audit-core.mjs';
import {createDemoItems} from '../../../src/data/demo-items';

const checked=(snapshot)=>{
 const bytes=Buffer.from(JSON.stringify(snapshot));
 return {snapshot,rawBytes:bytes,manifest:{
  rtdbFile:'rtdb.before.json',rtdbSha256:sha(bytes),rtdbBytes:bytes.byteLength,
  hdndItemsCount:Object.keys(snapshot?.hdnd?.items??{}).length,
  stability:'Two successive exports matched byte-for-byte'}};
};
const row=(code='NQ-OPS-A')=>{
 const {partyMeeting:_x,examined:_y,archivedAt:_z,...r}=createDemoItems(1)[0];
 return {...r,recordId:'x-'+Buffer.from(code).toString('hex'),displayCode:code,
  stt:1,revision:1,note:'Ghi chú tiếng Việt',history:{one:{before:'cũ',after:'mới'}}};
};
it('classifies actual empty FULL root differently from truncated or unreadable snapshot',()=>{
 const full=audit(checked({}));
 expect(full.target).toBe('EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT');
 expect(full.verdict).toBe('PASS_EMPTY_STATE_ONLY');
 const incomplete=audit({snapshot:{hdnd:{items:{}}},rawBytes:Buffer.from('{}'),manifest:null});
 expect(incomplete.target).toBe('INCOMPLETE_SNAPSHOT');
 const wrong=audit({...checked({hdnd:{items:{}}}),
  manifest:{stability:'Two successive exports matched byte-for-byte',rtdbSha256:'0'.repeat(64)}});
 expect(wrong.target).toBe('INCOMPLETE_SNAPSHOT');
 const dir=mkdtempSync(join(tmpdir(),'pr149-unreadable-'));
 try{
  writeFileSync(join(dir,'db.json'),'{broken');
  writeFileSync(join(dir,'manifest.json'),'{}');
  expect(()=>loadLocal(join(dir,'db.json'),join(dir,'manifest.json'))).toThrow();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
it('existing legacy is never interpreted as empty; detects ID/code duplicates and missing fields',()=>{
 const r=row(),r2={...r,recordId:'other-id'};
 const state=audit({...checked({hdnd:{items:{[r.recordId]:r}}}),sourceRows:[r,r2]});
 expect(state.target).toBe('LEGACY_NONEMPTY_NO_V2');
 expect(state.issues.map(x=>x.code)).toContain('SOURCE_DUPLICATE_DISPLAY_CODE');
 const malformed=audit(checked({hdnd:{items:{[r.recordId]:{...r,recordId:'wrong'}}}}));
 expect(malformed.issues.map(x=>x.code)).toContain('RECORD_ID_KEY_MISMATCH');
});
it('production A–O parser rejects duplicate codes and preserves explicit mapping and Unicode',()=>{
 const good=[
  [...BUSINESS_HEADERS],
  ['NQ-OPS-A',1,'Nội dung tiếng Việt','Sở mẫu','HC','','','','','','','','','','Ghi chú']];
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(good),'Approved');
 const bytes=new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}));
 const parsed=parseBusinessExcel(bytes,'Approved');
 expect(parsed.count).toBe(1);
 expect(parsed.items[0].recordId).toBe('x-'+Buffer.from('NQ-OPS-A').toString('hex'));
 expect(parsed.items[0].content).toBe('Nội dung tiếng Việt');
 good.push([...good[1]]);
 const bad=XLSX.utils.book_new();XLSX.utils.book_append_sheet(bad,XLSX.utils.aoa_to_sheet(good),'Approved');
 expect(()=>parseBusinessExcel(new Uint8Array(XLSX.write(bad,{type:'array',bookType:'xlsx'})),'Approved'))
  .toThrow(/trùng dòng/);
});
it('multiple V2 generations, historical rights and journal: catches FRCR-like mutation and post-backup ACK',()=>{
 const r=row(),opA='ops_test_active_0001',opB='ops_test_replace_0002',a='gen_'+opA,b='gen_'+opB;
 const rowB={...r,revision:2,note:'mới qua server',history:{one:{before:'cũ',after:'mới'}}};
 const perms={columns:{note:true}};
 const before={
  hdnd:{items:{[r.recordId]:r},permissions:perms,
   datasetV2:{
    active:{generationId:b,operationId:opB,revision:2,rowCount:1,digest:'b'.repeat(64)},
    generations:{[a]:{items:{[r.recordId]:r}},[b]:{items:{[r.recordId]:rowB}}},
    permissions:{[a]:perms,[b]:{columns:{}}},
    operations:{[opA]:{status:'COMMITTED',from:'legacy',to:a,at:1},
      [opB]:{status:'COMMITTED',from:a,to:b,at:2}},
    backups:{[opB]:JSON.stringify({
      previous:{generationId:a,operationId:opA,revision:1,rowCount:1,digest:'a'.repeat(64)},
      generation:{items:{[r.recordId]:r}},permissionsJson:JSON.stringify(perms),
      leasesJson:'null',baseline:'test'})}
   }}};
 const valid=audit(checked(before));
 expect(valid.verdict).toBe('PASS_VERIFIED_SNAPSHOT_STRUCTURE');
 expect(valid.restoreChecks[0].historicalEligible).toBe(true);
 const mutate=structuredClone(before);
 mutate.hdnd.datasetV2.permissions[a]={columns:{note:false}};
 const historical=audit(checked(mutate));
 expect(historical.target).toBe('INCONSISTENT');
 expect(historical.issues.map(x=>x.code)).toContain('BACKUP_HISTORICAL_SCOPE_CHANGED');
 const ack=structuredClone(before);
 ack.hdnd.datasetV2.generations[b].items[r.recordId]={...rowB,revision:3,note:'ACK mới'};
 const after=audit({...checked(ack),previousSnapshot:before});
 expect(after.issues.map(x=>x.code)).toContain('POST_BACKUP_SERVER_CHANGES_REQUIRE_RECONCILIATION');
 expect(after.verdict).toBe('HOLD');
});
