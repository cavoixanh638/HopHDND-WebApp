import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {classifyPath, decideScope, evaluateCheckout, changedPathsFromCheckout, SUITE_KINDS} from './ci-pr-scope.mjs';

const expectedSuites = ['excel-schema','original-excel','guest-save','two-browser','list-browser','list-ui-parity','simple-admin','status-cas'];
test('suite registry is complete and bounded',()=>{
  assert.deepEqual(Object.keys(SUITE_KINDS).sort(), [...expectedSuites].sort());
  assert.throws(()=>decideScope('fake-scope',['source/a.ts']),/Unknown QA suite/);
});

test('all suites run when security, package, permission, unknown script or workflow changes',()=>{
  for (const path of ['source/src/app/App.tsx','source/src/features/items/ItemColumnPanel.tsx',
    'source/src/features/items/ItemList.tsx','source/firebase/database.spark.rules.json',
    'source/package-lock.json','source/shared/types.ts','source/scripts/smoke-pages-browser.mjs',
    '.github/workflows/publish-pages.yml','.github/scripts/ci-pr-scope.mjs',
    'source/tests/admin-consolidated-controls.test.ts','source/src/data/business-excel.ts',
    'source/src/data/unknown-helper.ts','source/src/domain/party-progress-edit.ts']) {
    assert.equal(classifyPath(path), 'critical', path);
    for (const suite of expectedSuites) assert.equal(decideScope(suite,[path]).run, true, `${path}: ${suite}`);
  }
});

test('docs-only changes skip only selected expensive PR suites',()=>{
  const paths=['README.md','source/docs/checkpoints/REVIEW.md'];
  for (const suite of expectedSuites) {
    const d=decideScope(suite,paths);
    assert.deepEqual({run:d.run, reason:d.reason},{run:false,reason:'not-affected-by-allowlisted-changes'});
  }
});

test('CSS-only lists run UI/admin/guest checks but not Excel/CAS/two-browser',()=>{
  const paths=['source/src/features/items/inline-g01-list.css'];
  for (const suite of ['guest-save','list-browser','list-ui-parity','simple-admin']) assert.equal(decideScope(suite, paths).run,true,suite);
  for (const suite of ['excel-schema','original-excel','two-browser','status-cas']) assert.equal(decideScope(suite, paths).run,false,suite);
});

test('pure selector/picker geometry needs guest/browser/status, not Excel',()=>{
  const paths=['source/src/features/items/CellPickerPositioning.ts'];
  for (const suite of ['guest-save','two-browser','list-browser','list-ui-parity','simple-admin','status-cas']) assert.equal(decideScope(suite,paths).run,true,suite);
  for (const suite of ['excel-schema','original-excel']) assert.equal(decideScope(suite,paths).run,false,suite);
});

test('known presentation modules do not trigger Firebase CAS but do trigger UI suites',()=>{
  const paths=['source/src/data/fit-table-columns.ts'];
  assert.equal(decideScope('list-browser',paths).run,true);
  assert.equal(decideScope('list-ui-parity',paths).run,true);
  assert.equal(decideScope('simple-admin',paths).run,true);
  assert.equal(decideScope('status-cas',paths).run,false);
  assert.equal(decideScope('original-excel',paths).run,false);
});

test('print + report affect UI browser checks and never silently bypass critical additions',()=>{
  assert.equal(decideScope('list-browser',['source/src/features/items/list-print.ts']).run,true);
  assert.equal(decideScope('list-ui-parity',['source/src/features/items/list-print.ts']).run,true);
  assert.equal(decideScope('status-cas',['source/src/features/items/list-print.ts']).run,false);
  assert.equal(decideScope('status-cas',['source/src/features/items/list-print.ts','source/src/data/secret-new.ts']).run,true);
});

test('no diff or excessive diff fails closed for all suites',()=>{
  for (const paths of [[],null,Array(3001).fill('README.md')]) {
    for (const suite of expectedSuites) {
      const d=decideScope(suite,paths); assert.equal(d.run,true);assert.equal(d.reason,'missing-or-oversized-diff');
    }
  }
});

test('invalid paths, deletion-like source and unusual filenames fail closed',()=>{
  for(const path of ['', '../source/x.css', '/source/src/x.css', 'source\\src\\x.css', 'source/src/features/items/unknown.tsx']) {
    assert.equal(classifyPath(path),'critical',path);
  }
});

test('manual dispatch and historical push branch always run the full suite',()=>{
  for (const eventName of ['push','workflow_dispatch','schedule','merge_group']) {
    const d=evaluateCheckout('status-cas',{eventName,cwd:'/no/such/folder'});
    assert.equal(d.run,true); assert.equal(d.reason,'non-pr-event-full-qa');
  }
});

