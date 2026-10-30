// Dedicated PR95 disposable TCP/WebSocket fault proxy: REAL RTDB server -> SDK ACK.
// No production address, secrets, deployment, or browser-smoke dependency.
import {createServer,connect} from 'node:net';
import {setTimeout as sleep} from 'node:timers/promises';

const HOST='127.0.0.1';
const RTDB_PORT=9000;
const EXPECTED_PROJECT='demo-hdnd-network-ack';

/** Decode complete wire frames without re-encoding/altering forwarded bytes. */
function frameFrom(buffer){
  if(buffer.length<2)return null;
  const masked=!!(buffer[1]&128),op=buffer[0]&15,fin=!!(buffer[0]&128);
  let len=buffer[1]&127,header=2;
  if(len===126){if(buffer.length<4)return null;len=buffer.readUInt16BE(2);header=4;}
  else if(len===127){
    if(buffer.length<10)return null;
    const big=buffer.readBigUInt64BE(2);
    if(big>BigInt(8*1024*1024))throw Error('Oversized WS frame');
    len=Number(big);header=10;
  }
  if(buffer.length<header+(masked?4:0)+len)return null;
  let payload=buffer.subarray(header+(masked?4:0),header+(masked?4:0)+len);
  if(masked){
    const mask=buffer.subarray(header,header+4);
    payload=Buffer.from(payload);
    for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
  }
  return {raw:buffer.subarray(0,header+(masked?4:0)+len),
    bytes:header+(masked?4:0)+len,payload,op,fin};
}

/** RTDB sometimes uses application-level multi-part JSON frames. */
function decodeFirebaseMessage(collector,frame){
  if(frame.op!==1&&frame.op!==0)return null;
  collector.fragments.push(frame.payload.toString('utf8'));
  if(!frame.fin)return null;
  const msg=collector.fragments.join('');collector.fragments=[];
  if(collector.remaining>0){
    collector.chunks.push(msg);collector.remaining--;
    if(collector.remaining>0)return null;
    const joined=collector.chunks.join('');collector.chunks=[];
    try{return JSON.parse(joined);}catch{return null;}
  }
  if(/^\d{1,4}$/.test(msg)&&Number(msg)>1&&Number(msg)<=1000){
    collector.remaining=Number(msg);collector.chunks=[];return null;
  }
  try{return JSON.parse(msg);}catch{return null;}
}

function isCasCommitRequest(msg,operationId){
  const data=msg?.t==='d'?msg.d:null;
  const body=data?.b;
  // SDK RTDB runTransaction uses a compare-and-swap PUT ('p' + hash).
  const doc=body?.d;
  return data?.a==='p' && body?.p==='/hdnd/datasetV2' &&
    doc?.active?.operationId===operationId &&
    doc?.operations?.[operationId]?.status==='COMMITTED' &&
    typeof data.r==='number';
}

async function independentServerWitness(operationId,revision){
  // Only the synthetic local Emulator is accessible. This privileged REST
  // observer is NOT the SDK client and does NOT use its WebSocket/proxy/cache.
  const url='http://127.0.0.1:'+RTDB_PORT+
    '/hdnd/datasetV2.json?ns='+EXPECTED_PROJECT;
  const res=await fetch(url,{headers:{Authorization:'Bearer owner'},
    signal:AbortSignal.timeout(3000)});
  if(!res.ok)throw Error('Independent observer RTDB REST HTTP '+res.status);
  const state=await res.json();
  const op=state?.operations?.[operationId];
  if(op?.status!=='COMMITTED'||op.to!=='gen_'+operationId ||
    state?.active?.operationId!==operationId||
    state?.active?.generationId!=='gen_'+operationId||
    state?.active?.revision!==revision||
    !state?.generations?.['gen_'+operationId]?.items)
    throw Error('Independent server has not proven atomic COMMITTED CAS');
  return {active:state.active,operations:Object.keys(state.operations??{}).length,
    generations:Object.keys(state.generations??{}).length};
}

