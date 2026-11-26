/**
 * GitHub Pages is a PUBLIC frontend artifact. A Spark cutover confirmation
 * remains mandatory; exact-SHA approval is needed for changes outside
 * audited presentation, ordinary UI features and safe QA scheduling.
 *
 * Diff the ENTIRE first-parent history since the actually published
 * version.json.source_sha, not only HEAD^: a reviewed UI commit must never
 * smuggle an earlier, unpublished Firebase/security change into Pages.
 *
 * This script NEVER writes to Firebase and NEVER deploys Rules or data.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync,appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const shaPattern=/^[0-9a-f]{40}$/;
const bootstrapBaseline='cc81aee8114a969892f6a812f03ca37e44a6d5b7';
const bootstrapParent='937c1295cd598e8c9e7ea1878093918d0d5d884f';
const bootstrapOnly=new Set([
  '.github/workflows/publish-pages.yml',
  '.github/workflows/spark-pages-release-preflight.yml',
  '.github/workflows/guest-cell-save-ux-20261113.yml',
  'source/scripts/pages-release-policy.mjs',
  'source/scripts/pages-release-policy.check.mjs',
  'source/tests/pages-release-policy.test.ts',
  'README.md',
]);

/**
 * One-time, auditable transition from the owner-reviewed single-table UI
 * release to automatic, CI-gated presentation deployments. The two historic
 * UI changes outside the normal allowlist have a PINNED commit SHA and an
 * exact first-parent/file-set contract. Do NOT add App.tsx or the column
 * manager as blanket auto-publishable files.
 *
 * Only the policy migration immediately after that vetted UI commit may
 * change the guarded workflow/policy without a second manual approval.
 * Any subsequent auth/Firebase/rules/permission/policy change still HOLDS.
 * This exception expires automatically once the published baseline advances.
 */
export const reviewedUiTransition={
  baseline:'c08244db4a52ac410d00abc86c1e21bb07cc0ba5',
  uiCommit:'f09e792c5e4b5395f6c668366fb78bca00d5211e',
  uiParent:'74bd9bc8a28cc574b717ef29e4e4ac17dbbf775d',
  migrationMessage:'ci(pages): restore guarded UI auto publish',
};
const reviewedUiFiles=new Set([
  'source/docs/checkpoints/G00_SINGLE_TABLE_2026-11-22.md',
  'source/scripts/smoke-pages-browser.mjs',
  'source/src/app/App.tsx',
  'source/src/features/items/ItemColumnPanel.tsx',
  'source/src/features/items/ItemList.tsx',
  'source/src/features/items/inline-g01-list.css',
  'source/tests/admin-single-data-table-layout.test.ts',
  'source/tests/item-save-flow.test.ts',
  'source/tests/real-demo-visual-parity.test.ts',
]);
const transitionFiles=new Set([
  '.github/workflows/publish-pages.yml',
  'source/scripts/pages-release-policy.mjs',
  'source/scripts/pages-release-policy.check.mjs',
  'source/tests/pages-release-policy.test.ts',
  'source/docs/checkpoints/G00_SAFE_AUTOPUBLISH_2026-11-22.md',
]);
const sameFileSet=(files,set)=>Array.isArray(files)&&files.length===set.size&&
  new Set(files).size===set.size&&files.every(path=>set.has(path));

export function isVettedSingleTableUi(commit,baseline){
  return baseline===reviewedUiTransition.baseline&&
    commit.sha===reviewedUiTransition.uiCommit&&
    commit.parent===reviewedUiTransition.uiParent&&
    sameFileSet(commit.files,reviewedUiFiles);
}
export function isScopedAutopublishMigration(commit,baseline){
  return baseline===reviewedUiTransition.baseline&&
    commit.parent===reviewedUiTransition.uiCommit&&
    commit.message===reviewedUiTransition.migrationMessage&&
    sameFileSet(commit.files,transitionFiles);
}


/**
 * 25/11/2026: allow ordinary, audited read/presentation modules and
 * non-semantic scheduling maintenance of existing QA workflows.
 * Never grant blanket approval to workflows, authentication, persistence,
 * security tests/commands, release policy, packages or unknown source.
 * Compare EACH commit, not merely final files, to retain historical HOLD.
 */
