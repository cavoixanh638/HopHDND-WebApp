import {describe,it,expect} from 'vitest';
import {summarizeLiveReadiness} from '../src/data/firebase-live-readiness';

const ready=()=>({
  profile:{revision:10,payload:JSON.stringify({dataSource:'primary'})},
  items:{recordA:{recordId:'recordA',content:'Private contents omitted from report'}},
  permissions:{columns:{note:true}},
  editors:{employee1:true,employee2:true,employee3:false},
  control:{editingLocked:false},
  freeze:{mode:'OPEN'}
});
describe('Admin operational Firebase read-only report',()=>{
  it('identifies primary source and counts without leaking content or UIDs',()=>{
    const state=summarizeLiveReadiness(ready());
    expect(state.source).toBe('primary');
    expect(state.primaryCount).toBe(1);
    expect(state.editorAccounts).toBe(2);
    expect(state.freezeMode).toBe('OPEN');
    expect(state.problems).toEqual([]);
    const summary=JSON.stringify(state);
    expect(summary).not.toContain('Private contents');
    expect(summary).not.toContain('employee1');
    expect(summary).not.toContain('recordA');
  });
  it('reports mirror mode and absence of primary items explicitly, never as ready',()=>{
    const state=summarizeLiveReadiness({
      ...ready(),profile:{payload:JSON.stringify({dataSource:'database'})},
      items:null,freeze:{mode:'DRAINING'},control:{editingLocked:true}
    });
    expect(state.source).toBe('database');
    expect(state.primaryCount).toBe(0);
    expect(state.problems.some(message=>message.includes('chưa chọn Firebase chính'))).toBe(true);
    expect(state.problems.some(message=>message.includes('chưa có hồ sơ'))).toBe(true);
    expect(state.problems.some(message=>message.includes('khóa chỉnh sửa'))).toBe(true);
    expect(state.problems.some(message=>message.includes('DRAINING'))).toBe(true);
  });
  it('treats missing or malformed profile and lock state as not verified',()=>{
    const state=summarizeLiveReadiness({
      profile:{revision:1,payload:'<NOT JSON>'},items:[],permissions:null,
      editors:null,control:null,freeze:null
    });
    expect(state.source).toBe('unknown');
    expect(state.freezeMode).toBe('UNKNOWN');
    expect(state.problems.length).toBeGreaterThanOrEqual(4);
  });
  it('does not claim Rules or backups were verified',()=>{
    const state=summarizeLiveReadiness(ready());
    expect('rulesVerified' in state).toBe(false);
    expect('backupVerified' in state).toBe(false);
  });
});
