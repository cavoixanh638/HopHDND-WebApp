// Read-only three-sample timing of the EXACT Sheets GViz A:O endpoint used by the app.
// Does not print spreadsheet contents, source text, row IDs or signed tokens.
// Timing from a GitHub runner is not equivalent to the user's Chrome/network.
import {performance} from 'node:perf_hooks';
const sourceId='1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp',gid='60961344';
const durations=[];
for(let trial=1;trial<=3;trial++){
  const url=new URL(`https://docs.google.com/spreadsheets/d/${sourceId}/gviz/tq`);
  url.searchParams.set('tqx','out:json;responseHandler:hdnd_probe');
  url.searchParams.set('gid',gid);
  url.searchParams.set('headers','0');
  url.searchParams.set('range','A:O');
  url.searchParams.set('cb',String(Date.now())+'-'+trial);
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000),started=performance.now();
  try {
    const response=await fetch(url,{signal:ctrl.signal,redirect:'follow'});
    const body=await response.text();
    const wallMs=Math.round(performance.now()-started);
    const status=body.match(/(?:["']?status["']?)\s*:\s*["'](ok|error|warning)["']/i)?.[1]??'not-recognized';
    const rows=(body.match(/(?:[,{]\s*)["']?c["']?\s*:\s*\[/g)??[]).length;
    const result={trial,httpStatus:response.status,gvizStatus:status,approxRows:rows,bodyBytes:Buffer.byteLength(body),wallMs,range:'A:O'};
    console.log('GVIZ_LIVE_READ',JSON.stringify(result));
    if(response.ok&&status==='ok')durations.push(wallMs);
  }catch(cause){
    console.log('GVIZ_LIVE_READ',JSON.stringify({trial,error:cause instanceof Error?cause.name:'request failed',wallMs:Math.round(performance.now()-started)}));
  }finally{clearTimeout(timer);}
}
if(durations.length){
  const sorted=durations.sort((a,b)=>a-b);
  console.log('GVIZ_LIVE_SUMMARY',JSON.stringify({successful:sorted.length,medianMs:sorted[Math.floor(sorted.length/2)],minMs:sorted[0],maxMs:sorted.at(-1),important:'GitHub runner network, not browser first paint'}));
}else console.log('GVIZ_LIVE_SUMMARY',JSON.stringify({successful:0,important:'External endpoint unavailable during probe; do not infer frontend failure'}));
