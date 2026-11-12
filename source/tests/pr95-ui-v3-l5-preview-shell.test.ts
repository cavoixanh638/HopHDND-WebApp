import {describe,expect,it} from 'vitest';
import {PREVIEW_ADMIN_TOOLS,previewCanEdit,previewCanOpenPage,
  previewPermissionSave} from '../src/qa/pr95-full-preview';
import {createDemoItems} from '../src/data/demo-items';
import type {CellPermissions} from '../src/data/firebase-repository';

describe('PR95 UI V3 L5 preview shell: synthetic role-policy contracts',()=>{
  const [first,second]=createDemoItems(2);
  it('exposes exactly two public tabs and denies every admin-only route to guest',()=>{
    expect(previewCanOpenPage('guest','items')).toBe(true);
    expect(previewCanOpenPage('guest','reports')).toBe(true);
    for(const tool of PREVIEW_ADMIN_TOOLS){
      expect(previewCanOpenPage('guest',tool.key),tool.label).toBe(false);
      expect(previewCanOpenPage('admin',tool.key),tool.label).toBe(true);
    }
    expect(PREVIEW_ADMIN_TOOLS.map(x=>x.key)).toEqual([
      'items-customize','permissions','excel','account','settings'
    ]);
    expect(new Set(PREVIEW_ADMIN_TOOLS.map(x=>x.key)).size).toBe(5);
  });
  it('preserves field-level editing for note, specificProgress and statuses',()=>{
    const grants:CellPermissions={
      columns:{note:false,progressParty:true},
      rows:{[first.recordId]:false},
      cells:{[first.recordId]:{note:true,specificProgress:true,
        progressBuild:true,progressParty:false}}
    };
    for(const field of ['note','specificProgress','progressBuild'] as const)
      expect(previewCanEdit('guest',grants,first.recordId,field)).toBe(true);
    expect(previewCanEdit('guest',grants,first.recordId,'progressParty')).toBe(false);
    expect(previewCanEdit('guest',grants,first.recordId,'content')).toBe(false);
    expect(previewCanEdit('guest',grants,second.recordId,'progressParty')).toBe(true);
    expect(previewCanEdit('guest',grants,second.recordId,'note')).toBe(false);
    expect(previewCanEdit('admin',grants,first.recordId,'note')).toBe(true);
  });
  it('grant then revoke affects only the permitted synthetic cell, RAM CAS still detects stale save',()=>{
    const blank:CellPermissions={columns:{},rows:{},cells:{}};
    const grant:CellPermissions={columns:{},rows:{},cells:{[first.recordId]:{note:true}}};
    const saved=previewPermissionSave(blank,grant,blank);
    expect(previewCanEdit('guest',saved,first.recordId,'note')).toBe(true);
    expect(previewCanEdit('guest',saved,first.recordId,'specificProgress')).toBe(false);
    expect(previewCanEdit('guest',saved,second.recordId,'note')).toBe(false);
    const revoke:CellPermissions={columns:{},rows:{},cells:{[first.recordId]:{note:false}}};
    const revoked=previewPermissionSave(saved,revoke,saved);
    expect(previewCanEdit('guest',revoked,first.recordId,'note')).toBe(false);
    expect(()=>previewPermissionSave(revoked,grant,saved)).toThrow('đã thay đổi');
  });
});
