// Read-only Chrome performance comparison. No row values, URLs, UIDs or tokens in output.
// The first navigation uses a fresh profile; later runs reuse auth but disable HTTP cache.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const argv=process.argv.slice(2);
if(argv.includes('--help')){
  console.log('Usage: node scripts/measure-web-startup.mjs --host=default=https://example.org/app/ --host=control=https://example.org/app/?mirrorWarmup=off --runs=5 --timeout=25000');
  console.log('One fresh Chrome profile per host, then reused-auth reloads with HTTP cache disabled. Chrome runner is not the user device.');
  process.exit(0);
}
const option=(name,fallback)=>argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const runs=Number(option('runs','5')), timeout=Number(option('timeout','25000'));
if(!Number.isInteger(runs)||runs<1||runs>15||!Number.isInteger(timeout)||timeout<2000||timeout>60000)
  throw Error('runs must be 1..15 and timeout must be 2000..60000');
const requested=argv.filter(x=>x.startsWith('--host='));
const hosts=requested.length?requested.map(raw=>{
  const value=raw.slice(7),pos=value.indexOf('=');
  if(pos<1)throw Error('Specify --host=label=https://...');
  const label=value.slice(0,pos),url=new URL(value.slice(pos+1));
  if(!/^[a-zA-Z0-9_-]{1,25}$/.test(label)||url.protocol!=='https:'||url.username||url.password)
    throw Error('Invalid host label or non-HTTPS URL');
  url.searchParams.set('startupMetrics','1');
  url.searchParams.set('dataCache','off'); // Compare LIVE reads, not a fast but stale session snapshot.
  url.hash='';
  return {label,url:url.toString()};
}):[{label:'github_pages',url:'https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1&dataCache=off'}];
if(new Set(hosts.map(x=>x.label)).size!==hosts.length)throw Error('Duplicate host labels');
const candidates=process.env.CHROME_BIN?[process.env.CHROME_BIN]:['google-chrome','google-chrome-stable','chromium','chromium-browser'];
const binary=candidates.find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!binary)throw Error('Chromium not installed. Supply CHROME_BIN.');

async function freePort(){
  const srv=createServer();
  await new Promise((resolve,reject)=>{srv.once('error',reject);srv.listen(0,'127.0.0.1',resolve);});
  const port=srv.address().port;
  await new Promise(resolve=>srv.close(resolve));
  return port;
}
const pct=(xs,p)=>xs.length?[...xs].sort((a,b)=>a-b)[Math.ceil(p*xs.length)-1]:null;
const aggregate=(rows,key)=>{
  const values=rows.map(x=>x[key]).filter(x=>typeof x==='number'&&Number.isFinite(x));
  return {n:values.length,medianMs:pct(values,.5),p75Ms:pct(values,.75),p95Ms:pct(values,.95)};
};
async function benchmark(host){
  const dir=mkdtempSync(join(tmpdir(),'hdnd-perf-')),port=await freePort();
  const chrome=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,
    '--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
  let ws;
  const samples=[];
  try{
    let page;
    for(let i=0;i<100;i++){
      if(chrome.exitCode!==null)throw Error('Chrome process exited');
      try{
        const response=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(800)});
        if(response.ok){page=(await response.json()).find(x=>x.type==='page');if(page)break;}
      }catch{}
      await sleep(150);
    }
    if(!page)throw Error('Chrome debugging not ready');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{
      ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
    });
    let seq=0;const pending=new Map();
    ws.addEventListener('message',event=>{
      const data=JSON.parse(event.data),job=pending.get(data.id);
      if(!job)return;
      pending.delete(data.id);data.error?job.reject(Error(data.error.message)):job.resolve(data.result);
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++seq;
      const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout for '+method));},12000);
      pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},
        reject:err=>{clearTimeout(timer);reject(err);}});
      ws.send(JSON.stringify({id,method,params}));
    });
    await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
    await send('Network.setCacheDisabled',{cacheDisabled:true});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    for(let i=0;i<runs;i++){
      const url=new URL(host.url);url.searchParams.set('benchVisit',String(i+1));
      await send('Page.navigate',{url:url.toString()});
      const started=Date.now();
      let metrics=null;
      while(Date.now()-started<timeout){
        // Guard against reading metrics from the preceding navigation.
        const expression="(()=>{"+
          "if(new URLSearchParams(location.search).get('benchVisit')!=="+JSON.stringify(String(i+1))+")return null;"+
          "if(document.readyState==='loading')return null;"+
          "const n=performance.getEntriesByType('navigation')[0],marks=performance.getEntriesByType('mark');"+
          "const mark=k=>marks.find(e=>e.name==='hdnd:'+k)?.startTime??null;"+
          "const paint=performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint')?.startTime??null;"+
          "const ms=k=>k==null?null:Math.round(k);"+
          "return {htmlMs:ms(n?.responseEnd),fcpMs:ms(paint),jsEntryMs:ms(mark('js-entry')),"+
          "authMs:ms(mark('auth-signed-in')),snapshotMs:ms(mark('data-first')),"+
          "dataCacheMs:ms(mark('data-cache-hydrated')),"+
          "dataMilestoneMs:ms(mark('first-data-painted')),visible:document.visibilityState};})()";
        try{
          const response=await send('Runtime.evaluate',{expression,returnByValue:true});
          metrics=response.result?.value??null;
          // Cache can paint before any live snapshot: wait for BOTH milestones.
          if(metrics?.dataMilestoneMs!=null&&metrics?.snapshotMs!=null)break;
        }catch{ /* Navigation may destroy the previous execution context. */ }
        await sleep(180);
      }
      const sample={host:host.label,visit:i+1,kind:i===0?'fresh-profile':'reused-auth-http-cache-off',
        ...(metrics??{}),result:metrics?.dataMilestoneMs!=null&&metrics?.snapshotMs!=null?'verified-live':'timeout-or-no-live-data'};
      samples.push(sample);
      console.log('HOPHDND_STARTUP_SAMPLE',JSON.stringify(sample));
    }
  }finally{
    try{ws?.close();}catch{}
    chrome.kill('SIGKILL');
    await sleep(300);
    rmSync(dir,{recursive:true,force:true});
  }
  const good=samples.filter(x=>x.result==='verified-live'),reused=good.filter(x=>x.visit>1);
  const summary={host:host.label,runs,success:good.length,timeout:runs-good.length,
    freshProfileDataMs:good.find(x=>x.visit===1)?.dataMilestoneMs??null,
    freshProfileLiveVerifiedMs:good.find(x=>x.visit===1)?.snapshotMs??null,
    reusedAuthNoHttpCache:{dataVisible:aggregate(reused,'dataMilestoneMs'),
      liveVerified:aggregate(reused,'snapshotMs'),cacheHydrated:aggregate(reused,'dataCacheMs'),
      auth:aggregate(reused,'authMs'),html:aggregate(reused,'htmlMs'),
      js:aggregate(reused,'jsEntryMs'),snapshot:aggregate(reused,'snapshotMs')}};
  console.log('HOPHDND_STARTUP_SUMMARY',JSON.stringify(summary));
  return summary;
}
const summaries=[];
for(const host of hosts)summaries.push(await benchmark(host));
console.log('HOPHDND_STARTUP_DONE',JSON.stringify({runnerOnly:true,
  warning:'Timing now waits for a LIVE Firebase data-first marker as well as table rendering. Cached view may appear earlier; Chrome trace is needed to establish pixel paint. No host ranking without same build, profile and network.',
  summaries}));
