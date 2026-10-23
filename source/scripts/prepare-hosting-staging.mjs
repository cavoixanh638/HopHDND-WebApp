// Produce identical, isolated read-only hosting candidates from ONE verified dist-pages build.
// This script only writes local staging directories; it never deploys or touches Firebase Rules.
import {cp,readFile,mkdir,writeFile,readdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

const source=resolve(process.argv[2]??'dist-pages');
const output=resolve(process.argv[3]??'dist-hosting');
const [index,assets]=await Promise.all([readFile(join(source,'index.html')),readdir(join(source,'assets'))]);
if(!index.includes(Buffer.from('<script type="module"'))||!assets.some(file=>file.endsWith('.js')))
  throw Error('First build dist-pages using npm run build:pages');
if(source===output||output.startsWith(source+'/'))throw Error('Output must be isolated from Pages build');
const checksums=new Map();
for(const name of ['index.html',...assets.map(file=>'assets/'+file)]){
  const bytes=await readFile(join(source,name));
  checksums.set(name,createHash('sha256').update(bytes).digest('hex'));
}
await rm(output,{recursive:true,force:true});
const firebase=join(output,'firebase'),cloudflare=join(output,'cloudflare');
await mkdir(firebase,{recursive:true});
await mkdir(cloudflare,{recursive:true});
await cp(source,join(firebase,'public'),{recursive:true});
await cp(source,join(cloudflare,'public'),{recursive:true});
await writeFile(join(firebase,'firebase.json'),JSON.stringify({
  hosting:{public:'public',ignore:['firebase.json','**/.*','**/node_modules/**'],
    headers:[
      {source:'/index.html',headers:[{key:'Cache-Control',value:'no-cache'}]},
      {source:'/',headers:[{key:'Cache-Control',value:'no-cache'}]},
      {source:'/assets/**',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]}
    ]}
},null,2)+'\n');
await writeFile(join(cloudflare,'public','_headers'),
  '/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
for(const root of [join(firebase,'public'),join(cloudflare,'public')]){
  for(const [name,digest] of checksums){
    const actual=createHash('sha256').update(await readFile(join(root,name))).digest('hex');
    if(actual!==digest)throw Error('Hosting build does not match Pages: '+name);
  }
}
console.log('HOSTING_STAGING_READY',JSON.stringify({
  candidates:['firebase','cloudflare'],identicalFiles:checksums.size,
  buildSha256:checksums.get('index.html'),deployPerformed:false,
  containsAppData:false,securityRulesUnchanged:true
}));