test('missing or shallow merge checkout fails closed without network fallback',()=>{
  const d=evaluateCheckout('excel-schema',{eventName:'pull_request',cwd:'/no/such/folder'});
  assert.equal(d.run,true);assert.equal(d.reason,'diff-unavailable-run-all');
});

test('two-parent synthetic PR merge produces complete base->merge file diff',()=>{
  const work=mkdtempSync(join(tmpdir(),'hdnd-ci-pr-scope-'));
  const git=(...args)=>execFileSync('git',args,{cwd:work,stdio:'pipe',encoding:'utf8'}).trim();
  try{
    git('init','-q');git('config','user.email','ci@example.invalid');git('config','user.name','CI fixture');
    mkdirSync(join(work,'source','src','features','items'),{recursive:true});
    writeFileSync(join(work,'README.md'),'before\n');
    writeFileSync(join(work,'source','src','features','items','item-frame.css'),'old\n');
    git('add','.');git('commit','-qm','base');
    const first=git('rev-parse','HEAD');git('checkout','-qb','feature');
    writeFileSync(join(work,'source','src','features','items','item-frame.css'),'new\n');
    git('add','.');git('commit','-qm','css');
    git('checkout','-qb','main',first);
    writeFileSync(join(work,'README.md'),'after\n');git('add','.');git('commit','-qm','main advancement');
    git('merge','--no-ff','--no-edit','-q','feature');
    assert.deepEqual(changedPathsFromCheckout(work).sort(),['source/src/features/items/item-frame.css']);
    assert.equal(evaluateCheckout('list-browser',{eventName:'pull_request',cwd:work}).run,true);
    assert.equal(evaluateCheckout('excel-schema',{eventName:'pull_request',cwd:work}).run,false);
  }finally{rmSync(work,{recursive:true,force:true});}
});

test('no network, no GH credentials, no Rules or releases modified by selector',()=>{
  const src=String(classifyPath)+String(evaluateCheckout)+String(changedPathsFromCheckout);
  for(const pattern of [/fetch\(/, /https:\/\//, /GITHUB_TOKEN/, /pull_request_target/, /deploy\(/]) assert.equal(pattern.test(src),false);
});


test('depth-2 fetch of a merge commit can inspect its base parent',()=>{
  const upstream=mkdtempSync(join(tmpdir(),'hdnd-ci-upstream-'));
  const clone=mkdtempSync(join(tmpdir(),'hdnd-ci-shallow-'));
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,stdio:'pipe',encoding:'utf8'}).trim();
  try {
    git(upstream,'init','-q');git(upstream,'config','user.email','ci@example.invalid');git(upstream,'config','user.name','CI fixture');
    writeFileSync(join(upstream,'README.md'),'a\n');git(upstream,'add','.');git(upstream,'commit','-qm','base');
    const base=git(upstream,'rev-parse','HEAD');git(upstream,'checkout','-qb','feature');
    writeFileSync(join(upstream,'README.md'),'b\n');git(upstream,'add','.');git(upstream,'commit','-qm','feature');
    git(upstream,'checkout','-qb','main',base);git(upstream,'merge','--no-ff','--no-edit','-q','feature');
    git(clone,'init','-q');git(clone,'remote','add','origin','file://'+upstream);
    git(clone,'fetch','--depth','2','origin','main');git(clone,'checkout','--detach','-q','FETCH_HEAD');
    assert.deepEqual(changedPathsFromCheckout(clone),['README.md']);
  } finally {rmSync(upstream,{recursive:true,force:true});rmSync(clone,{recursive:true,force:true});}
});

test('UI contracts use the matching scoped suites without weakening executable QA guards',()=>{
  for(const path of ['source/src/features/items/list-print.ts','source/src/presentation/print-layout.json','source/tests/list-print.test.ts']){
    assert.equal(classifyPath(path),'print');
    assert.equal(decideScope('list-browser',[path,'source/AGENTS.md']).run,true);
    assert.equal(decideScope('list-ui-parity',[path]).run,true);
    assert.equal(decideScope('status-cas',[path]).run,false);
    assert.equal(decideScope('excel-schema',[path]).run,false);
  }
  assert.equal(classifyPath('source/src/presentation/ui-presentation.json'),'picker');
  assert.equal(decideScope('guest-save',['source/src/presentation/ui-presentation.json']).run,true);
  assert.equal(classifyPath('source/src/features/items/list-nowrap-widths.ts'),'presentation');
  assert.equal(classifyPath('source/src/features/items/l03-width-geometry.ts'),'presentation');
  assert.equal(classifyPath('source/scripts/pr95-clipboard-print-browser.mjs'),'critical');
  assert.equal(decideScope('status-cas',['source/src/presentation/print-layout.json','source/scripts/pr95-clipboard-print-browser.mjs']).run,true);
});
