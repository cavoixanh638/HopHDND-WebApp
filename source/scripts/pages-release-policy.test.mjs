import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyCommits,isAutoUiPath,isPagesArtifactCommit,
  isBootstrapPolicyCommit} from './pages-release-policy.mjs';

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
    'source/scripts/pages-release-policy.mjs',
    'source/scripts/pages-release-policy.test.mjs',
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
