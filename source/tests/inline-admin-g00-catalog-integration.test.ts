import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {g05ApplyCatalogAction,g05LockedCatalog}
  from '../src/features/items/inline-g05-catalog-logic';
const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
const head=readFileSync(new URL('../src/features/items/ColumnHeader.tsx',import.meta.url),'utf8');
describe('G00 + G05 catalog shortcut / canonical contract',()=>{
  it('only authorized Admin opens the selected column manager from its actual header',()=>{
    expect(app).toContain("onOpenCatalog={adminTools&&canCustomize&&page==='items'?key=>{");
    expect(app).toContain("openOptions('items-customize',{currentTarget:document.body});");
    expect(app).toContain("focusColumnKey={page==='items-customize'?focusedAdminColumn:null}");
    expect(list).toContain("onOpenColumnSettings={inlineReady?onOpenCatalog:undefined}");
    expect(list).toContain("<ItemColumnPanel focusColumnKey={focusColumnKey}");
    expect(head).toContain("onOpenColumnSettings(columnKey)");
  });
  it('official status remains locked while nonofficial department options can be edited',()=>{
    const catalog=catalogFromItems(createDemoItems(1));
    expect(g05LockedCatalog('progressParty')).toBe(true);
    expect(g05LockedCatalog('department')).toBe(false);
    expect(()=>g05ApplyCatalogAction(catalog,createDemoItems(1),'progressParty',{type:'add',value:'Mục trái quy định'})).toThrow();
    const after=g05ApplyCatalogAction(catalog,createDemoItems(1),'department',{type:'add',value:'Sở mới'});
    expect(after.options.department).toContain('Sở mới');
    expect(after.options.progressParty).toEqual(catalog.options.progressParty);
  });
});