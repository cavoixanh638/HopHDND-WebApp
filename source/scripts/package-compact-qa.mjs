/**
 * Package the real ItemList QA into ONE offline browser file.
 * All records are synthetic; no Firebase adapter, credentials or network calls.
 * This is NOT the production site and must never replace its entrypoint.
 */
import {readFile,readdir,writeFile,stat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const target='dist-compact-qa';
const root=resolve(target);
if(relative(process.cwd(),root)!==target)throw Error('Unexpected preview build directory');
const htmlPath=resolve(root,'compact-qa.html');
let html=await readFile(htmlPath,'utf8');
if(!html.includes('HopHDND')||!html.includes('assets/'))throw Error('Missing QA entry or built assets');
const consumed=new Set();
async function readAsset(path){
  if(!/^\.\/assets\/[A-Za-z0-9_.-]+$/.test(path))throw Error('Non-local QA asset rejected: '+path);
  consumed.add(path.slice(2));
  return readFile(resolve(root,path),'utf8');
}
const scripts=[...html.matchAll(/<script\s+type="module"\s+[^>]*src="([^"]+)"[^>]*><\/script>/g)];
const styles=[...html.matchAll(/<link\s+[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
if(scripts.length!==1||styles.length!==1)throw Error('QA must have exactly one local JS and CSS bundle');
// HTML-escaped closers prevent early termination of inline script/style tags.
 // The replacement MUST be a callback: Vite bundles may contain for(const [match,src] of scripts)html=html.replace(match,'<script type="module">'+(await readAsset(src)).replace(/<\/script/gi,'<\\/script')+'</script>');
for(const [match,src] of styles)html=html.replace(match,'<style>'+(await readAsset(src)).replace(/<\/style/gi,'<\\/style')+'</style>');, $, $\`, 
const other=await readdir(resolve(root,'assets'));
if(other.length!==consumed.size||other.some(name=>!consumed.has('assets/'+name)))
  throw Error('Unexpected extra chunks or assets: '+other.filter(name=>!consumed.has('assets/'+name)).join(','));
// Inspect markup only: compiled JS can legitimately contain "<script src" text.
const markup=html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>')
  .replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi,'$1</style>');
if(/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel="stylesheet"[^>]*\bhref=/.test(markup))
  throw Error('QA HTML contains an external script or stylesheet');
const name='HopHDND_GopCot_XemThu.html';
await writeFile(resolve(root,name),html,'utf8');
console.log('COMPACT_QA_SINGLE_HTML_READY',JSON.stringify({name,bytes:(await stat(resolve(root,name))).size,syntheticOnly:true}));

 // which String.replace(replacementString) treats as substitution directives.
for(const [match,src] of scripts){
  const script=(await readAsset(src)).replace(/<\/script/gi,'<\\/script');
  html=html.replace(match,()=>'<script type="module">'+script+'</script>');
}
for(const [match,src] of styles){
  const style=(await readAsset(src)).replace(/<\/style/gi,'<\\/style');
  html=html.replace(match,()=>'<style>'+style+'</style>');
}
const other=await readdir(resolve(root,'assets'));
if(other.length!==consumed.size||other.some(name=>!consumed.has('assets/'+name)))
  throw Error('Unexpected extra chunks or assets: '+other.filter(name=>!consumed.has('assets/'+name)).join(','));
// Inspect markup only: compiled JS can legitimately contain "<script src" text.
const markup=html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>')
  .replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi,'$1</style>');
if(/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel="stylesheet"[^>]*\bhref=/.test(markup))
  throw Error('QA HTML contains an external script or stylesheet');
const name='HopHDND_GopCot_XemThu.html';
await writeFile(resolve(root,name),html,'utf8');
console.log('COMPACT_QA_SINGLE_HTML_READY',JSON.stringify({name,bytes:(await stat(resolve(root,name))).size,syntheticOnly:true}));
