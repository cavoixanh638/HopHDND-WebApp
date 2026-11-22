import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {mayEdit} from '../src/data/firebase-repository';
import type {CellPermissions} from '../src/data/firebase-repository';

const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('../src/features/items/ItemColumnPanel.tsx',import.meta.url),'utf8');
const rules=JSON.parse(readFileSync(new URL('../firebase/database.spark.rules.json',import.meta.url),'utf8'));
const archivedSource=readFileSync(new URL('../docs/chuc-nang-cu-khong-dung/InlinePermissionsTable.tsx.txt',import.meta.url),'utf8');

describe('G00 — retired detailed row/cell rights; column-only grants',()=>{
  it('row/cell allow cannot open a denied column (fail closed)',()=>{
    const old:CellPermissions={columns:{note:false},
      rows:{r1:true},cells:{r1:{note:true}}};
    expect(mayEdit(old,'r1','note')).toBe(false);
    expect(mayEdit({columns:{},rows:{r1:true},cells:{r1:{note:true}}},'r1','note')).toBe(false);
    expect(mayEdit(old,'r1','note',true)).toBe(true);
    expect(mayEdit(old,'r1','stt' as never,true)).toBe(false);
  });
  it('an allowed column stays writable despite archived row/cell deny',()=>{
    const old:CellPermissions={columns:{note:true},
      rows:{r1:false},cells:{r1:{note:false}}};
    expect(mayEdit(old,'r1','note')).toBe(true);
    expect(mayEdit(old,'another-row','note')).toBe(true);
    expect(mayEdit(old,'r1','content')).toBe(false);
  });
  it('the real Admin has no detailed-rights route, tab, duplicate table or clear button',()=>{
    expect(app).not.toContain('items-permissions');
    expect(app).not.toContain('Phân quyền chỉnh sửa ô');
    expect(list).not.toContain('InlinePermissionsTable');
    expect(list).not.toContain('permissionModeOnly');
    expect(panel).toContain('Cho phép sửa toàn bộ các ô thuộc cột này.');
    expect(panel).not.toContain('column-rights-warning');
    expect(panel).not.toContain('clearExceptions');
    expect(archivedSource).toContain('export function InlinePermissionsTable');
  });
  it('all Spark candidate write/read authorizers ignore deprecated rows and cells',()=>{
    let checked=0;
    const walk=(node:Record<string,unknown>)=>{
      for(const value of Object.values(node)){
        if(typeof value==='string'){
          if(value.includes('permissions')){
            expect(value).not.toContain('permissions/cells');
            expect(value).not.toContain(".child('cells')");
            checked++;
          }
        }else if(value&&typeof value==='object')walk(value as Record<string,unknown>);
      }
    };
    walk(rules.rules.hdnd);
    expect(checked).toBeGreaterThan(25);
  });
});
