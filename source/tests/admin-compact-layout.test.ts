import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';
import {compactTypeTone} from '../src/features/items/compact-columns';

describe('Admin compact display is part of the saved shared layout',()=>{
 it('old layouts preserve document grouping while optional staff groups stay off',()=>{
   const layout=defaultItemLayout(),{compactDisplay:_discard,...old}=layout;
   const migrated=validateItemLayout(old);
   expect(migrated.compactDisplay?.mergeTypeIntoContent).toBe(true);
   expect(migrated.compactDisplay?.mergeDepartmentIntoContent).toBe(true);
   expect(migrated.compactDisplay?.showStaffLabels).toBe(true);
   expect(migrated.compactDisplay?.mergeProgressStages).toBe(true);
   expect(Object.entries(migrated.compactDisplay??{}).filter(([key])=>!key.startsWith('merge')&&key!=='showStaffLabels').every(([,flag])=>!flag)).toBe(true);
 });
 it('admin merging a pair preserves unrelated remote edits',()=>{
   const base=defaultItemLayout();
   const local={...base,compactDisplay:{...base.compactDisplay!,leadersTogether:true}};
   const remote={...base,columns:base.columns.map(c=>c.key==='room'?{...c,width:130}:c)};
   const result=mergeItemLayout(base,local,remote);
   expect(result.compactDisplay?.leadersTogether).toBe(true);
   expect(result.columns.find(c=>c.key==='room')?.width).toBe(130);
 });
 it('persists an explicit split through layout CAS with an unrelated remote change',()=>{
   const base=defaultItemLayout();
   const local={...base,compactDisplay:{...base.compactDisplay!,mergeProgressStages:false}};
   const remote={...base,compactDisplay:{...base.compactDisplay!,showStaffLabels:false}};
   const result=mergeItemLayout(base,local,remote);
   expect(result.compactDisplay?.mergeProgressStages).toBe(false);
   expect(result.compactDisplay?.showStaffLabels).toBe(false);
 });
 it('conflicting shared compact edits use CAS conflict resolution',()=>{
   const base=defaultItemLayout();
   const local={...base,compactDisplay:{...base.compactDisplay!,typeInContent:true}};
   const remote={...base,compactDisplay:{...base.compactDisplay!,typeInContent:true}};
   expect(mergeItemLayout(base,local,remote).compactDisplay?.typeInContent).toBe(true);
 });
 it('classification uses 3 muted text-only categories',()=>{
   expect(['HC','Hành chính','QPPL','BC','Báo cáo'].map(compactTypeTone))
     .toEqual(['HC','HC','QPPL','BC','BC']);
 });
});
