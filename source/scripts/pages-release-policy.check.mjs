import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyCommits,isAutoUiPath,isPagesArtifactCommit,
  isBootstrapPolicyCommit,isSafePresentationSource} from './pages-release-policy.mjs';

const baseline='cc81aee8114a969892f6a812f03ca37e44a6d5b7';
const uiParent='937c1295cd598e8c9e7ea1878093918d0d5d884f';
const head='0123456789abcdef0123456789abcdef01234567';
const commit=(sha,files,other={})=>({sha,files,parent:baseline,
  author:'developer',email:'dev@example.test',message:'fix(ui): layout',...other});
const decide=(commits,other={})=>classifyCommits({
  commits,baseline,head,approved:'',...other,
});

test('CSS, selected UI components, QA and layout fit can publish without a new SHA variable',()=>{
  const changed=['source/src/features/items/list-row-readability.css',
    'source/src/features/items/ItemList.tsx',
    'source/src/data/fit-table-columns.ts',
    'source/src/components/ColumnResizeHandle.tsx',
    'source/scripts/smoke-pages-browser.mjs',
    'source/src/qa/compact-qa-main.tsx',
    'source/tests/fit-table-columns.test.ts'];
  assert.ok(changed.every(isAutoUiPath));
  assert.deepEqual(decide([commit(head,changed)]),
    {allowed:true,mode:'auto',blocked:[]});
});
const pickerView='source/src/features/items/CellPickerPopupView.tsx';
const pickerGeometry='source/src/features/items/pr95-v5-l1-picker-placement.ts';
const pickerBrowser='source/scripts/pr95-v5-l1-dropdown-browser.mjs';
const safeView=[
  "import type {KeyboardEvent,RefObject} from 'react';",
  "export function CellPickerPopupView({onQueryChange}){",
  'return <input onChange={event=>onQueryChange(event.target.value)}/>;',
  '}',
].join('\n');
const safeGeometry='export function placeCellPicker(){return {side:"below"};}';

test('isolated dropdown UI/geometry + browser QA auto-publish with strict source scope',()=>{
  const files=[pickerView,pickerGeometry,pickerBrowser,
    'source/src/features/items/cell-picker.css'];
  assert.ok(files.every(isAutoUiPath));
  assert.equal(isAutoUiPath('source/src/features/items/CellPicker.tsx'),false);
  const sourceContents={
    [pickerView]:safeView,
    [pickerGeometry]:safeGeometry,
  };
  assert.equal(isSafePresentationSource(pickerView,safeView),true);
  assert.equal(isSafePresentationSource(pickerGeometry,safeGeometry),true);
  assert.deepEqual(decide([commit(head,files)],{sourceContents}),
    {allowed:true,mode:'auto',blocked:[]});
  // A later pure presentation update needs no new owner SHA approval.
  const bot=commit('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ['index.html','version.json','assets/style-generated.css'],{
      author:'github-actions[bot]',
      email:'41898282+github-actions[bot]@users.noreply.github.com',
      message:'build(pages): publish verified Spark WebApp from approved source',
    });
  assert.deepEqual(decide([bot,commit(head,[pickerView])],{sourceContents}),
    {allowed:true,mode:'auto',blocked:[]});
});

test('actual UI-only source remains inside the protected presentation boundary',()=>{
  const files=[
    [pickerView,new URL('../src/features/items/CellPickerPopupView.tsx',import.meta.url)],
    [pickerGeometry,new URL('../src/features/items/pr95-v5-l1-picker-placement.ts',import.meta.url)],
  ];
  for(const [path,url] of files){
    const source=readFileSync(url,'utf8');
    assert.equal(isSafePresentationSource(path,source),true,
      'UI-only module unexpectedly gained a privileged/runtime dependency: '+path);
  }
});

test('UI presentation allowlist fails closed on backend I/O, imports and mixed core edits',()=>{
  const forbidden=[
    safeView.replace('return <input','fetch("https://example.invalid");return <input'),
    safeView+'\nimport {writeRecord} from "../../data/cell-edit-leases";',
    safeView.replace('export function','export function').replace('return <input','window.localStorage.clear();return <input'),
    safeView.replace('return <input','useEffect(()=>onQueryChange("x"),[]);return <input'),
    safeView.replace('return <input','firebase.database().ref("items").set({});return <input'),
    safeView+'\nexport * from "../../data/cell-edit-leases";',
  ];
  for(const source of forbidden){
    assert.equal(isSafePresentationSource(pickerView,source),false);
    assert.deepEqual(decide([commit(head,[pickerView])],{sourceContents:{[pickerView]:source}}),
      {allowed:false,mode:'hold',blocked:[pickerView]});
  }
  assert.equal(isSafePresentationSource(pickerGeometry,
    'import {changeRole} from "./auth";export function placeCellPicker(){return null;}'),false);
  // Fail closed if the source file is missing, deleted, or unavailable.
  assert.deepEqual(decide([commit(head,[pickerView])]),{
    allowed:false,mode:'hold',blocked:[pickerView]});
  // UI-looking CSS cannot hide a modification to the guarded picker core.
  assert.deepEqual(decide([commit(head,[
    pickerView,'source/src/features/items/CellPicker.tsx',
  ])],{sourceContents:{[pickerView]:safeView}}),{
    allowed:false,mode:'hold',blocked:['source/src/features/items/CellPicker.tsx']});
  // Previously unpublished security/data changes are checked across commits.
  assert.deepEqual(decide([
    commit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',['source/src/state/firebase-state.ts']),
    commit(head,[pickerView]),
  ],{sourceContents:{[pickerView]:safeView}}),{
    allowed:false,mode:'hold',blocked:['source/src/state/firebase-state.ts']});
});

