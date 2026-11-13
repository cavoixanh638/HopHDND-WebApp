import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {createReferenceListLayout} from '../src/data/reference-list-layout';
import {defaultItemLayout,validateItemLayout,EXCEL_SOURCE_COLUMNS} from '../src/data/item-preferences';

describe('real App display parity with accepted isolated preview',()=>{
  it('applies source order, width and compact grouping only after explicit approval',()=>{
    const original=defaultItemLayout();
    original.listTitle='Kỳ họp HĐND 2026';
    original.frameWidth=920;
    original.tableWidth=2400;
    original.columns=[...original.columns].reverse().map(col=>({
      ...col,width:col.key==='content'?680:col.width,
      visible:col.key==='note'?false:col.visible,
    }));
    const content=original.columns.find(col=>col.key==='content')!;
    content.label='Tên nội dung đã chỉnh';
    content.renamed=true;
    original.groupLabels={partyTogether:'Tiến độ 3 khâu'};
    original.cellHighlights=[{id:'reference01',field:'content',word:'tuyến',
      textColor:'#111111',backgroundColor:'#eeeeee'}];
    const untouched=JSON.stringify(original);
    const result=createReferenceListLayout(original);
    const canonical=defaultItemLayout();
    expect(result.columns.map(col=>col.key)).toEqual(EXCEL_SOURCE_COLUMNS.map(col=>col.key));
    expect(result.columns.map(col=>col.width)).toEqual(canonical.columns.map(col=>col.width));
    expect(result.columns.every(col=>col.visible)).toBe(true);
    expect(result.columns.find(col=>col.key==='content')?.label).toBe('Tên nội dung đã chỉnh');
    expect(result.listTitle).toBe('Kỳ họp HĐND 2026');
    expect(result.cellHighlights).toEqual(original.cellHighlights);
    expect(result.groupLabels).toEqual(original.groupLabels);
    expect(result.summaryCards).toEqual({party:true,build:true,nq:true});
    expect(result.frameWidth).toBe('auto');
    expect(result.tableWidth).toBe(canonical.tableWidth);
    for(const key of ['contentDetails','partyTogether','councilTogether',
      'teamTogether','shortLeaders','shortSpecialist'] as const)
      expect(result.compactDisplay?.[key]).toBe(true);
    expect(result.partyTrackWidths).toEqual(canonical.partyTrackWidths);
    expect(JSON.stringify(original)).toBe(untouched);
    expect(validateItemLayout(result)).toEqual(result);
  });

  it('preserves the independent values and visibility of administrator-defined columns',()=>{
    const original=defaultItemLayout();
    original.columns.push({key:'custom_abcdef12',label:'Thông tin khác',width:144,
      visible:false,origin:'custom',kind:'text',values:{abc:'Dữ liệu đã nhập'}});
    const result=createReferenceListLayout(original);
    expect(result.columns.at(-1)).toEqual(original.columns.at(-1));
    expect(result.columns.at(-1)?.visible).toBe(false);
  });

  it('uses the shared list controls with guarded Firebase bulk staging',()=>{
    const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
    const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
    const css=readFileSync(new URL('../src/features/items/real-list-visual-parity.css',import.meta.url),'utf8');
    expect(app).toContain("compactChrome={page==='items'}");
    expect(app).toContain("list-fit-page list-visual-parity");
    expect(list).toContain("const denseChrome=compactPreview||compactChrome;");
    expect(app).toContain("onBulkApply={adminTools&&isFirebase&&selectedSource==='primary'&&firebase!.isAdmin?stageAdminBulkDraft:undefined}");
    expect(list).toContain('{denseChrome&&onBulkApply&&');
    expect(list).toContain("live={sourceKind==='firebase'}");
    expect(list).toContain('{denseChrome&&<button type="button" className="button ghost admin-list-print-trigger"');
    expect(list).toContain('hidden={denseChrome&&!previewOptionsOpen}');
    expect(list).toContain('applyViewerLayout(createReferenceListLayout)');
    expect(list).toContain('referencePresetConfirm');
    expect(css).toContain('.app-shell.list-visual-parity .admin-list-controls[hidden]');
    expect(css).not.toContain('permission:true');
  });
});