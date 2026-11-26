import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {classifyCommits,isAutoUiPath,isPagesArtifactCommit,
  isBootstrapPolicyCommit,isSafePresentationSource,
  isVettedSingleTableUi,isScopedAutopublishMigration,reviewedUiTransition,
  isReviewedCiOptimization,reviewedCiOptimization,isSafeOrdinaryFeatureChange,isSafeQaSchedulingChange,
  uiPresentationPath,isSafeUiPresentationData,isSafeUiPresentationChange}
  from './pages-release-policy.mjs';

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
const pickerDomGeometry='source/src/features/items/CellPickerPositioning.ts';
const pickerBrowser='source/scripts/pr95-v5-l1-dropdown-browser.mjs';
const safeView=[
  "import type {KeyboardEvent,RefObject} from 'react';",
  "export function CellPickerPopupView({onQueryChange}){",
  'return <input onChange={event=>onQueryChange(event.target.value)}/>;',
  '}',
].join('\n');
const safeGeometry='export function placeCellPicker(){return {side:"below"};}';
const safeDomGeometry=[
  "import {placeCellPicker,type PickerViewport} from './pr95-v5-l1-picker-placement';",
  'export function positionCellPickerPopover(){return "positioned";}',
].join('\n');

test('isolated dropdown UI/geometry + browser QA auto-publish with strict source scope',()=>{
  const files=[pickerView,pickerGeometry,pickerDomGeometry,pickerBrowser,
    'source/src/features/items/cell-picker.css'];
  assert.ok(files.every(isAutoUiPath));
  assert.equal(isAutoUiPath('source/src/features/items/CellPicker.tsx'),false);
  const sourceContents={
    [pickerView]:safeView,
    [pickerGeometry]:safeGeometry,
    [pickerDomGeometry]:safeDomGeometry,
  };
  assert.equal(isSafePresentationSource(pickerView,safeView),true);
  assert.equal(isSafePresentationSource(pickerGeometry,safeGeometry),true);
  assert.equal(isSafePresentationSource(pickerDomGeometry,safeDomGeometry),true);
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
    [pickerDomGeometry,new URL('../src/features/items/CellPickerPositioning.ts',import.meta.url)],
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
  assert.equal(isSafePresentationSource(pickerDomGeometry,
    safeDomGeometry.replace("'./pr95-v5-l1-picker-placement'","'../../data/cell-edit-leases'")),false);
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

test('reviewed #226 may publish automatically only at the exact vetted SHA and file set',()=>{
  const files=[
    'source/docs/checkpoints/G00_SINGLE_TABLE_2026-11-22.md',
    'source/scripts/smoke-pages-browser.mjs',
    'source/src/app/App.tsx',
    'source/src/features/items/ItemColumnPanel.tsx',
    'source/src/features/items/ItemList.tsx',
    'source/src/features/items/inline-g01-list.css',
    'source/tests/admin-single-data-table-layout.test.ts',
    'source/tests/item-save-flow.test.ts',
    'source/tests/real-demo-visual-parity.test.ts',
  ];
  const exact={sha:reviewedUiTransition.uiCommit,parent:reviewedUiTransition.uiParent,
    files,author:'cavoixanh638',email:'owner@example.test',message:'feat(admin): single List table'};
  const baseline=reviewedUiTransition.baseline;
  assert.equal(isVettedSingleTableUi(exact,baseline),true);
  assert.deepEqual(classifyCommits({commits:[exact],baseline,head,approved:''}),
    {allowed:true,mode:'auto',blocked:[]});
  for(const changed of [
    {...exact,sha:head},
    {...exact,parent:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'},
    {...exact,files:[...files,'source/firebase/database.spark.rules.json']},
    {...exact,files:files.filter(x=>x!=='source/src/app/App.tsx')},
  ])assert.equal(isVettedSingleTableUi(changed,baseline),false);
  assert.equal(isVettedSingleTableUi(exact,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),false);
});

test('single immediate CI migration has exact parent/message/files and no Firebase writes',()=>{
  const migration=[
    '.github/workflows/publish-pages.yml',
    'source/scripts/pages-release-policy.mjs',
    'source/scripts/pages-release-policy.check.mjs',
    'source/tests/pages-release-policy.test.ts',
    'source/docs/checkpoints/G00_SAFE_AUTOPUBLISH_2026-11-22.md',
  ];
  const baseline=reviewedUiTransition.baseline;
  const commit={sha:head,parent:reviewedUiTransition.uiCommit,files:migration,
    message:reviewedUiTransition.migrationMessage,author:'cavoixanh638',
    email:'owner@example.test'};
  assert.equal(isScopedAutopublishMigration(commit,baseline),true);
  assert.deepEqual(classifyCommits({commits:[commit],baseline,head,approved:''}),
    {allowed:true,mode:'auto',blocked:[]});
  const cases=[
    {...commit,parent:baseline},
    {...commit,message:'any-other-message'},
    {...commit,files:[...migration,'source/src/state/firebase-state.ts']},
    {...commit,files:[...migration,'source/firebase/database.spark.rules.json']},
    {...commit,files:[...migration,'source/src/data/item-preferences.ts']},
    {...commit,files:migration.filter(x=>x!=='source/scripts/pages-release-policy.mjs')},
  ];
  for(const bad of cases)assert.equal(isScopedAutopublishMigration(bad,baseline),false);
  assert.equal(isScopedAutopublishMigration(commit,head),false);
});

test('first automatic release includes vetted #226 + exact single migration only',()=>{
  const baseline=reviewedUiTransition.baseline;
  const reviewed={sha:reviewedUiTransition.uiCommit,parent:reviewedUiTransition.uiParent,
    files:[
      'source/docs/checkpoints/G00_SINGLE_TABLE_2026-11-22.md',
      'source/scripts/smoke-pages-browser.mjs',
      'source/src/app/App.tsx',
      'source/src/features/items/ItemColumnPanel.tsx',
      'source/src/features/items/ItemList.tsx',
      'source/src/features/items/inline-g01-list.css',
      'source/tests/admin-single-data-table-layout.test.ts',
      'source/tests/item-save-flow.test.ts',
      'source/tests/real-demo-visual-parity.test.ts',
    ],author:'cavoixanh638',email:'owner@example.test',message:'feat(admin): single List table'};
  const pagesBot={sha:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    parent:baseline,files:['index.html','assets/new.js','version.json'],
    author:'github-actions[bot]',
    email:'41898282+github-actions[bot]@users.noreply.github.com',
    message:'build(pages): publish verified Spark WebApp from approved source'};
  const migration={sha:head,parent:reviewedUiTransition.uiCommit,
    message:reviewedUiTransition.migrationMessage,
    files:[
      '.github/workflows/publish-pages.yml',
      'source/scripts/pages-release-policy.mjs',
      'source/scripts/pages-release-policy.check.mjs',
      'source/tests/pages-release-policy.test.ts',
      'source/docs/checkpoints/G00_SAFE_AUTOPUBLISH_2026-11-22.md',
    ],author:'cavoixanh638',email:'owner@example.test'};
  assert.deepEqual(classifyCommits({commits:[pagesBot,reviewed,migration],baseline,head,approved:''}),
    {allowed:true,mode:'auto',blocked:[]});
  // Unreviewed later changes can never piggy-back on this migration.
  const malicious={...reviewed,sha:'cccccccccccccccccccccccccccccccccccccccc',
    parent:head,files:['source/src/state/firebase-state.ts']};
  assert.deepEqual(classifyCommits({commits:[pagesBot,reviewed,migration,malicious],baseline,
    head:malicious.sha,approved:''}),{allowed:false,mode:'hold',
    blocked:['source/src/state/firebase-state.ts']});
  // Later normal UI-only commits automatically pass with a refreshed baseline.
  const safe=commit(head,['source/src/features/items/inline-g01-list.css']);
  assert.deepEqual(classifyCommits({commits:[safe],baseline:reviewedUiTransition.uiCommit,
    head,approved:''}),{allowed:true,mode:'auto',blocked:[]});
});

test('ordinary search/filter/report presentation can publish without owner when imports remain unchanged',()=>{
  const path='source/src/features/items/SearchHighlight.tsx';
  const before="import {searchMatchRanges} from '../../domain/search';\nexport function SearchHighlight(){return null;}";
  const after=before.replace('return null','return <mark>text</mark>');
  assert.equal(isAutoUiPath(path),true);
  assert.equal(isSafeOrdinaryFeatureChange(path,before,after),true);
  assert.deepEqual(decide([commit(head,[path,'docs/ci/notes.md'],{sourceChanges:{[path]:{before,after}}})]),
    {allowed:true,mode:'auto',blocked:[]});
  for(const bad of [
    after+"\nimport {writeRecord} from '../../data/firebase-repository';",
    after.replace('return <mark>','fetch("https://example.invalid");return <mark>'),
    after+"\nlocalStorage.setItem('a','b');",
    after+"\nexport * from '../../data/firebase-repository';",
    after+"\nimport('../../data/firebase-repository');",
    '',undefined,
  ]){
    assert.equal(isSafeOrdinaryFeatureChange(path,before,bad),false);
    assert.deepEqual(decide([commit(head,[path],{sourceChanges:{[path]:{before,after:bad}}})]),
      {allowed:false,mode:'hold',blocked:[path]});
  }
  assert.deepEqual(decide([commit(head,[path])]),{allowed:false,mode:'hold',blocked:[path]});
});
test('all added ordinary feature modules currently meet the read/presentation boundary',()=>{
  for(const path of ["source/src/domain/search.ts","source/src/features/items/ActiveListFilters.tsx","source/src/features/items/ColumnFilterCell.tsx","source/src/features/items/CompactGroupFilterCell.tsx","source/src/features/items/RoomSpecialistFilterCell.tsx","source/src/features/items/SearchHighlight.tsx","source/src/features/items/compact-menu-placement.ts","source/src/features/items/filter-scroll.ts","source/src/features/items/list-toolbar-filters.ts","source/src/features/items/list-print.ts","source/src/features/reports/ReportTable.tsx","source/src/features/reports/inline-g04-popup-width.ts","source/src/features/reports/inline-g04-popup-handles.tsx"]){
    const source=readFileSync(new URL('../../'+path,import.meta.url),'utf8');
    assert.equal(isSafeOrdinaryFeatureChange(path,source,source),true,path);
  }
});
test('CI metadata-only optimization auto-publishes without changing actual checks or permissions',()=>{
  const path='.github/workflows/verify-source.yml';
  const before="name: Source checks\non: pull_request\npermissions:\n  contents: read\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    timeout-minutes: 20\n    steps:\n      - run: npm test\n";
  const concurrency=[
    'concurrency:',
    '  group: pr-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}',
    "  cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
  ].join('\n')+'\n';
  const after=before.replace('jobs:',concurrency+'jobs:').replace('timeout-minutes: 20','timeout-minutes: 30');
  assert.equal(isSafeQaSchedulingChange(path,before,after),true);
  assert.deepEqual(decide([commit(head,[path],{sourceChanges:{[path]:{before,after}}})]),
    {allowed:true,mode:'auto',blocked:[]});
  for(const bad of [
    after.replace('npm test','echo skipped'),
    after.replace('contents: read','contents: write'),
    after.replace('timeout-minutes: 30','timeout-minutes: 0'),
    after.replace('timeout-minutes: 30','timeout-minutes: 999'),
    after.replace("github.event_name == 'pull_request'","true"),
    after.replace('on: pull_request','on: push'),
    after.replace('      - run: npm test','      - if: false\n        run: npm test'),
    '',undefined,
  ]){
    assert.equal(isSafeQaSchedulingChange(path,before,bad),false);
    assert.deepEqual(decide([commit(head,[path],{sourceChanges:{[path]:{before,after:bad}}})]),
      {allowed:false,mode:'hold',blocked:[path]});
  }
  assert.equal(isSafeQaSchedulingChange('.github/workflows/publish-pages.yml',before,after),false);
  assert.equal(isSafeQaSchedulingChange('.github/workflows/spark-pages-release-preflight.yml',before,after),false);
  assert.equal(isSafeQaSchedulingChange('.github/workflows/unknown.yml',before,after),false);
});
test('reviewed PR230 receipt applies only to exact historical commit and cannot self-approve the policy migration',()=>{
  const exact={sha:reviewedCiOptimization.sha,parent:reviewedCiOptimization.parent,files:[".github/scripts/ci-pr-scope.mjs",".github/scripts/ci-pr-scope.test.mjs",".github/workflows/excel-schema-fingerprint-20261113.yml",".github/workflows/firebase-operational-qa.yml",".github/workflows/guest-cell-save-ux-20261113.yml",".github/workflows/original-hdnd-excel-parser-20261113.yml",".github/workflows/pr188-two-browser.yml",".github/workflows/qa-pr-scope-guard.yml",".github/workflows/real-spark-list-browser-20261113.yml",".github/workflows/real-spark-list-ui-parity-20261113.yml",".github/workflows/simple-admin-file-backup-ci.yml",".github/workflows/spark-direct-status-cas.yml",".github/workflows/spark-pages-release-preflight.yml",".github/workflows/verify-firebase-staging.yml",".github/workflows/verify-source.yml","docs/ci/PR_SCOPE_OPTIMIZATION_2026-11-22.md"]};
  const baseline=reviewedCiOptimization.baseline;
  assert.equal(isReviewedCiOptimization(exact,baseline),true);
  assert.deepEqual(decide([exact,commit(head,['source/src/features/items/ItemList.tsx'])],{baseline}),
    {allowed:true,mode:'auto',blocked:[]});
  for(const bad of [
    {...exact,sha:head},
    {...exact,parent:head},
    {...exact,files:[...exact.files,'source/firebase/database.spark.rules.json']},
    {...exact,files:exact.files.slice(1)},
  ])assert.equal(isReviewedCiOptimization(bad,baseline),false);
  assert.equal(isReviewedCiOptimization(exact,head),false);
  const migration='source/scripts/pages-release-policy.mjs';
  assert.deepEqual(decide([exact,commit(head,[migration])],{baseline}),
    {allowed:false,mode:'hold',blocked:[migration]});
  const sensitive='source/src/data/firebase-repository.ts';
  assert.deepEqual(decide([exact,commit(head,[sensitive,'source/src/features/items/ItemList.tsx'])],{baseline}),
    {allowed:false,mode:'hold',blocked:[sensitive]});
});
test('unknown code, write-capable view, test selector and production guards never become auto on file name alone',()=>{
  for(const path of [
    'source/src/features/reports/ReportDetailGrid.tsx','source/src/features/items/ItemColumnPanel.tsx',
    'source/src/app/App.tsx','source/src/state/use-firebase.ts','source/src/data/firebase-repository.ts',
    'source/shared/field-definitions.ts','source/src/features/items/UnknownNewFeature.tsx',
    '.github/scripts/ci-pr-scope.mjs','source/scripts/pages-release-approval.mjs',
    '.github/workflows/publish-pages.yml','source/firebase/database.spark.rules.json',
  ])assert.deepEqual(decide([commit(head,[path])]),{allowed:false,mode:'hold',blocked:[path]});
});


const actualPresentationSource=readFileSync(new URL('../../'+uiPresentationPath,import.meta.url),'utf8');
// Regression scenarios use an immutable synthetic fixture, not mutable live
// wording/aliases; valid future edits must not require changing these tests.
const presentationSource=JSON.stringify({
  version:1,
  organisationAliases:[{fields:['department','room'],source:'Đơn vị mẫu A',label:'ĐV A'}],
  labels:{
    savedLayoutTrigger:'Chọn giao diện',savedLayoutHeading:'Giao diện đã lưu',
    savedLayoutUnnamed:'Giao diện hiện tại (chưa đặt tên)',columnOptions:'Tùy chọn cột',
    departmentSearch:'Tìm Sở, ngành',otherSearch:'Tìm lựa chọn',
    departmentPlaceholder:'Tìm tên Sở, ngành (không dấu)',otherPlaceholder:'Nhập để lọc',
    pickerEmpty:'Không có lựa chọn phù hợp.',
  },
  icons:{savedLayoutAdd:{path:'M8 2.5v11M2.5 8h11',strokeWidth:2}},
});
const presentationObject=()=>JSON.parse(presentationSource);
const serializeConfig=JSON.stringify;
const candidate=(modify)=>{const value=presentationObject();modify(value);return serializeConfig(value);};
const configCommit=(before,after,sha=head)=>commit(sha,[uiPresentationPath],{
  sourceChanges:{[uiPresentationPath]:{before,after}},
});
test('checked-in presentation JSON is valid, and ordinary label/alias/icon changes auto-release',()=>{
  assert.equal(isAutoUiPath(uiPresentationPath),true);
  assert.equal(isSafeUiPresentationData(actualPresentationSource),true);
  assert.equal(isSafeUiPresentationData(presentationSource),true);
  for(const after of [
    candidate(c=>{c.organisationAliases[0].label='VPUB';}),
    candidate(c=>{c.organisationAliases.push({fields:['department'],source:'Đơn vị thử nghiệm',label:'ĐV thử'});}),
    candidate(c=>{c.labels.savedLayoutTrigger='Mẫu giao diện';c.labels.columnOptions='Tùy chỉnh cột';}),
    candidate(c=>{c.icons.savedLayoutAdd.path='M8 3v10M3 8h10';c.icons.savedLayoutAdd.strokeWidth=1.5;}),
  ]){
    assert.equal(isSafeUiPresentationChange(presentationSource,after),true);
    assert.deepEqual(decide([configCommit(presentationSource,after)]),{allowed:true,mode:'auto',blocked:[]});
  }
});
test('declarative UI guard rejects malformed or executable payloads, business fields and ambiguous aliases',()=>{
  for(const after of [
    '',
    undefined,
    '{"version":1}',
    candidate(c=>{c.version=2;}),
    candidate(c=>{c.auth={admin:true};}),
    candidate(c=>{c.labels.onClick='save';}),
    candidate(c=>{c.labels.columnOptions='<script>bad</script>';}),
    candidate(c=>{c.labels.columnOptions='abc\u202Edef';}),
    candidate(c=>{c.organisationAliases[0].fields=['progressParty'];}),
    candidate(c=>{c.organisationAliases[0].fields=['department','department'];}),
    candidate(c=>{c.organisationAliases.push({...c.organisationAliases[0],label:'Alias khác'});}),
    candidate(c=>{c.organisationAliases.push({...c.organisationAliases[0],source:'Đơn vị khác'});}),
    candidate(c=>{c.icons.savedLayoutAdd.path='M8 2" onload="bad';}),
    candidate(c=>{c.icons.savedLayoutAdd.strokeWidth='2';}),
    candidate(c=>{c.icons.savedLayoutAdd.strokeWidth=10;}),
    candidate(c=>{c.icons.savedLayoutAdd.href='https://example.invalid/';}),
  ]){
    assert.equal(isSafeUiPresentationData(after),false);
    assert.deepEqual(decide([configCommit(presentationSource,after)]),
      {allowed:false,mode:'hold',blocked:[uiPresentationPath]});
  }
  assert.deepEqual(decide([configCommit(undefined,presentationSource)]),
    {allowed:false,mode:'hold',blocked:[uiPresentationPath]});
  assert.deepEqual(decide([commit(head,[uiPresentationPath])]),
    {allowed:false,mode:'hold',blocked:[uiPresentationPath]});
  assert.deepEqual(decide([commit(head,['source/src/presentation/unknown.json'])]),
    {allowed:false,mode:'hold',blocked:['source/src/presentation/unknown.json']});
});
test('a safe data-only edit cannot conceal changes to mixed edit/save hosts or policy',()=>{
  const after=candidate(c=>{c.labels.columnOptions='Tùy chỉnh cột';});
  for(const path of [
    'source/src/features/items/CellPicker.tsx',
    'source/src/features/items/SavedLayoutMenu.tsx',
    'source/src/features/items/L03InlineWidthControl.tsx',
    'source/src/features/items/status-display.ts',
    'source/src/domain/organisation-display.ts',
    'source/src/data/item-preferences.ts',
    'source/src/app/App.tsx',
    'source/src/data/firebase-repository.ts',
    'source/firebase/database.spark.rules.json',
    'source/scripts/pages-release-policy.mjs',
    'source/scripts/pages-release-approval.mjs',
    '.github/workflows/publish-pages.yml',
  ]){
    assert.deepEqual(decide([commit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',[path]),
      configCommit(presentationSource,after)]),{allowed:false,mode:'hold',blocked:[path]});
  }
  const invalid=candidate(c=>{c.auth={admin:true};});
  assert.deepEqual(decide([configCommit(presentationSource,invalid,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    configCommit(invalid,after)]),{allowed:false,mode:'hold',blocked:[uiPresentationPath]});
});
test('audited layout math and exact read-only presentation imports may auto-release, other imports stay guarded',()=>{
  for(const path of [
    'source/src/features/items/list-nowrap-widths.ts',
    'source/src/features/items/l03-width-geometry.ts',
  ]){
    const before=readFileSync(new URL('../../'+path,import.meta.url),'utf8');
    const after=before+'\n// screen geometry only\n';
    assert.equal(isAutoUiPath(path),true);
    assert.equal(isSafeOrdinaryFeatureChange(path,before,after),true,path);
    assert.deepEqual(decide([commit(head,[path],{sourceChanges:{[path]:{before,after}}})]),
      {allowed:true,mode:'auto',blocked:[]});
    for(const bad of [after+'\nwindow.location.href="https://example.invalid";',
      after+'\nimport {writeRecord} from "../../data/firebase-repository";',
      after+'\neditor.onWidthsCommit({});'])
      assert.equal(isSafeOrdinaryFeatureChange(path,before,bad),false);
  }
  const path='source/src/features/items/ColumnFilterCell.tsx';
  const before="import type {Item} from '../../../shared/types';\nexport function View(){return null;}";
  const after=before+"\nimport {displayOrganisationName} from '../../domain/organisation-display';";
  assert.equal(isSafeOrdinaryFeatureChange(path,before,after),true);
  assert.equal(isSafeOrdinaryFeatureChange(path,before,
    after.replace('../../domain/organisation-display','../../data/firebase-repository')),false);
  const configView=safeView+"\nimport uiPresentation from '../../presentation/ui-presentation.json';";
  assert.equal(isSafePresentationSource(pickerView,configView),true);
  assert.equal(isSafePresentationSource(pickerView,
    configView.replace('ui-presentation.json','unreviewed.json')),false);
});
test('actual git history: valid UI-only push auto, invalid earlier change cannot hide behind a later safe commit',()=>{
  const temp=mkdtempSync(join(tmpdir(),'hdnd-ui-release-'));
  try{
    const p=join(temp,uiPresentationPath),script=join(temp,'source/scripts/pages-release-policy.mjs');
    mkdirSync(dirname(p),{recursive:true});mkdirSync(dirname(script),{recursive:true});
    copyFileSync(new URL('./pages-release-policy.mjs',import.meta.url),script);
    const git=(...args)=>execFileSync('git',args,{cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    git('init','-q');git('config','user.name','QA');git('config','user.email','qa@example.invalid');
    const save=(msg)=>{git('add','.');git('commit','-qm',msg);return git('rev-parse','HEAD');};
    writeFileSync(p,presentationSource);const first=save('approved baseline');
    const after=candidate(c=>{c.labels.savedLayoutHeading='Mẫu đã lưu';});
    writeFileSync(p,after);const second=save('UI label only');
    const decision=(start,end)=>{
      const out=execFileSync(process.execPath,[script,'--baseline',start,'--head',end],{cwd:temp,encoding:'utf8'});
      return JSON.parse(out.split('\n').find(line=>line.startsWith('PAGES_RELEASE_POLICY ')).slice('PAGES_RELEASE_POLICY '.length));
    };
    assert.equal(decision(first,second).mode,'auto');
    writeFileSync(p,candidate(c=>{c.permissions={admin:true};}));save('bad earlier change');
    writeFileSync(p,presentationSource);const fourth=save('restore label data');
    assert.equal(decision(second,fourth).mode,'hold');
    assert.deepEqual(decision(second,fourth).blocked,[uiPresentationPath]);
    const guarded=join(temp,'source/src/features/items/CellPicker.tsx');
    mkdirSync(dirname(guarded),{recursive:true});writeFileSync(guarded,'// guarded core');
    const fifth=save('guarded mixed core');
    assert.deepEqual(decision(fourth,fifth).blocked,['source/src/features/items/CellPicker.tsx']);
    writeFileSync(p,after);const sixth=save('ordinary label after guarded edit');
    assert.equal(decision(fourth,sixth).mode,'hold');
  }finally{rmSync(temp,{recursive:true,force:true});}
});
