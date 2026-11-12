import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {previewBackupRestore,previewClearActive} from '../src/data/admin-maintenance-preview';
import {BACKUP_PATHS,type BackupInspection,type BackupNodes,type BackupPayload} from '../src/data/admin-backup-format';

const rows=()=>createDemoItems(2);
function backup(items=rows(),v2=false):BackupInspection{
  const nodes=Object.fromEntries(BACKUP_PATHS.map(key=>[key,null])) as BackupNodes;
  const map=Object.fromEntries(items.map(r=>[r.recordId,r]));
  nodes['hdnd/items']=map;
  const id='excel_123456789012';
  if(v2)nodes['hdnd/datasetV2']={
    active:{generationId:'gen_'+id,operationId:id,revision:1,rowCount:items.length,digest:'a'.repeat(64)},
    generations:{['gen_'+id]:{items:map}},
  };
  nodes['hdnd/freezeControl']={mode:'FROZEN',revision:4};
  const payload:BackupPayload={
    format:'hophdnd-admin-archive',schemaVersion:1,createdAt:'2026-11-12T12:00:00Z',
    databaseURL:'https://demo.firebaseio.com',projectId:'demo-hdnd',paths:[...BACKUP_PATHS],nodes,
  };
  return {envelope:{payload,sha256:'b'.repeat(64)},mode:v2?'v2':'legacy',
    activeRows:v2?items.length:0,legacyRows:items.length,createdAt:payload.createdAt,freezeRevision:4};
}
describe('Admin online maintenance read-only preview',()=>{
  it('lists all rows for clear without changing the existing dataset',()=>{
    const before=rows(),saved=JSON.stringify(before);
    const p=previewClearActive(before);
    expect(p.action).toBe('clear-active-only');
    expect(p.count).toBe(2);
    expect(p.codes).toHaveLength(2);
    expect(JSON.stringify(before)).toBe(saved);
  });
  it('reads legacy restore rows and compares with the current table',()=>{
    const before=rows(),old=[before[0]];
    const result=previewBackupRestore(old,backup(before));
    expect(result.source).toBe('legacy');
    expect(result.comparison.oldCount).toBe(1);
    expect(result.comparison.newCount).toBe(2);
    expect(result.comparison.difference.added).toHaveLength(1);
    expect(result.items).toHaveLength(2);
  });
  it('reads V2 generation selected by active pointer, never historical generation',()=>{
    const payload=backup(rows(),true);
    const v2=payload.envelope.payload.nodes['hdnd/datasetV2'] as {active:{generationId:string},generations:Record<string,unknown>};
    v2.generations['gen_old_123456789012']={items:{unrelated:{recordId:'unrelated'}}};
    const r=previewBackupRestore([],payload);
    expect(r.source).toBe('v2');
    expect(r.items).toHaveLength(2);
  });
  it('rejects a tampered keyed record ID or inconsistent inspected count',()=>{
    const payload=backup();
    const map=payload.envelope.payload.nodes['hdnd/items'] as Record<string,unknown>;
    const row=map[Object.keys(map)[0]];
    delete map[Object.keys(map)[0]];
    map.wrongKey=row;
    expect(()=>previewBackupRestore([],payload)).toThrow('ID khác khóa');
    const other=backup();
    other.legacyRows=9;
    expect(()=>previewBackupRestore([],other)).toThrow('số lượng');
  });
  it('rejects duplicate codes during clear preview',()=>{
    const sample=rows(),dup={...sample[1],displayCode:sample[0].displayCode};
    expect(()=>previewClearActive([sample[0],dup])).toThrow('mã trùng');
  });
});
