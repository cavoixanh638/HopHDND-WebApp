import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parseActiveDatasetPointer} from '../src/data/freeze-control';
import {checkPointerSwap,type ActiveDatasetPointer} from '../src/data/dataset-replacement-integrity';
import {BACKUP_PATHS,makeBackupEnvelope,inspectBackupJson,type BackupPayload} from '../src/data/admin-backup-format';
const pointer:ActiveDatasetPointer={generationId:'gen_maint_1234567890123456',operationId:'maint_1234567890123456',
  revision:2,rowCount:0,digest:'a'.repeat(64)};
describe('online maintenance source gates',()=>{
  it('accepts explicit zero-row V2 pointer but never treats it as missing legacy',()=>{
    expect(parseActiveDatasetPointer(pointer)).toEqual(pointer);
    expect(()=>checkPointerSwap(pointer,pointer,
      {schemaVersion:1,operationId:'maint_abcdefghijklmnop',generationId:'gen_maint_abcdefghijklmnop',rowCount:1,digest:'b'.repeat(64)}))
      .not.toThrow();
  });
  it('allows a signed 0-row snapshot for integrity inspection; validates exact path allowlist',async()=>{
    const nodes:BackupPayload['nodes']=Object.fromEntries(BACKUP_PATHS.map(path=>[path,null])) as BackupPayload['nodes'];
    nodes['hdnd/freezeControl']={mode:'FROZEN',revision:8,epoch:2,closedAt:100};
    nodes['hdnd/datasetV2']={active:pointer,generations:{[pointer.generationId]:{emptyGeneration:true}}};
    const payload:BackupPayload={format:'hophdnd-admin-archive',schemaVersion:1,
      createdAt:'2026-11-12T00:00:00Z',projectId:'hophdnd-8b7b2',databaseURL:'https://test.firebasedatabase.app',
      paths:[...BACKUP_PATHS],nodes: nodes as BackupPayload['nodes']};
    const file=await makeBackupEnvelope(payload);
    const sealed={...file,serverSeal:{algorithm:'HMAC-SHA256',keyId:'v1',signature:'a'.repeat(43)}};
    const inspected=await inspectBackupJson(JSON.stringify(sealed),{projectId:payload.projectId,databaseURL:payload.databaseURL});
    expect(inspected.activeRows).toBe(0);
    expect(inspected.mode).toBe('empty');
    expect(inspected.envelope.serverSeal?.signature).toBe('a'.repeat(43));
  });
  it('never enables mutation when online API is unconfigured',()=>{
    const app=readFileSync(new URL('../src/features/settings/ExcelTransferPanel.tsx',import.meta.url),'utf8');
    const panel=readFileSync(new URL('../src/features/settings/OnlineAdminMaintenancePanel.tsx',import.meta.url),'utf8');
    const worker=readFileSync(new URL('../maintenance-worker/wrangler.toml',import.meta.url),'utf8');
    const rules=JSON.parse(readFileSync(new URL('../firebase/database.spark.rules.json',import.meta.url),'utf8'));
    expect(app).toContain('maintenanceApiConfigured()?');
    expect(panel).toContain('reauthenticateWithPopup');
    expect(panel).toContain('approvalChecklist');
    expect(panel).toContain('statusOnlineMaintenance');
    expect(worker).toContain('ENABLE_MUTATIONS = "false"');
    expect(rules.rules['.write']).toBe(false);
    expect(rules.rules.hdnd.datasetV2.active['.validate']).toContain("rowCount').val() >= 0");
  });
});
