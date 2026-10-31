/** Reusable SKILL.md minimum schema and links check. No downloads/deploy. 
 * The skill-creator quick_validate.py is not bundled with this repository;
 * validate the exact frontmatter shape, referenced paths and placeholders.
 */
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

const file='skills/hophdnd-cell-picker-regression/SKILL.md';
const raw=readFileSync(file,'utf8');
const fail=message=>{throw Error('PR95_V6_L5_SKILL_FAIL: '+message);};
const front=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if(!front)fail('YAML frontmatter missing at start');
const fields={};
for(const line of front[1].split(/\r?\n/)){
  if(!line.trim())continue;
  const m=line.match(/^([a-z_-]+):\s*(.+)$/);
  if(!m)fail('frontmatter line malformed '+line);
  if(Object.hasOwn(fields,m[1]))fail('duplicate key '+m[1]);
  fields[m[1]]=m[2];
}
const expected='hophdnd-cell-picker-regression';
if(fields.name!==expected||!/^[-a-z0-9]+$/.test(fields.name)||fields.name.length>=64)
  fail('skill name invalid/does not match directory');
if(!fields.description||!/^".+"$/.test(fields.description)||
  !/(dropdown|picker)/i.test(fields.description)||
  !/(khi|when)/i.test(fields.description))fail('description not a when-to-use description');
if(Object.keys(fields).sort().join(',')!=='description,name')fail('unexpected skill YAML frontmatter fields');
if(!raw.includes('# Kiểm và sửa dropdown')||!raw.includes('## 1.')||
  !raw.includes('## 4.')||!raw.includes('## 5.'))fail('skill structure missing');
if(/TODO|FIXME|\[insert|placeholder|lorem ipsum|\{\{.*\}\}/i.test(raw))
  fail('scaffold/placeholder remains');
const references=[
  'src/features/items/CellPicker.tsx',
  'src/features/items/pr95-v5-l1-picker-coordinator.ts',
  'src/features/items/pr95-v5-l1-picker-placement.ts',
  'src/data/cell-edit-leases.ts',
  'src/data/excel-transfer.ts',
  'src/domain/pr95-v5-l4-build-effective.ts',
  'src/domain/item-summary.ts',
  'src/features/items/SearchHighlight.tsx',
  'src/features/items/compact-columns.ts',
  'tests/pr95-v5-l1-dropdown.test.tsx',
  'tests/cell-picker-lazy.test.tsx',
  'tests/exclusive-cell-freeze.test.ts',
  'tests/pr95-app-lease-epoch.test.ts',
  'tests/inline-permissions.test.tsx',
  'tests/pr95-v5-l4-hc-bc-build.test.ts',
  'tests/pr95-v5-l5-progress-build-write-guard.test.ts',
  'tests/pr95-l4-excel-contract.test.ts',
  'tests/excel-transfer.test.ts',
  'tests/item-summary.test.ts',
  'tests/pr95-l5-report-filter-parity.test.ts',
  'tests/search-highlight.test.tsx',
  'tests/compact-group-highlights.test.tsx',
  'tests/adjacent-column-resize.test.ts',
  'tests/confirmed-page-widths.test.ts',
  'scripts/pr95-v5-l1-dropdown-browser.mjs',
  'scripts/pr95-v5-l1-race-browser.mjs'
];
for(const path of references){
  if(!existsSync(resolve(path)))fail('broken source/test reference '+path);
}
for(const command of [
  'npm run typecheck',
  'npx vitest run tests/pr95-v5-l1-dropdown.test.tsx tests/cell-picker-lazy.test.tsx',
  'npm run build:compact:qa',
  'node scripts/pr95-v5-l1-dropdown-browser.mjs',
  'node scripts/pr95-v5-l1-race-browser.mjs',
  'npm run test:firebase'
])if(!raw.includes(command))fail('test command missing '+command);
if(raw.includes('~/.codex')||raw.includes('firebase deploy')||
  raw.includes('git push origin main'))fail('skill contains forbidden release/installation command');
console.log('PR95_V6_L5_SKILL_VALIDATED '+JSON.stringify({
  file,frontmatter:{name:fields.name,hasUseCase:true},referencePaths:references.length,
  commands:6,placeholders:0,bytes:Buffer.byteLength(raw)
}));