// Declarative presentation is data, not executable code. No arbitrary JSON
// paths, handlers, URL/HTML payloads, storage keys or business-status aliases.
// Each before/after blob is independently validated at every unpublished commit.
export const uiPresentationPath='source/src/presentation/ui-presentation.json';
const uiLabelKeys=[
  'savedLayoutTrigger','savedLayoutHeading','savedLayoutUnnamed','columnOptions',
  'departmentSearch','otherSearch','departmentPlaceholder','otherPlaceholder','pickerEmpty',
];
const hasExactKeys=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const validUiText=(value)=>typeof value==='string'&&value.length>0&&value.length<=180&&
  value.trim()===value&&value.normalize('NFC')===value&&!/[<>{}\p{C}\u2028\u2029]/u.test(value);
export function isSafeUiPresentationData(source){
  if(typeof source!=='string'||!source.trim()||source.length>32768)return false;
  let config;
  try{config=JSON.parse(source);}catch{return false;}
  if(!hasExactKeys(config,['version','organisationAliases','labels','icons'])||config.version!==1||
     !hasExactKeys(config.labels,uiLabelKeys)||!uiLabelKeys.every(key=>validUiText(config.labels[key]))||
     !hasExactKeys(config.icons,['savedLayoutAdd'])||
     !hasExactKeys(config.icons.savedLayoutAdd,['path','strokeWidth']))return false;
  const icon=config.icons.savedLayoutAdd;
  if(typeof icon.path!=='string'||icon.path.length>512||
     !/^[Mm][MmLlHhVvCcSsQqTtAaZz0-9.,+\- \t]+$/.test(icon.path)||
     typeof icon.strokeWidth!=='number'||!Number.isFinite(icon.strokeWidth)||
     icon.strokeWidth<0.5||icon.strokeWidth>4)return false;
  const aliases=config.organisationAliases;
  if(!Array.isArray(aliases)||aliases.length>100)return false;
  const sources=new Set(),labels=new Set();
  for(const alias of aliases){
    if(!hasExactKeys(alias,['fields','source','label'])||!validUiText(alias.source)||
       !validUiText(alias.label)||!Array.isArray(alias.fields)||!alias.fields.length||
       alias.fields.length>2||new Set(alias.fields).size!==alias.fields.length||
       !alias.fields.every(field=>field==='department'||field==='room'))return false;
    for(const field of alias.fields){
      const sourceKey=field+'\0'+alias.source,labelKey=field+'\0'+alias.label;
      if(sources.has(sourceKey)||labels.has(labelKey))return false;
      sources.add(sourceKey);labels.add(labelKey);
    }
  }
  return true;
}
export const isSafeUiPresentationChange=(before,after)=>
  isSafeUiPresentationData(before)&&isSafeUiPresentationData(after);

// These files do only screen measurement or adjacent-track arithmetic.
// Their callback/authorization hosts remain outside the auto-release boundary.
const layoutGeometryModules=new Set([
  'source/src/features/items/list-nowrap-widths.ts',
  'source/src/features/items/l03-width-geometry.ts',
]);

const ordinaryPresentationModules=new Set([
  ...layoutGeometryModules,
  'source/src/domain/search.ts',
  'source/src/features/items/ActiveListFilters.tsx',
  'source/src/features/items/ColumnFilterCell.tsx',
  'source/src/features/items/CompactGroupFilterCell.tsx',
  'source/src/features/items/RoomSpecialistFilterCell.tsx',
  'source/src/features/items/SearchHighlight.tsx',
  'source/src/features/items/compact-menu-placement.ts',
  'source/src/features/items/filter-scroll.ts',
  'source/src/features/items/list-toolbar-filters.ts',
  'source/src/features/items/list-print.ts',
  'source/src/features/reports/ReportTable.tsx',
  'source/src/features/reports/inline-g04-popup-width.ts',
  'source/src/features/reports/inline-g04-popup-handles.tsx',
]);
const qaSchedulingWorkflows=new Set([
  '.github/workflows/excel-schema-fingerprint-20261113.yml',
  '.github/workflows/firebase-operational-qa.yml',
  '.github/workflows/guest-cell-save-ux-20261113.yml',
  '.github/workflows/original-hdnd-excel-parser-20261113.yml',
  '.github/workflows/pr188-two-browser.yml',
  '.github/workflows/qa-pr-scope-guard.yml',
  '.github/workflows/real-spark-list-browser-20261113.yml',
  '.github/workflows/real-spark-list-ui-parity-20261113.yml',
  '.github/workflows/simple-admin-file-backup-ci.yml',
  '.github/workflows/spark-direct-status-cas.yml',
  '.github/workflows/verify-firebase-staging.yml',
  '.github/workflows/verify-source.yml',
]);

