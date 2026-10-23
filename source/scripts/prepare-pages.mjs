// Public Pages is a multi-asset, content-hashed web build for fast cold starts.
// The offline artifact continues to use package-html.mjs unchanged.
import {readFile,readdir,rename,stat,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const target=process.argv[2];
if(!['dist-pages','dist-pages-test'].includes(target))throw Error('Unexpected Pages target.');
const dir=resolve(target);
if(relative(process.cwd(),dir)!==target)throw Error('Invalid build directory.');
const source=resolve(dir,'pages.html'),dest=resolve(dir,'index.html');
const html=await readFile(source,'utf8');
if(!/<script[^>]*type="module"[^>]*src="\.\/assets\//.test(html))throw Error('Expected split, relative JS bundle.');
const assets=await readdir(resolve(dir,'assets'));
if(assets.filter(f=>f.endsWith('.js')).length<2)throw Error('Expected at least one lazy-loaded JS asset.');
if(!assets.some(f=>f.endsWith('.css')))throw Error('Stylesheet missing.');
// Start downloading the report UI alongside the smaller Firebase boot script.
// modulepreload fetches and parses, but does NOT execute the reporting module;
// Auth may begin first without waiting for its dependencies on a cold visit.
const appEntry=assets.find(file=>/^pages-app-entry-[A-Za-z0-9_-]+\.js$/.test(file));
if(!appEntry)throw Error('Required deferred report UI asset missing.');
const prepared=html.replace('</head>',`<link rel="modulepreload" crossorigin href="./assets/${appEntry}"/></head>`);
if(prepared===html)throw Error('Expected closing head for module preload.');
await writeFile(source,prepared);
await rename(source,dest);
console.log('PAGES_SPLIT_READY',JSON.stringify({target,assets:assets.length,entryBytes:(await stat(dest)).size}));
