import {describe,expect,it} from 'vitest';
import {PREVIEW_ADMIN_TOOLS,previewCanEdit,previewCanOpenPage,
  previewPermissionSave} from '../src/qa/pr95-full-preview';
import {createDemoItems} from '../src/data/demo-items';
import type {CellPermissions} from '../src/data/firebase-repository';

describe('PR95 UI V3 L5 preview shell: synthetic role-policy contracts',()=>{
  const [first,second]=createDemoItems(2);
  it('exposes exactly two public tabs and hides all admin-only routes from guests',()=>{
    expect(previewCanOpenPage('guest','items')).toBe(true);
    expect(previewCanOpenPage('guest','reports')).toBe(true);
    for(const tool of PREVIEW_ADMIN_TOOLS){
      expect(previewCanOpenPage('guest',tool.key),tool.label).toBe(false);
      expect(previewCanOpenPage('admin',tool.key),tool.label).toBe(true);
    }
    expect(PREVIEW_ADMIN_TOOLS.map(x=>x.key)).toEqual([
      'items-customize','excel','account','settings'
    ]);
    expect(new Set(PREVIEW_ADMIN_TOOLS.map(x=>x.key)).size).toBe(4);
  });
  it('only whole-column grants determine guest editing on every row',()=>{
    const grants:CellPermissions={
      columns:{note:true,progressParty:true,progressBuild:false},
      rows:{[first.recordId]:false},
      cells:{[first.recordId]:{note:false,specificProgress:true,
        progressBuild:true,progressParty:false}}
    };
    for(const field of ['note','progressParty'] as const){
      expect(previewCanEdit('guest',grants,first.recordId,field)).toBe(true);
      expect(previewCanEdit('guest',grants,second.recordId,field)).toBe(true);
    }
    for(const field of ['specificProgress','progressBuild','content'] as const)
      expect(previewCanEdit('guest',grants,first.recordId,field)).toBe(false);
    expect(previewCanEdit('admin',grants,first.recordId,'note')).toBe(true);
  });
  it('column grant and revoke apply to all rows and keep CAS protection',()=>{
    const blank:CellPermissions={columns:{},rows:{},cells:{}};
    const grant:CellPermissions={columns:{note:true},rows:{},cells:{[first.recordId]:{note:false}}};
    const saved=previewPermissionSave(blank,grant,blank);
    expect(previewCanEdit('guest',saved,first.recordId,'note')).toBe(true);
    expect(previewCanEdit('guest',saved,second.recordId,'note')).toBe(true);
    expect(previewCanEdit('guest',saved,first.recordId,'specificProgress')).toBe(false);
    const revoke:CellPermissions={...saved,columns:{note:false}};
    const revoked=previewPermissionSave(saved,revoke,saved);
    expect(previewCanEdit('guest',revoked,first.recordId,'note')).toBe(false);
    expect(previewCanEdit('guest',revoked,second.recordId,'note')).toBe(false);
    expect(()=>previewPermissionSave(revoked,grant,saved)).toThrow('đã thay đổi');
  });
});