// The exact already-integrated PR #230 was reviewed at 12/12 workflows,
// with 14/14 scope tests and a separate eight-job docs-only acceptance.
// This is a historical receipt for the immutable optimization commit ONLY;
// it does not approve this policy migration, another CI edit, or later SHA.
export const reviewedCiOptimization=Object.freeze({
  baseline:'7c5edf4cea9024687c95d5526b8cdba7c7028508',
  sha:'4565cbf8d4cad1d9c4cf852223795b04e737cbd1',
  parent:'d308bbfcff73070d737b27bed32cca899d5a1ad1',
});
const reviewedCiFiles=new Set([
  '.github/scripts/ci-pr-scope.mjs',
  '.github/scripts/ci-pr-scope.test.mjs',
  '.github/workflows/excel-schema-fingerprint-20261113.yml',
  '.github/workflows/firebase-operational-qa.yml',
  '.github/workflows/guest-cell-save-ux-20261113.yml',
  '.github/workflows/original-hdnd-excel-parser-20261113.yml',
  '.github/workflows/pr188-two-browser.yml',
  '.github/workflows/qa-pr-scope-guard.yml',
  '.github/workflows/real-spark-list-browser-20261113.yml',
  '.github/workflows/real-spark-list-ui-parity-20261113.yml',
  '.github/workflows/simple-admin-file-backup-ci.yml',
  '.github/workflows/spark-direct-status-cas.yml',
  '.github/workflows/spark-pages-release-preflight.yml',
  '.github/workflows/verify-firebase-staging.yml',
  '.github/workflows/verify-source.yml',
  'docs/ci/PR_SCOPE_OPTIMIZATION_2026-11-22.md',
]);
export function isReviewedCiOptimization(commit,baseline){
  return baseline===reviewedCiOptimization.baseline&&
    commit.sha===reviewedCiOptimization.sha&&
    commit.parent===reviewedCiOptimization.parent&&
    sameFileSet(commit.files,reviewedCiFiles);
}

