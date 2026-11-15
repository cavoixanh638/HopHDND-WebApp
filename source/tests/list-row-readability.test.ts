import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/items/list-row-readability.css',import.meta.url),'utf8');
const note=readFileSync(new URL('../src/features/items/InlineNoteEditor.tsx',import.meta.url),'utf8');

describe('HĐND List reading continuity',()=>{
  it('tracks presentation-only document kind on each record and imports the scoped style',()=>{
    expect(list).toContain("import './list-row-readability.css';");
    expect(list).toContain('data-document-kind={item.documentKind}');
    expect(list).toContain("className={['color-row',itemColor(item,colorRules)");
  });
  it('uses the shared user-controlled font size, including three-stage values and ID',()=>{
    expect(css).toContain('font-size:var(--table-font-size,13px)!important');
    for(const selector of ['.code','.compact-stage-label','.compact-stage-state','.compact-stage-level',
      '.workflow-status-value','.compact-document-content','.compact-pair-tag',
      '.inline-note-trigger','.cell-picker-trigger'])expect(css).toContain(selector);
    expect(css).not.toContain('calc(var(--table-font-size,13px) * .94)');
    expect(css).not.toContain('calc(var(--table-font-size,13px) * .95)');
  });
  it('visually separates consecutive records without changing row palettes or printed data',()=>{
    expect(css).toContain('tr.color-row + tr.color-row > td');
    expect(css).toContain('tr.color-row[data-document-kind="NQ"] + tr.color-row[data-document-kind="NQ"] > td');
    for(const color of ['color-mint','color-amber','color-rose','color-blue'])expect(css).toContain(':not(.'+color+')');
    expect(css).toContain('td:not([data-progress-tone])');
    expect(css).not.toContain('hdnd-a4-print-root');
  });
  it('retains the previously approved blank-cell pencil instead of a permanent plus',()=>{
    expect(note).toContain('className="inline-note-pencil"');
    expect(note).not.toContain('className="inline-note-add-icon"');
  });
});
