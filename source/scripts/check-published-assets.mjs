// A GitHub Pages/CDN/browser may reuse old index.html across deployments.
// Never publish a new index.html that removes its old content-hashed assets.
import {readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const [nextPath,previousPath,assetDirectory]=process.argv.slice(2);
if(!nextPath||!previousPath||!assetDirectory)throw Error('Usage: node scripts/check-published-assets.mjs CURRENT_HTML PREVIOUS_HTML ASSETS_DIRECTORY');
const dir=resolve(assetDirectory);
let verified=0;
for(const [label,path] of [['new',nextPath],['previous',previousPath]]){
  const html=await readFile(resolve(path),'utf8');
  const assets=[...html.matchAll(/(?:src|href)="\.\/assets\/([a-zA-Z0-9_-]+\.(?:js|css))"/g)].map(match=>match[1]);
  if(!assets.length)throw Error(label+' HTML has no referenced hashed assets');
  for(const asset of assets){
    const filename=join(dir,asset);
    const file=await stat(filename).catch(()=>null);
    if(!file?.isFile()||file.size===0)
      throw Error(label+' HTML points to a missing Pages asset: '+asset);
    verified++;
  }
}
console.log('PAGES_ASSET_COMPAT_PASS',JSON.stringify({versions:['new','previous'],verifiedReferences:verified}));
