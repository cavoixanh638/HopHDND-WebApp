/** Explicit local operator execution. No Cloud Functions deployment. */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {refreshToken} from 'firebase-admin/app';
import {handleParentRequest} from './src/handler.mjs';
import {verifySparkRelease,SPARK_DATABASE} from './src/spark-release-gate.mjs';

const emulator=process.argv.includes('--emulator');
const host='127.0.0.1',port=8787;
let options;
if(emulator){
  if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||process.env.GCLOUD_PROJECT!=='demo-hdnd')throw Error('Local demo emulator required');
}else{
  if(!process.argv.includes('--production-approved')||process.env.SPARK_LOCAL_OPERATOR_APPROVED!=='YES')throw Error('Production operator authorization required');
  if(process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIREBASE_DATABASE_EMULATOR_HOST)throw Error('Mixed emulator/production configuration denied');
  if(process.env.GCLOUD_PROJECT!=='hophdnd-8b7b2'||process.env.PARENT_DATABASE_URL!=='https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app')throw Error('Verified project and database URL required');
  const config=JSON.parse(readFileSync(join(homedir(),'.config/configstore/firebase-tools.json'),'utf8'));
  if(config.user?.email!=='cavoixanh638@gmail.com'||!config.tokens?.refresh_token)throw Error('Authorized operator Firebase CLI identity required');
  const req=createRequire(import.meta.url);
  const api=req(join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/api.js'));
  options={credential:refreshToken({type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:config.tokens.refresh_token})};
  const releaseIndex=process.argv.indexOf('--release-file');
  if(releaseIndex<0||!process.argv[releaseIndex+1])throw Error('Private verified release file required');
  try{
    const token=await options.credential.getAccessToken();
    const headers={Authorization:'Bearer '+token.access_token};
    const read=async path=>{
      const reply=await fetch(SPARK_DATABASE+path,{headers,signal:AbortSignal.timeout(15000)});
      if(!reply.ok)throw Error('Read-only production checkpoint unavailable');
      return reply.json();
    };
    const [liveRoot,liveRules]=await Promise.all([read('/.json'),read('/.settings/rules.json')]);
    const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
    const evidence=verifySparkRelease(process.argv[releaseIndex+1],{
      checkout:git(['rev-parse','--show-toplevel']),sourceSha:git(['rev-parse','HEAD']),
      clean:git(['status','--porcelain'])==='',liveRoot,liveRules
    });
    console.log('SPARK_OPERATOR_RELEASE_READBACK_VERIFIED '+JSON.stringify(evidence));
  }catch(error){
    console.error(String(error?.message??'').startsWith('SPARK_RELEASE_HOLD_')?error.message:'SPARK_RELEASE_HOLD_READBACK_OR_PRIVATE_EVIDENCE_FAILED');
    process.exit(2);
  }
}
// The loopback UI is the only permitted browser origin. Ordinary public
// viewers continue using GitHub Pages and direct Spark cell operations.
process.env.PARENT_COMMIT_ENABLED='true';
process.env.PARENT_ALLOWED_ORIGINS='http://127.0.0.1:4173';
const server=createServer((req,res)=>{
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){
    res.writeHead(403);res.end();return;
  }
  void handleParentRequest(req,res,options).catch(()=>{
    if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});
    res.end('{"error":"PARENT_UNKNOWN"}');
  });
});
server.listen(port,host,()=>console.log('SPARK_LOCAL_OPERATOR_READY '+host+':'+port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
