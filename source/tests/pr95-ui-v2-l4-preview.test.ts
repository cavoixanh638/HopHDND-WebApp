import {describe,expect,it} from 'vitest';
import {previewCanEdit,previewPermissionSave} from '../src/qa/pr95-full-preview';
import {createDemoItems} from '../src/data/demo-items';
import {DEFAULT_REPORTS,aggregateReport,isActive,reportItems} from '../src/domain/reporting';
import {previewDatasetReplacement} from '../src/data/dataset-replacement-preview';
import type {CellPermissions} from '../src/data/firebase-repository';

describe('PR95 L4 full preview: baseline domain and RAM role rules',()=>{
  const rows=createDemoItems(27);
  it('provides all five original real reports and drill totals, not invented counters',()=>{
    expect(DEFAULT_REPORTS.map(r=>r.id)).toEqual(['party','build','council','nq','bc']);
    for(const report of DEFAULT_REPORTS){
      const result=aggregateReport(rows,report,'department');
      expect(result.total).toBe(reportItems(rows,report).length);
      expect([...result.rows.values()].flatMap(cells=>[...cells.values()].flat()).length).toBe(result.total);
    }
    expect(rows.filter(isActive).length).toBeLessThan(rows.length);
  });
  it('admin and guest share a single in-memory grant hierarchy, deny overrides allow',()=>{
    const id=rows[0].recordId;
    const p:CellPermissions={columns:{note:true},rows:{[id]:false},cells:{[id]:{note:true,content:false}}};
    expect(previewCanEdit('admin',p,id,'note')).toBe(true);
    expect(previewCanEdit('admin',p,id,'content')).toBe(true);
    expect(previewCanEdit('guest',p,id,'note')).toBe(true);
    expect(previewCanEdit('guest',p,id,'content')).toBe(false);
    expect(previewCanEdit('guest',p,rows[1].recordId,'note')).toBe(true);
    expect(previewCanEdit('guest',p,rows[1].recordId,'content')).toBe(false);
    const revoke={...p,cells:{[id]:{note:false}}};
    expect(previewCanEdit('guest',revoke,id,'note')).toBe(false);
  });
  it('memory permission saves use baseline CAS and a deep copy, never mutating caller',()=>{
    const current:CellPermissions={columns:{},rows:{},cells:{}};
    const next:CellPermissions={columns:{note:true},rows:{},cells:{[rows[0].recordId]:{note:true}}};
    const saved=previewPermissionSave(current,next,current);
    expect(saved).toEqual(next);expect(saved).not.toBe(next);
    next.cells![rows[0].recordId].note=false;
    expect(saved.cells![rows[0].recordId].note).toBe(true);
    expect(()=>previewPermissionSave(saved,current,current)).toThrow('đã thay đổi');
  });
  it('Excel preview comparison uses the actual independent domain for RAM candidates',()=>{
    const next=[{...rows[0],note:'MẪU: Ghi chú giả thay đổi'}];
    const preview=previewDatasetReplacement(rows,next);
    expect(preview.oldCount).toBe(27);
    expect(preview.newCount).toBe(1);
    expect(preview.difference.changed).toEqual([rows[0].displayCode]);
    expect(preview.difference.removed).toHaveLength(26);
    expect(preview.totals.total.total).toBe(1);
  });
});
