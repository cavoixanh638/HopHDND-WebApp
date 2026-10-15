// Read-only check of a publicly accessible GViz endpoint. Never print sheet cell data.
// An HTTP response in CI does not replace browser-level GitHub Pages verification.
const sourceId='1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp',gid='60961344';
const url=new URL(`https://docs.google.com/spreadsheets/d/${sourceId}/gviz/tq`);
url.searchParams.set('tqx','out:json;responseHandler:hdnd_probe');
url.searchParams.set('gid',gid);
url.searchParams.set('headers','0');
url.searchParams.set('range','A:P');
const ctrl=new AbortController();
const timer=setTimeout(()=>ctrl.abort(),15000);
try{
  const result=await fetch(url,{signal:ctrl.signal,redirect:'follow'});
  const body=await result.text();
  const status=body.match(/(?:["']?status["']?)\s*:\s*["'](ok|error|warning)["']/i)?.[1]??'not-recognized';
  const apparentRows=(body.match(/(?:[,{]\s*)[\"']?c[\"']?\s*:\s*\[/g)??[]).length;
  const actualHost=new URL(result.url).hostname;
  console.log(JSON.stringify({httpStatus:result.status,host:actualHost,mime:result.headers.get('content-type'),gvizStatus:status,approxRows:apparentRows,bytes:body.length,sourceGid:gid}));
}catch(cause){
  console.log('GViz public probe not verified:',cause instanceof Error?cause.name:'request failed');
}finally{clearTimeout(timer);}
