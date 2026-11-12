import {createServer} from 'node:http';
import {handleParentRequest} from './src/handler.mjs';
const host='127.0.0.1',port=Number(process.env.PARENT_PORT??8787);
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
   process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
   !(process.env.GCLOUD_PROJECT??'').startsWith('demo-')){
  throw Error('PARENT_DEV_SERVER: requires isolated localhost Auth+RTDB Emulator and demo project');
}
const server=createServer((req,res)=>{
  void handleParentRequest(req,res).catch(error=>{
    console.error('PARENT_ENDPOINT_UNHANDLED',error?.name??'Error');
    if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"PARENT_UNKNOWN"}');}
  });
});
server.listen(port,host,()=>console.log('PARENT_ENDPOINT_READY http://'+host+':'+port));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));