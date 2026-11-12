/** Validate the existing repository skill without installing or executing it.
 * Node built-ins only; equivalent to the worker's documented schema/link checks.
 */
import {readFileSync,statSync} from 'node:fs';
import {basename,dirname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const relativeFile='skills/hophdnd-inline-search-highlight/SKILL.md';
const file=resolve(sourceRoot,relativeFile);
const raw=readFileSync(file,'utf8');
const fail=message=>{throw Error('PR95_V6_L2_SKILL_FAIL: '+message);};
const front=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if(!front)fail('YAML frontmatter missing at start');
const fields={};
for(const line of front[1].split(/\r?\n/)){
  if(!line.trim())continue;
  const entry=line.match(/^([a-z_-]+):\s*(\S.*)$/);
  if(!entry)fail('expected one scalar frontmatter field per line');
  if(Object.hasOwn(fields,entry[1]))fail('duplicate frontmatter key '+entry[1]);
  fields[entry[1]]=entry[2].trim();
}
if(Object.keys(fields).sort().join(',')!=='description,name')
  fail('frontmatter must contain only name and description');
if(fields.name!==basename(dirname(file))||fields.name.length>64||
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name))
  fail('skill name must match its directory and use lowercase hyphens');
if(fields.description.length>1024||!/(?:use|when).*highlight|highlight.*use when/i.test(fields.description)||
  /[<>]/.test(fields.description))
  fail('description must explain when to use the highlight skill');
if(/\b(?:TODO|FIXME|TBD)\b|\[insert\b|lorem ipsum|\{\{[^]*?\}\}/i.test(raw))
  fail('unfinished scaffold or placeholder');
for(const heading of ['## Scope and first diagnosis','## Fix pattern',
  '## Required verification','## Reuse boundaries'])
  if(!raw.includes(heading))fail('missing diagnostic/verification section '+heading);

const references=[
  'src/features/items/SearchHighlight.tsx',
  'src/features/items/search-highlight.css',
  'src/domain/search.ts',
  'tests/search.test.ts',
  'tests/search-highlight.test.tsx',
  'tests/pr95-v6-l2-inline-search-highlight.test.tsx',
  'scripts/pr95-v6-l2-inline-highlight-browser.mjs'
];
const mentioned=new Set(raw.match(/\b(?:src|tests|scripts)\/[A-Za-z0-9_./-]+\.(?:tsx?|mjs|css)\b/g)??[]);
for(const path of references)if(!mentioned.has(path))fail('required reference missing '+path);
for(const path of mentioned){
  const target=resolve(sourceRoot,path);
  if(!target.startsWith(sourceRoot+sep))fail('reference escapes source tree '+path);
  try{if(!statSync(target).isFile())fail('reference is not a file '+path);}
  catch{fail('broken source/test reference '+path);}
}
const commands=[
  'npm ci',
  'npm run typecheck',
  'npm exec -- vitest run tests/search.test.ts tests/search-highlight.test.tsx tests/pr95-v6-l2-inline-search-highlight.test.tsx',
  'npm run build:compact:qa',
  'node scripts/pr95-v6-l2-inline-highlight-browser.mjs'
];
for(const command of commands)if(!raw.includes(command))fail('verification command missing '+command);
const marker='PR95_V6_L2_INLINE_GEOMETRY_PASS';
if(!raw.includes(marker)||!readFileSync(resolve(sourceRoot,references.at(-1)),'utf8').includes(marker))
  fail('real-browser evidence marker missing from skill or runner');
if(!raw.includes('styling fixture')||!raw.includes('no permission'))
  fail('popup-evidence or release-authorization boundary missing');

console.log('PR95_V6_L2_SKILL_VALIDATED '+JSON.stringify({
  file:relativeFile,name:fields.name,referencePaths:mentioned.size,
  commands:commands.length,placeholders:0,bytes:Buffer.byteLength(raw)
}));