test('Firebase Rules and data/auth code changes MUST retain exact-SHA approval',()=>{
  for(const path of [
    'source/firebase/database.spark.rules.json',
    'source/firebase/database.spark-base.rules.json',
    'source/src/state/firebase-state.ts',
    'source/src/data/item-preferences.ts',
    'source/src/app/App.tsx',
    'source/shared/types.ts',
    'source/package-lock.json',
    'source/scripts/pages-release-policy.mjs',
    '.github/workflows/publish-pages.yml',
    '.github/workflows/verify-source.yml',
    'source/index.html',
    'index.html',
    'assets/unapproved.js',
    'version.json',
  ]){
    assert.equal(isAutoUiPath(path),false,'unsafe auto-release allowlist: '+path);
    assert.deepEqual(decide([commit(head,[path])]),{
      allowed:false,mode:'hold',blocked:[path]});
  }
});
test('a later unapproved change cannot hide behind a safe UI final commit',()=>{
  const commits=[
    commit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ['source/firebase/database.spark.rules.json']),
    commit(head,['source/src/styles/app.css']),
  ];
  assert.deepEqual(decide(commits),{allowed:false,mode:'hold',
    blocked:['source/firebase/database.spark.rules.json']});
});
test('an exact, separately approved main SHA still supports sensitive releases',()=>{
  assert.deepEqual(decide([commit(head,['source/firebase/database.spark.rules.json'])],
    {approved:head}),{allowed:true,mode:'approved',blocked:[]});
});
test('generated Pages asset commits may be skipped ONLY as an official bot artifact',()=>{
  const bot=commit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ['index.html','assets/style-CeuvG1Il.css','version.json'],{
      parent:baseline,
      author:'github-actions[bot]',
      email:'41898282+github-actions[bot]@users.noreply.github.com',
      message:'build(pages): publish verified Spark WebApp from approved source',
    });
  assert.equal(isPagesArtifactCommit(bot),true);
  assert.deepEqual(decide([bot,commit(head,['source/src/styles/app.css'])]),
    {allowed:true,mode:'auto',blocked:[]});
  assert.equal(isPagesArtifactCommit({...bot,email:'user@example.test'}),false);
  assert.equal(isPagesArtifactCommit({...bot,files:[...bot.files,'source/firebase/database.spark.rules.json']}),false);
  assert.deepEqual(decide([{...bot,email:'user@example.test'},commit(head,['source/src/styles/app.css'])]),
    {allowed:false,mode:'hold',blocked:bot.files});
});
test('single first rollout of the guarded workflow is accepted only from its exact reviewed parent',()=>{
  const migration=commit(head,[
    '.github/workflows/publish-pages.yml',
    '.github/workflows/spark-pages-release-preflight.yml',
    '.github/workflows/guest-cell-save-ux-20261113.yml',
    'source/scripts/pages-release-policy.mjs',
    'source/scripts/pages-release-policy.check.mjs',
    'source/tests/pages-release-policy.test.ts',
    'README.md',
  ],{parent:uiParent});
  assert.equal(isBootstrapPolicyCommit(migration,baseline,head),true);
  assert.deepEqual(decide([commit(uiParent,['source/src/features/items/ItemList.tsx']),migration]),
    {allowed:true,mode:'auto',blocked:[]});
  assert.equal(isBootstrapPolicyCommit({...migration,parent:baseline},baseline,head),false);
  assert.equal(isBootstrapPolicyCommit(migration,uiParent,head),false);
  assert.equal(isBootstrapPolicyCommit({...migration,files:[...migration.files,
    'source/firebase/database.spark.rules.json']},baseline,head),false);
  assert.deepEqual(decide([migration],{baseline:uiParent}),
    {allowed:false,mode:'hold',blocked:migration.files.filter(isAutoUiPath).length===1
      ?migration.files.filter(path=>!isAutoUiPath(path))
      :migration.files.filter(path=>!isAutoUiPath(path))});
});
test('no eligible changes and invalid SHA are denied by default',()=>{
  assert.deepEqual(decide([]),{allowed:false,mode:'hold',blocked:['NO_ELIGIBLE_CHANGE']});
  assert.equal(decide([commit(head,['source/src/styles/app.css'])],{baseline:'main'}).allowed,false);
  assert.equal(decide([commit(head,['source/src/styles/app.css'])],{head:'changed'}).allowed,false);
});
