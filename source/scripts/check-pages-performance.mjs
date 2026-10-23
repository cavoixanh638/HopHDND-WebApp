// Offline CI check: ensure public cold load does not send the admin Excel engine.
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {gzipSync} from 'node:zlib';
const dir=resolve(process.argv[2]??'dist-pages');
const index=await readFile(resolve(dir,'index.html'),'utf8');
const files=await readdir(resolve(dir,'assets'));
const js=files.filter(f=>f.endsWith('.js'));
const css=files.filter(f=>f.endsWith('.css'));
if(js.length<2)throw Error('Page bundle was not code-split.');
if(!/rel="modulepreload"|type="module"/.test(index))throw Error('Module entry missing.');
const initial=new Set([...index.matchAll(/(?:src|href)="\.\/assets\/([^"]+)"/g)].map(m=>m[1]));
let initialGzip=gzipSync(index).byteLength;
let totalJsGzip=0;
const details=[];
for(const file of files){
 const bytes=await readFile(resolve(dir,'assets',file));
 const gzip=gzipSync(bytes).byteLength;
 if(file.endsWith('.js'))totalJsGzip+=gzip;
 if(initial.has(file))initialGzip+=gzip;
 details.push({file,size:bytes.byteLength,gzip});
}
if([...initial].some(file=>!files.includes(file)))throw Error('Entry points to missing asset.');
if(![...initial].some(file=>file.endsWith('.js')))throw Error('Initial JavaScript not found.');
if(!js.some(file=>!initial.has(file)))throw Error('No lazy Javascript chunk exists.');
const adminPopup=js.find(file=>/^google-popup-login-[A-Za-z0-9_-]+\.js$/.test(file));
if(!adminPopup||initial.has(adminPopup))throw Error('Google popup login was not deferred to a private user-action chunk.');
// Previous single-file Pages gzip size was 336,691 bytes. Prevent cold bundle regressions.
if(initialGzip>=330000)throw Error('Cold startup payload not improved: '+initialGzip+' gzip bytes.');
console.log('PAGES_COLD_PAYLOAD',JSON.stringify({initialGzip,totalJsGzip,baselineSingleFileGzip:336691,initialAssets:[...initial],details}));
