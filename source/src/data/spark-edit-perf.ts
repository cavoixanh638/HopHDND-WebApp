/** Opt-in, in-memory timing of RTDB operation round trips. No field values,
 * record IDs, UIDs, network payloads, storage or analytics leave this tab.
 * Add ?editPerf=1 to the URL and inspect DevTools Console for p50/p95.
 * Synthetic Emulator timings are not production network benchmarks. */
const samples=new Map<string,number[]>();
export function recordSparkEditLatency(action:string,ms:number):void{
  if(typeof location==='undefined'||new URLSearchParams(location.search).get('editPerf')!=='1')return;
  if(!['acquire','renew','release','save','resolve'].includes(action)||!Number.isFinite(ms)||ms<0)return;
  const values=samples.get(action)??[];
  values.push(ms);
  if(values.length>200)values.shift();
  samples.set(action,values);
  const sorted=[...values].sort((a,b)=>a-b);
  const percentile=(p:number)=>Math.round(sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]);
  // Diagnostics are intentionally only in DevTools, never in the WebApp UI.
  console.info('HDND_RTDB_EDIT_PERF',JSON.stringify({
    action,n:values.length,lastMs:Math.round(ms),p50Ms:percentile(.5),p95Ms:percentile(.95)
  }));
}
