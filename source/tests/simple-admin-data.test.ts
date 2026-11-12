import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import type {Database} from 'firebase/database';
import type {Item} from '../shared/types';
import {simpleExcelCandidate,inspectSimpleBackup} from '../src/data/simple-admin-data';
import {sha256String,stableBackupJson} from '../src/data/admin-backup-format';

const db={app:{options:{
  projectId:'hophdnd-8b7b2',
  databaseURL:'https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app'
}}} as unknown as Database;
const row:Item={
  recordId:'x-4e513031',displayCode:'NQ01',stt:1,documentKind:'NQ',
  content:'Nội dung trình',department:'Sở Tài chính',type:'HC',
  partyLevel:'BTV',progressParty:'Sở chưa trình',
  progressBuild:'VP đang xử lý',progressCouncil:'Hoàn thành',
  specialist:'Chuyên viên',room:'Phòng tổng hợp',
  vpLeader:'Lãnh đạo Văn phòng',ubndLeader:'Lãnh đạo UBND',
  specificProgress:'Đang thực hiện',note:'Ghi chú',isDropped:false,
  archivedAt:null,revision:1
};
describe('Simple admin file-only maintenance',()=>{
  it('converts business Excel to clean current rows with server metadata',()=>{
    const records=simpleExcelCandidate([row],'verified-admin-uid')!;
    const record=records[row.recordId] as Record<string,unknown>;
    expect(record.displayCode).toBe('NQ01');
    expect(record.updatedBy).toBe('verified-admin-uid');
    expect(record.revision).toBe(1);
    expect(record.archivedAt).toBeUndefined();
    expect(record.operationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.keys(records)).toHaveLength(1);
    expect(()=>simpleExcelCandidate([row,row],'admin')).toThrow(/trùng/);
  });
  it('accepts a simple zero-row backup and rejects tampering and wrong project',async()=>{
    const payload={format:'hophdnd-simple-items',schemaVersion:1,
      projectId:'hophdnd-8b7b2',
      databaseURL:db.app.options.databaseURL!,createdAt:'2026-11-12T10:00:00.000Z',
      count:0,items:null};
    const archive={payload,sha256:await sha256String(stableBackupJson(payload))};
    expect((await inspectSimpleBackup(JSON.stringify(archive),db)).payload.count).toBe(0);
    await expect(inspectSimpleBackup(JSON.stringify({
      ...archive,payload:{...payload,count:1}
    }),db)).rejects.toThrow();
    await expect(inspectSimpleBackup(JSON.stringify({
      ...archive,payload:{...payload,projectId:'different'}
    }),db)).rejects.toThrow(/Firebase/);
  });
  it('keeps app-scoped rules guarded to verified Google admin only',()=>{
    const rules=JSON.parse(readFileSync('firebase/database.spark.rules.json','utf8')).rules;
    const items=rules.hdnd.items;
    expect(rules['.write']).toBe(false);
    expect(items['.write']).toContain("root.child('hdnd/freezeControl/mode').val() === 'FROZEN'");
    expect(items['.write']).toContain("!root.child('hdnd/datasetV2/active').exists()");
    expect(items['.write']).toContain("auth.token.firebase.sign_in_provider === 'google.com'");
    expect(items['.validate']).toContain('<= 1000');
    expect(items.$id['.write']).toContain("sign_in_provider === 'anonymous'");
    expect(items.$id['.validate']).toContain("'FROZEN'");
    expect(rules.hdnd.datasetV2['.write']).not.toContain('hdnd/items');
  });
});
