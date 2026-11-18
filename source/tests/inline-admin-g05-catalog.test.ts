import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems,validateCatalog} from '../src/data/catalogs';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {g05ApplyCatalogAction,g05ApplyCustomChoices,g05Identity,g05LockedCatalog,g05RemoveBlockReason,g05UsageCount} from '../src/features/items/inline-g05-catalog-logic';
import {reportReferenceGroupValue} from '../src/domain/report-reference-identity';

describe('G05 inline catalog contract',()=>{
  it('normalizes Vietnamese diacritics, case, Unicode and whitespace',()=>{
    expect(g05Identity('  SỞ  NỘI  VỤ  ')).toBe(g05Identity('so noi vu'));
    expect(g05Identity('Đắk Lắk')).toBe(g05Identity('dak lak'));
    expect(g05Identity('Pho\u0300ng')).toBe(g05Identity('PHÒNG'));
  });
  it('rejects duplicate accents and trailing whitespace without source mutations',()=>{
    const items=createDemoItems(1),before=JSON.stringify(items);
    const config=catalogFromItems(items);
    config.options.department.push('Sở Nội vụ');
    expect(()=>g05ApplyCatalogAction(config,items,'department',{type:'add',value:' so  noi vu  '})).toThrow(/trùng/);
    expect(()=>g05ApplyCatalogAction(config,items,'department',{type:'add',value:'   '})).toThrow(/trống/);
    expect(()=>g05ApplyCatalogAction(config,items,'department',{type:'add',value:'  Phòng   ' })).not.toThrow();
    expect(JSON.stringify(items)).toBe(before);
  });
  it('prevents editing of official status catalogs, including ordering',()=>{
    const config=catalogFromItems([]),items=createDemoItems(1);
    for(const key of ['partyLevel','progressParty','progressBuild','progressCouncil'] as const){
      expect(g05LockedCatalog(key)).toBe(true);
      for(const action of [{type:'add',value:'Khác'},{type:'remove',value:config.options[key][0]},{type:'move',value:config.options[key][0],to:1}] as const)
        expect(()=>g05ApplyCatalogAction(config,items,key,action)).toThrow(/khóa/);
    }
  });
  it('blocks removal and rename of used source values, counting normalized variants',()=>{
    const items=createDemoItems(1);
    const config=catalogFromItems(items);
    const value=items[0].department;
    const altered=[{...items[0],department:' '+value.toLocaleUpperCase('vi')+' '}];
    expect(g05UsageCount(altered,'department',value)).toBe(1);
    expect(g05RemoveBlockReason(config,items,'department',value)).toMatch(/sử dụng/);
    expect(()=>g05ApplyCatalogAction(config,items,'department',{type:'remove',value})).toThrow(/sử dụng/);
    expect(()=>g05ApplyCatalogAction(config,items,'department',{type:'rename',previous:value,value:'Tên mới'})).toThrow(/sử dụng/);
  });
  it('allows add, move, rename and remove of unused values without touching rows',()=>{
    const items=createDemoItems(1),config=catalogFromItems(items);
    const before=JSON.stringify(items);
    const added=g05ApplyCatalogAction(config,items,'department',{type:'add',value:'  Sở Truyền thông '});
    const moved=g05ApplyCatalogAction(added,items,'department',{type:'move',value:'Sở Truyền thông',to:0});
    expect(moved.options.department[0]).toBe('Sở Truyền thông');
    const renamed=g05ApplyCatalogAction(moved,items,'department',{type:'rename',previous:'Sở Truyền thông',value:'Sở mới'});
    expect(renamed.options.department[0]).toBe('Sở mới');
    const removed=g05ApplyCatalogAction(renamed,items,'department',{type:'remove',value:'Sở mới'});
    expect(removed.options.department).toEqual(config.options.department);
    expect(JSON.stringify(items)).toBe(before);
    expect(validateCatalog(removed)).toBeTruthy();
  });
  it('preserves specialist-room relationship through rename and blocks linked deletes',()=>{
    const items=createDemoItems(1),config=catalogFromItems(items);
    const person='G05 Chuyên viên',room=items[0].room;
    config.options.specialist.push(person);config.specialistRooms[person]=[room];
    expect(()=>g05ApplyCatalogAction(config,items,'specialist',{type:'remove',value:person})).toThrow(/liên kết/);
    const changed=g05ApplyCatalogAction(config,items,'specialist',{type:'rename',previous:person,value:'G05 Chuyên viên mới'});
    expect(changed.specialistRooms['G05 Chuyên viên mới']).toContain(room);
    expect(changed.specialistRooms[person]).toBeUndefined();
    expect(()=>g05ApplyCatalogAction(changed,items,'room',{type:'remove',value:room})).toThrow();
  });
  it('retains group-report stable IDs after unused department rename',()=>{
    const items=createDemoItems(1),config=catalogFromItems(items);
    config.options.department.push('G05 nhóm');
    // A fresh group ID is materialized from the config before it is renamed.
    const seeded=validateCatalog(config);
    const before=reportReferenceGroupValue('G05 nhóm','department',seeded.groupIdentities).id;
    const updated=g05ApplyCatalogAction(seeded,items,'department',{type:'rename',previous:'G05 nhóm',value:'G05 nhóm mới'});
    expect(reportReferenceGroupValue('G05 nhóm mới','department',updated.groupIdentities).id).toBe(before);
    expect(reportReferenceGroupValue('G05 nhóm','department',updated.groupIdentities).id).toBe(before);
  });
  it('guards custom values and validates the existing 20 custom-column ceiling',()=>{
    expect(g05ApplyCustomChoices(['Một'],[],{type:'add',value:'Hai'})).toEqual(['Một','Hai']);
    expect(()=>g05ApplyCustomChoices(['Một'],[],{type:'add',value:'mot'})).toThrow(/trùng/);
    expect(()=>g05ApplyCustomChoices(['Một'],['Một'],{type:'remove',value:'Một'})).toThrow(/sử dụng/);
    const layout=defaultItemLayout();
    for(let i=0;i<20;i++)layout.columns.push({key:'custom_'+String(i).padStart(8,'0'),label:'G05 '+i,width:180,visible:true,origin:'custom',kind:'text',values:{}});
    expect(()=>validateItemLayout(layout)).not.toThrow();
    layout.columns.push({key:'custom_123456789',label:'Vượt trần',width:180,visible:true,origin:'custom',values:{}});
    expect(()=>validateItemLayout(layout)).toThrow(/20 cột/);
  });
});