export class NetworkAckFaultProxy{
  constructor({port=19000}={}){
    this.port=port;this.server=null;this.sockets=new Set();
    this.armed=null;this.evidence=[];
  }
  arm(operationId,revision){
    if(this.armed)throw Error('Already armed; one operation per wire fault');
    if(!/^[A-Za-z0-9_-]{12,80}$/.test(operationId)||
      !Number.isInteger(revision)||revision<1)
      throw Error('Invalid operation or revision');
    this.armed={operationId,revision,requestId:null,requestSeen:false,
      ackSeen:false,ackDropped:false,independent:null,error:null,
      source:'real server WebSocket',direction:'RTDB server -> SDK'};
  }
  async start(){
    if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
      process.env.GCLOUD_PROJECT!==EXPECTED_PROJECT)
      throw Error('Network fault proxy only runs with exact disposable demo Emulator');
    this.server=createServer(client=>this.session(client));
    await new Promise((resolve,reject)=>{
      this.server.once('error',reject);
      this.server.listen(this.port,HOST,resolve);
    });
    return this;
  }
  session(client){
    const upstream=connect(RTDB_PORT,HOST);
    this.sockets.add(client);this.sockets.add(upstream);
    for(const sock of [client,upstream]){
      sock.on('error',()=>{try{sock.destroy();}catch{}});
      sock.on('close',()=>{this.sockets.delete(sock);
        if(!client.destroyed)client.destroy();
        if(!upstream.destroyed)upstream.destroy();
      });
    }
    const directions=[
      {from:client,to:upstream,inHeader:true,buffer:Buffer.alloc(0),
        collector:{fragments:[],remaining:0,chunks:[]},side:'sdk-to-server'},
      {from:upstream,to:client,inHeader:true,buffer:Buffer.alloc(0),
        collector:{fragments:[],remaining:0,chunks:[]},side:'server-to-sdk'}
    ];
    for(const path of directions){
      path.from.on('data',bytes=>{
        try{
          path.buffer=Buffer.concat([path.buffer,bytes]);
          if(path.inHeader){
            const cut=path.buffer.indexOf('\r\n\r\n');
            if(cut<0){if(path.buffer.length>32768)throw Error('WS handshake too large');return;}
            const head=path.buffer.subarray(0,cut+4);
            if(path.side==='sdk-to-server'&&!head.toString().startsWith('GET '))
              throw Error('SDK transport was not WebSocket upgrade');
            if(path.side==='server-to-sdk'&&!head.toString().startsWith('HTTP/1.1 101'))
              throw Error('RTDB WebSocket upgrade rejected: '+head.toString().slice(0,160));
            path.to.write(head);path.buffer=path.buffer.subarray(cut+4);path.inHeader=false;
          }
          while(path.buffer.length){
            const frame=frameFrom(path.buffer);
            if(!frame)break;
            path.buffer=path.buffer.subarray(frame.bytes);
            const msg=decodeFirebaseMessage(path.collector,frame);
            const target=this.armed;
            if(target&&path.side==='sdk-to-server'&&isCasCommitRequest(msg,target.operationId)){
              target.requestId=msg.d.r;target.requestSeen=true;
              target.casHashPresent=typeof msg.d.b.h==='string';
            }
            let suppress=false;
            if(target&&path.side==='server-to-sdk'&&target.requestSeen&&
              !target.ackSeen&&msg?.t==='d'&&msg.d?.r===target.requestId){
              target.ackSeen=true;
              target.ackStatus=msg.d?.b?.s??null;
              // Critical: suppress the ACK frame before doing the independent
              // REST observation, never deliver it to the SDK.
              suppress=true;
              if(target.ackStatus!=='ok'){
                target.error='Target response is not an OK server commit ACK';
                client.destroy();upstream.destroy();
              }else{
                target.ackDropped=true;
                void independentServerWitness(target.operationId,target.revision)
                  .then(witness=>{target.independent=witness;this.evidence.push({
                    operationId:target.operationId,requestId:target.requestId,
                    ackStatus:target.ackStatus,casHashPresent:target.casHashPresent,
                    server:witness,ackFramesForwarded:0});
                    client.destroy();upstream.destroy();})
                  .catch(e=>{target.error=String(e);client.destroy();upstream.destroy();});
              }
            }
            if(!suppress)path.to.write(frame.raw);
          }
          if(path.buffer.length>16*1024*1024)throw Error('Frame buffer limit');
        }catch(e){
          if(this.armed&&!this.armed.error)this.armed.error=String(e);
          client.destroy();upstream.destroy();
        }
      });
    }
  }
  async requireDroppedAck({timeoutMs=18000}={}){
    const since=Date.now();
    while(Date.now()-since<timeoutMs){
      if(this.armed?.error)throw Error('Network fault invalid: '+this.armed.error);
      if(this.armed?.ackDropped&&this.armed.independent){
        const done={...this.armed};this.armed=null;
        if(!done.requestSeen||done.ackStatus!=='ok'||!done.independent)
          throw Error('Missing server CAS/ACK/independent witness');
        return done;
      }
      await sleep(80);
    }
    const last=this.armed;
    throw Error('CHUA KIEM CHUNG: no wire ACK intercepted for server CAS: '+
      JSON.stringify({requestSeen:last?.requestSeen,ackSeen:last?.ackSeen,
        ackStatus:last?.ackStatus,requestId:last?.requestId,error:last?.error}));
  }
  async close(){
    for(const s of this.sockets)s.destroy();
    if(this.server)await new Promise(resolve=>this.server.close(()=>resolve()));
    this.server=null;
  }
}
