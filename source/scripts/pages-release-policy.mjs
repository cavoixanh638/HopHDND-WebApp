/**
 * GitHub Pages is a PUBLIC frontend artifact. A Spark cutover confirmation
 * remains mandatory; exact-SHA approval is needed for anything outside a
 * strictly enumerated set of presentation/QA files.
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
  'source/src/features/items/pr95-v5-l1-picker-placement.ts',
  'source/scripts/pr95-v5-l1-dropdown-browser.mjs',
]);

export function isAutoUiPath(path){
  return /^source\/src\/[a-zA-Z0-9_./-]+\.css$/.test(path)||
    /^source\/src\/[a-zA-Z0-9_./-]+\.(svg|png|webp|jpg|jpeg)$/.test(path)||
    /^source\/src\/qa\/[a-zA-Z0-9_./-]+\.(ts|tsx|css)$/.test(path)||
    /^source\/tests\/[a-zA-Z0-9_./-]+$/.test(path)||
    /^source\/docs\/[a-zA-Z0-9_./-]+$/.test(path)||
    path==='README.md'||uiModules.has(path);
}
// Two presentation-only modules are auto-publishable only when their exact
// HEAD contents remain DOM/pure-geometry code, with no runtime imports from
// services, edit/lease/data modules or ambient browser/network APIs. This
// check is in the protected policy, NOT in a mutable test fixture.
const restrictedUiSources=new Set([
  'source/src/features/items/CellPickerPopupView.tsx',
  'source/src/features/items/pr95-v5-l1-picker-placement.ts',
]);
const forbiddenPresentationApis=/(?:\b(?:fetch|WebSocket|XMLHttpRequest|EventSource|localStorage|sessionStorage|indexedDB|navigator|window|document|globalThis|process|Function|eval|require|importScripts|setInterval|setTimeout)\b|dangerouslySetInnerHTML|import\s*\()/;
export function isSafePresentationSource(path,source){
  if(!restrictedUiSources.has(path))return true;
  if(typeof source!=='string'||!source.trim())return false;
  if(forbiddenPresentationApis.test(source))return false;
  const importLines=source.split('\n').filter(line=>/^\s*import\b/.test(line));
  if(path.endsWith('CellPickerPopupView.tsx')){
    // Only React type annotations; JSX uses the automatic jsx-runtime.
    if(!importLines.every(line=>/^\s*import\s+type\s+\{[^}]+\}\s+from\s+['"]react['"];?\s*$/.test(line)))
      return false;
    // Do not permit this visual leaf to become a save/auth service or
    // independently mutate record values on user interaction.
    if(/\b(?:useEffect|useLayoutEffect|onChange|leaseManager|directStatusCas|setValue|writeDatabase|firebase|onUpdate|dispatchEvent)\b/.test(source))
      return false;
    return source.includes('export function CellPickerPopupView(');
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
    if(isBootstrapPolicyCommit(commit,baseline,head)){sourceChanged=true;continue;}
    for(const file of commit.files??[]){
      sourceChanged=true;
      if(!isAutoUiPath(file)||
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
    return {sha,parent,author:metadata[1],email:metadata[2],
      message:metadata[3],files};
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