// No unreviewed new imports, re-exports, direct network, persistence or execution APIs
// for the audited display/search/print/report modules. This is
// a conservative change boundary, not a substitute for the full release QA.
const privilegedFeatureApis=/\b(?:fetch|WebSocket|XMLHttpRequest|EventSource|localStorage|sessionStorage|indexedDB|globalThis|process|Function|eval|require|importScripts|firebase|writeDatabase|setDoc|updateDoc|deleteDoc|runTransaction|savePermissions|sendBeacon|postMessage)\b|dangerouslySetInnerHTML|import\s*\(/;
function staticImports(source){
  const starters=[...source.matchAll(/^[ \t]*import\b/gm)];
  const imports=[...source.matchAll(/^[ \t]*import[ \t]+(?:[^'";]*?\bfrom\s*)?['"][^'"\r\n]+['"][ \t]*;?/gm)];
  if(starters.length!==imports.length)return null;
  return imports.map(m=>m[0].replace(/\s+/g,' ').trim()).sort().join('\n');
}
// Additional imports in already-audited item/report presentation modules
// may refer only to the exact read-only alias helper or declarative JSON.
// Other new imports, aliases, re-exports and runtime capabilities stay HOLD.
const uiJsonImport=/^import uiPresentation from ['"]\.\.\/\.\.\/presentation\/ui-presentation\.json['"];?$/;
const uiAliasImport=/^import \{(?:displayOrganisationName|organisationSearchText|displayOrganisationName,\s*organisationSearchText|organisationSearchText,\s*displayOrganisationName)\} from ['"]\.\.\/\.\.\/domain\/organisation-display['"];?$/;
function stripAuditedPresentationImports(path,imports){
  if(!/^source\/src\/features\/(?:items|reports)\//.test(path))return imports;
  return imports.split('\n').filter(line=>!uiJsonImport.test(line)&&!uiAliasImport.test(line)).join('\n');
}
export function isSafeOrdinaryFeatureChange(path,before,after){
  if(!ordinaryPresentationModules.has(path)||
     typeof before!=='string'||!before.trim()||typeof after!=='string'||!after.trim())return false;
  if(privilegedFeatureApis.test(after)||/^[ \t]*export\s+(?:\*|\{[^}]*\})\s+from\b/m.test(after))return false;
  const oldImports=staticImports(before),newImports=staticImports(after);
  if(oldImports===null||newImports===null)return false;
  if(layoutGeometryModules.has(path))return oldImports===newImports&&
    !forbiddenPresentationApis.test(after)&&!/\b(?:verifiedAdmin|onWidthsCommit|onUpdate|leaseManager|directStatusCas)\b/.test(after);
  return stripAuditedPresentationImports(path,oldImports)===stripAuditedPresentationImports(path,newImports);
}

// Only the existing, audited read-only QA workflows may auto-release after
// an exact safe PR-only concurrency block or a bounded job timeout edit.
// Job commands, actions, checkout, cache, triggers, permissions, conditions,
// scope selectors, environment, credentials and release workflow stay equal.
const prConcurrencyBlock=[
  'concurrency:',
  '  group: pr-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}',
  "  cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
].join('\n')+'\n';
function normalizeQaScheduling(source){
  if(typeof source!=='string'||!source.trim())return null;
  let s=source.replace(/\r\n/g,'\n');
  if(!/^permissions:\n  contents: read$/m.test(s))return null;
  if(s.split(prConcurrencyBlock).length>2)return null;
  s=s.replace(prConcurrencyBlock,'');
  // Match only job-level (four spaces) numeric timeouts; step scripts
  // and multiline run blocks have deeper indentation. Out-of-range and
  // expression-valued timeouts remain guarded.
  s=s.replace(/^    timeout-minutes: ([1-9][0-9]{0,2})\n/gm,
    (line,value)=>Number(value)<=360?'':line);
  return s;
}
export function isSafeQaSchedulingChange(path,before,after){
  if(!qaSchedulingWorkflows.has(path))return false;
  const a=normalizeQaScheduling(before),b=normalizeQaScheduling(after);
  return a!==null&&b!==null&&a===b;
}

const uiModules=new Set([
  'source/src/features/items/ItemList.tsx',
  'source/src/features/items/CompactGroupedValue.tsx',
  'source/src/features/items/compact-columns.ts',
  'source/src/data/fit-table-columns.ts',
  'source/src/data/resize-last-column.ts',
  'source/src/components/ColumnResizeHandle.tsx',
  'source/src/components/useElementWidth.ts',
  'source/scripts/smoke-pages-browser.mjs',
  // Presentation-only UI; the guarded edit/save entrypoint CellPicker.tsx
  // itself is deliberately NOT on this allowlist.
  'source/src/features/items/CellPickerPopupView.tsx',
  'source/src/features/items/CellPickerPositioning.ts',
  'source/src/features/items/pr95-v5-l1-picker-placement.ts',
  'source/scripts/pr95-v5-l1-dropdown-browser.mjs',
]);

export function isAutoUiPath(path){
  return path===uiPresentationPath||/^source\/src\/[a-zA-Z0-9_./-]+\.css$/.test(path)||
    /^source\/src\/[a-zA-Z0-9_./-]+\.(svg|png|webp|jpg|jpeg)$/.test(path)||
    /^source\/src\/qa\/[a-zA-Z0-9_./-]+\.(ts|tsx|css)$/.test(path)||
    /^source\/tests\/[a-zA-Z0-9_./-]+$/.test(path)||
    /^source\/docs\/[a-zA-Z0-9_./-]+$/.test(path)||
    /^docs\/[a-zA-Z0-9_./-]+\.md$/.test(path)||
    path==='README.md'||uiModules.has(path)||ordinaryPresentationModules.has(path);
}
// Two presentation-only modules are auto-publishable only when their exact
// HEAD contents remain DOM/pure-geometry code, with no runtime imports from
// services, edit/lease/data modules or ambient browser/network APIs. This
// check is in the protected policy, NOT in a mutable test fixture.
const restrictedUiSources=new Set([
  'source/src/features/items/CellPickerPopupView.tsx',
  'source/src/features/items/CellPickerPositioning.ts',
  'source/src/features/items/pr95-v5-l1-picker-placement.ts',
]);
const forbiddenPresentationApis=/(?:\b(?:fetch|WebSocket|XMLHttpRequest|EventSource|localStorage|sessionStorage|indexedDB|navigator|window|document|globalThis|process|Function|eval|require|importScripts|setInterval|setTimeout)\b|dangerouslySetInnerHTML|import\s*\()/;
export function isSafePresentationSource(path,source){
  if(!restrictedUiSources.has(path))return true;
  if(typeof source!=='string'||!source.trim())return false;
  if(forbiddenPresentationApis.test(source))return false;
  // A re-export can pull in runtime privileges without an "import" line.
  if(/^\s*export\s+(?:\*|\{[^}]*\})\s+from\b/m.test(source))return false;
  const importLines=source.split('\n').filter(line=>/^\s*import\b/.test(line));
  if(path.endsWith('CellPickerPopupView.tsx')){
    // React type annotations and the exact declarative presentation JSON only.
    if(!importLines.every(line=>/^\s*import\s+type\s+\{[^}]+\}\s+from\s+['"]react['"];?\s*$/.test(line)||uiJsonImport.test(line.trim())))
      return false;
    // Do not permit this visual leaf to become a save/auth service or
    // independently mutate record values on user interaction.
    if(/\b(?:useState|useEffect|useLayoutEffect|leaseManager|directStatusCas|setValue|writeDatabase|firebase|onUpdate|dispatchEvent)\b/.test(source))
      return false;
    return source.includes('export function CellPickerPopupView(');
  }
  if(path.endsWith('CellPickerPositioning.ts')){
    // DOM measurements may call ONLY the approved, pure placement function.
    // Privileged data, persistence and editing modules are forbidden.
    return importLines.length===1&&
      /^import\s+\{placeCellPicker,type PickerViewport\}\s+from\s+['"]\.\/pr95-v5-l1-picker-placement['"];?$/.test(importLines[0].trim())&&
      source.includes('export function positionCellPickerPopover(');
  }
  // Pure viewport math is UI; importing any module here requires review.
  return importLines.length===0&&source.includes('export function placeCellPicker(');
}

export function isPagesArtifactCommit(commit){
  const files=commit.files??[];
  return commit.author==='github-actions[bot]'&&
    commit.email==='41898282+github-actions[bot]@users.noreply.github.com'&&
    commit.message==='build(pages): publish verified Spark WebApp from approved source'&&
    files.length>0&&files.every(file=>file==='index.html'||
      file==='version.json'||/^assets\/[a-zA-Z0-9_./-]+$/.test(file));
}
export function isBootstrapPolicyCommit(commit,baseline,head){
  const files=commit.files??[];
  return baseline===bootstrapBaseline&&
    commit.sha===head&&commit.parent===bootstrapParent&&
    files.includes('.github/workflows/publish-pages.yml')&&
    files.includes('source/scripts/pages-release-policy.mjs')&&
    files.length>0&&files.every(file=>bootstrapOnly.has(file));
}
export function classifyCommits({commits,baseline,head,approved,sourceContents={}}){
  if(!shaPattern.test(baseline)||!shaPattern.test(head))
    return {allowed:false,mode:'hold',blocked:['INVALID_BASE_OR_HEAD']};
  if(approved===head)return {allowed:true,mode:'approved',blocked:[]};
  const blocked=[];
  let sourceChanged=false;
  for(const commit of commits){
    if(isPagesArtifactCommit(commit))continue;
    if(isBootstrapPolicyCommit(commit,baseline,head)||isVettedSingleTableUi(commit,baseline)||
       isScopedAutopublishMigration(commit,baseline)||
       isReviewedCiOptimization(commit,baseline)){sourceChanged=true;continue;}
    for(const file of commit.files??[]){
      sourceChanged=true;
      const change=commit.sourceChanges?.[file];
      if(file===uiPresentationPath){
        if(!isSafeUiPresentationChange(change?.before,change?.after))blocked.push(file);
        continue;
      }
      if(qaSchedulingWorkflows.has(file)){
        if(!isSafeQaSchedulingChange(file,change?.before,change?.after))blocked.push(file);
        continue;
      }
      if(!isAutoUiPath(file)||
         (ordinaryPresentationModules.has(file)&&
          !isSafeOrdinaryFeatureChange(file,change?.before,change?.after))||
         (restrictedUiSources.has(file)&&
          !isSafePresentationSource(file,sourceContents[file])))blocked.push(file);
    }
  }
  return blocked.length===0&&sourceChanged
    ?{allowed:true,mode:'auto',blocked:[]}
    :{allowed:false,mode:'hold',
      blocked:blocked.length?[...new Set(blocked)]:['NO_ELIGIBLE_CHANGE']};
}
function git(args){
  return execFileSync('git',args,{cwd:root,encoding:'utf8',
    stdio:['ignore','pipe','pipe'],maxBuffer:12*1024*1024}).trim();
}
function parseArgs(args){
  const options={};
  for(let i=0;i<args.length;i++){
    const k=args[i];
    if(!['--head','--baseline','--approved','--assert-mode','--print-mode'].includes(k))
      throw Error('Unknown release policy argument: '+k);
    if(k==='--print-mode'){options.printMode=true;continue;}
    if(i+1>=args.length)throw Error('Missing argument for '+k);
    options[k.slice(2).replace('-','')]=args[++i];
  }
  return options;
}
function readPublishedSource(){
  const data=JSON.parse(readFileSync(join(root,'version.json'),'utf8'));
  if(data?.mode!=='spark'||!shaPattern.test(data?.source_sha))
    throw Error('PAGES_RELEASE_HOLD: version.json has no verified Spark source_sha');
  return data.source_sha;
}
function readCommitChanges(baseline,head){
  // Ensures that a current SHA cannot reference an unrelated history.
  git(['cat-file','-e',baseline+'^{commit}']);
  git(['cat-file','-e',head+'^{commit}']);
  git(['merge-base','--is-ancestor',baseline,head]);
  const hashes=git(['rev-list','--first-parent','--reverse',baseline+'..'+head])
    .split('\n').filter(Boolean);
  return hashes.map(sha=>{
    const metadata=git(['show','-s','--format=%P%n%an%n%ae%n%s',sha]).split('\n');
    const parent=metadata[0]?.split(' ')[0];
    if(!shaPattern.test(parent??''))throw Error('PAGES_RELEASE_HOLD: no first parent');
    const files=git(['diff','--no-renames','--name-only',parent,sha])
      .split('\n').filter(Boolean);
    const sourceChanges={};
    for(const file of files){
      if(file!==uiPresentationPath&&!ordinaryPresentationModules.has(file)&&!qaSchedulingWorkflows.has(file))continue;
      // Use immutable before/after blobs for this commit. Missing or deleted
      // paths stay HOLD; no reading from a mutable checkout.
      try{
        sourceChanges[file]={before:git(['show',parent+':'+file]),
          after:git(['show',sha+':'+file])};
      }catch{sourceChanges[file]={before:null,after:null};}
    }
    return {sha,parent,author:metadata[1],email:metadata[2],
      message:metadata[3],files,sourceChanges};
  });
}
export function getReleaseDecision({baseline,head,approved}){
  if(!shaPattern.test(baseline)||!shaPattern.test(head))
    throw Error('PAGES_RELEASE_HOLD: invalid SHA');
  const commits=readCommitChanges(baseline,head);
  // Read the candidate commit, never the mutable checkout filesystem. We
  // check the final source that the public Pages bundle will actually use.
  const sourceContents={};
  for(const file of restrictedUiSources){
    if(commits.some(commit=>!isPagesArtifactCommit(commit)&&commit.files?.includes(file))){
      try{sourceContents[file]=git(['show',head+':'+file]);}
      catch{sourceContents[file]='';} // deletion or missing file => HOLD
    }
  }
  return {...classifyCommits({commits,baseline,head,approved,sourceContents}),baseline,head};
}
function main(){
  const args=parseArgs(process.argv.slice(2));
  const baseline=args.baseline??readPublishedSource();
  const head=args.head??process.env.GITHUB_SHA??'';
  const approved=args.approved??'';
  const decision=getReleaseDecision({baseline,head,approved});
  if(args.assertmode&&args.assertmode!==decision.mode)
    throw Error('PAGES_RELEASE_HOLD: policy changed between gate and publish: '+
      args.assertmode+' vs '+decision.mode);
  if(args.printMode){process.stdout.write(decision.mode+'\n');return;}
  const report=[
    'release_allowed='+(decision.allowed?'true':'false'),
    'policy_mode='+decision.mode,
    'baseline_sha='+decision.baseline,
  ].join('\n')+'\n';
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,report);
  console.log('PAGES_RELEASE_POLICY '+JSON.stringify({
    mode:decision.mode,release_allowed:decision.allowed,
    baseline:decision.baseline,head:decision.head,
    blocked:decision.blocked.slice(0,30)}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(error){
    console.error('PAGES_RELEASE_HOLD',error instanceof Error?error.message:String(error));
    process.exitCode=1;
  }
}
