import {describe,it,expect} from 'vitest';
import type {AuditEntry} from '../shared/types';
import {latestHistoryForField} from '../src/features/history/HistoryDialog';
const entry=(at:string,changes:Record<string,string>):AuditEntry=>({
  operationId:at,recordId:'row001',at,changes,oldValues:{}
});
describe('Latest saved history for exactly one data cell',()=>{
  it('finds newest matching edit and excludes unrelated later edits',()=>{
    const events=[
      entry('2026-10-18T09:00:00Z',{note:'Ghi chú cũ'}),
      entry('2026-10-19T09:00:00Z',{room:'Phòng mới'}),
      entry('2026-10-20T09:00:00Z',{note:'Ghi chú mới'}),
      entry('2026-10-21T09:00:00Z',{specialist:'Người mới'}),
    ];
    expect(latestHistoryForField(events,'note')?.changes.note).toBe('Ghi chú mới');
    expect(latestHistoryForField(events,'room')?.changes.room).toBe('Phòng mới');
    expect(latestHistoryForField(events,'content')).toBeUndefined();
    expect(events[0].changes.note).toBe('Ghi chú cũ');
  });
});
