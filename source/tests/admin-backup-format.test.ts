import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {BACKUP_PATHS,makeBackupEnvelope,inspectBackupJson,
  type BackupNodes,type BackupPayload} from '../src/data/admin-backup-format';

const sample=():BackupPayload=>{
  const nodes=Object.fromEntries(BACKUP_PATHS.map(path=>[path,null])) as BackupNodes;
  nodes['hdnd/freezeControl']={
    mode:'FROZEN',revision:8,epoch:2,actor:'admin',changedAt:1700000000,
  };
  nodes['hdnd/items']={r1:{recordId:'r1',displayCode:'NQ01'}};
  nodes['hdnd/profile']={revision:1,payload:'safe'};
  return {format:'hophdnd-admin-archive',schemaVersion:1,createdAt:'2026-11-12T07:00:00.000Z',
    projectId:'hophdnd-8b7b2',databaseURL:'https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app',
    paths:[...BACKUP_PATHS],nodes};
};
const scope={projectId:'hophdnd-8b7b2',
  databaseURL:'https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app'};

describe('HopHDND browser-only frozen admin backup',()=>{
  it('exports a stable SHA-256 envelope that can be checked offline',async()=>{
    const backup=await makeBackupEnvelope(sample());
    expect(backup.sha256).toMatch(/^[a-f0-9]{64}$/);
    const check=await inspectBackupJson(JSON.stringify(backup),scope);
    expect(check.legacyRows).toBe(1);
    expect(check.activeRows).toBe(0);
    expect(check.mode).toBe('legacy');
    expect(check.freezeRevision).toBe(8);
  });
  it('detects even one changed business field or metadata without matching digest',async()=>{
    const backup=await makeBackupEnvelope(sample());
    const bad=JSON.parse(JSON.stringify(backup));
    bad.payload.nodes['hdnd/items'].r1.displayCode='NQ02';
    await expect(inspectBackupJson(JSON.stringify(bad),scope)).rejects.toThrow('SHA-256 không khớp');
  });
  it('refuses a backup from another Firebase project or database instance',async()=>{
    const backup=await makeBackupEnvelope(sample());
    await expect(inspectBackupJson(JSON.stringify(backup),{...scope,projectId:'other-project'}))
      .rejects.toThrow('khác');
    await expect(inspectBackupJson(JSON.stringify(backup),{...scope,databaseURL:'https://other.example'}))
      .rejects.toThrow('khác');
  });
  it('refuses unfrozen, incomplete and unknown-path backups',async()=>{
    const unfrozen=sample();
    unfrozen.nodes['hdnd/freezeControl']={mode:'OPEN',revision:3};
    await expect(makeBackupEnvelope(unfrozen)).rejects.toThrow('đóng băng');
    const missing=sample();
    delete (missing.nodes as Record<string,unknown>)['hdnd/items'];
    await expect(makeBackupEnvelope(missing)).rejects.toThrow('Phạm vi');
    const extra=sample();
    (extra.nodes as Record<string,unknown>)['firebase-auth-users']={user1:true};
    await expect(makeBackupEnvelope(extra)).rejects.toThrow('Phạm vi');
  });
  it('detects mismatched V2 generation count and missing generation',async()=>{
    const input=sample();
    input.nodes['hdnd/datasetV2']={active:{generationId:'gen_excel_123456789012',
      operationId:'excel_123456789012',revision:1,rowCount:2,digest:'0'.repeat(64)},
      generations:{gen_excel_123456789012:{items:{r1:{recordId:'r1'}}}}};
    const file=await makeBackupEnvelope(input);
    await expect(inspectBackupJson(JSON.stringify(file),scope)).rejects.toThrow('khớp con trỏ');
  });
  it('does not expose Auth keys or add a client-side destructive Firebase API',()=>{
    expect(BACKUP_PATHS).not.toContain('hdnd/sparkSessions');
    expect(BACKUP_PATHS).not.toContain('firebase-auth-users');
    const module=readFileSync(new URL('../src/data/admin-backup-service.ts',import.meta.url),'utf8');
    const ui=readFileSync(new URL('../src/features/settings/AdminBackupManager.tsx',import.meta.url),'utf8');
    expect(module).not.toMatch(/\b(set|update|remove|runTransaction|deleteDoc)\s*\(/);
    expect(module).toContain("frozen.mode!=='FROZEN'");
    expect(ui).toContain('disabled');
    expect(ui).toContain('Rules yêu cầu dịch vụ');
    expect(ui).toContain('inspectBackupJson');
  });
});
