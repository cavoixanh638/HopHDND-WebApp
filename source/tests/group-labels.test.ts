import {describe,it,expect} from 'vitest';
import {COMPACT_GROUP_LABEL_KEYS,defaultItemLayout,validateItemLayout,
  overlayPersonalLayout} from '../src/data/item-preferences';
import {activeCompactPairs,compactVisibleColumns,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';
import {defaultDetailGridPreferences,validateDetailGridPreferences} from '../src/data/report-detail-preferences';

const base=()=>defaultItemLayout();
const prefs={...DEFAULT_COMPACT_DISPLAY,teamTogether:true};
describe('Stable administrator-owned group labels',()=>{
 it('preserves all five overrides through save/reload and restores source labels when ungrouped',()=>{
   const a=base(),values=Object.fromEntries(COMPACT_GROUP_LABEL_KEYS.map(key=>[key,'Nhóm '+key]));
   const loaded=validateItemLayout({...a,groupLabels:values});
   const compact=compactVisibleColumns(loaded.columns,prefs,loaded.groupLabels);
   const pairs=activeCompactPairs(loaded.columns,prefs);
   for(const pair of pairs)expect(compact.find(c=>c.key===pair.anchor)?.label).toBe('Nhóm '+pair.variant);
   expect(compactVisibleColumns(loaded.columns,DEFAULT_COMPACT_DISPLAY,loaded.groupLabels)
     .find(c=>c.key==='room')?.label).toBe('Phòng chuyên môn');
   expect(loaded.columns.find(c=>c.key==='progressBuild')?.label)
     .toBe('Tiến độ trình HĐND xây dựng NQ');
   expect(validateItemLayout(loaded).groupLabels).toEqual(values);
 });
 it('stable variant is preserved even if the original anchor is hidden',()=>{
   const a=base();a.columns=a.columns.map(c=>c.key==='content'||c.key==='partyLevel'
     ?{...c,visible:false}:c);
   const visible=a.columns.filter(c=>c.visible);
   const pairs=activeCompactPairs(visible,prefs);
   const content=pairs.find(p=>p.variant==='contentDetails')!;
   const party=pairs.find(p=>p.variant==='partyTogether')!;
   expect(content.anchor).not.toBe('content');
   expect(party.anchor).not.toBe('partyLevel');
   const result=compactVisibleColumns(visible,prefs,{contentDetails:'Hồ sơ mới',
     partyTogether:'Ba bước mới'});
   expect(result.find(c=>c.key===content.anchor)?.label).toBe('Hồ sơ mới');
   expect(result.find(c=>c.key===party.anchor)?.label).toBe('Ba bước mới');
 });
 it('reset one name, rejects illegal keys and polluted values',()=>{
   const a=validateItemLayout({...base(),groupLabels:{teamTogether:'Tên mới',partyTogether:'Khâu mới'}});
   const restored=validateItemLayout({...a,groupLabels:{partyTogether:a.groupLabels!.partyTogether}});
   expect(compactVisibleColumns(restored.columns,prefs,restored.groupLabels)
     .find(c=>c.key==='room')?.label).toBe('Lãnh đạo / Phòng / CV');
   expect(()=>validateItemLayout({...a,groupLabels:{unknown:'x'}})).toThrow('Tên nhóm');
   expect(()=>validateItemLayout({...a,groupLabels:{partyTogether:'x'.repeat(101)}})).toThrow('Tên nhóm');
 });
 it('personal view overlays widths but retains authoritative names and presets do not overwrite labels',()=>{
   const shared=validateItemLayout({...base(),groupLabels:{partyTogether:'Tên dùng chung'}});
   const preset=validateItemLayout({...base(),groupLabels:{partyTogether:'Tên cũ từ preset'}});
   const merged=overlayPersonalLayout(shared,preset);
   expect(merged.groupLabels?.partyTogether).toBe('Tên dùng chung');
 });
 it('concurrent changes on same group need explicit choice; unrelated changes merge',()=>{
   const original=base();
   const first=validateItemLayout({...original,groupLabels:{partyTogether:'Nhóm của tôi'}});
   const remote=validateItemLayout({...original,groupLabels:{partyTogether:'Nhóm từ máy khác'}});
   expect(()=>mergeItemLayout(original,first,remote)).toThrow(LayoutConflictError);
   const picked=mergeItemLayout(original,first,remote,{'groupLabels.partyTogether':'local'});
   expect(picked.groupLabels?.partyTogether).toBe('Nhóm của tôi');
   const second=validateItemLayout({...original,groupLabels:{roomSpecialist:'Phòng & CV'}});
   const combined=mergeItemLayout(original,second,remote);
   expect(combined.groupLabels).toMatchObject({partyTogether:'Nhóm từ máy khác',roomSpecialist:'Phòng & CV'});
 });
 it('popup retains local overrides and migrates old v1 settings without touching shared names',()=>{
   const legacy=defaultDetailGridPreferences();
   const migrated=validateDetailGridPreferences({...legacy,groupLabels:undefined});
   expect(migrated.groupLabels).toEqual({});
   const custom=validateDetailGridPreferences({...legacy,groupLabels:{partyTogether:'Popup riêng'}});
   expect(validateDetailGridPreferences(custom).groupLabels?.partyTogether).toBe('Popup riêng');
   expect(()=>validateDetailGridPreferences({...legacy,groupLabels:{__proto__:'bad',badKey:'x'}}))
     .toThrow('Tên nhóm');
 });
});
