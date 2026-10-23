/**
 * On-demand network timings without Firebase tokens, endpoints, records or URLs.
 * All times are relative to navigationStart. The browser may omit timing fields
 * for resources across origins; never interpret missing data as 0ms network.
 */
export interface NetworkDiagnostics {
  navigation:{dnsMs:number|null;connectMs:number|null;ttfbMs:number|null;htmlReceivedMs:number|null;domContentLoadedMs:number|null;responseEndMs:number|null};
  assets:{kind:'script'|'style';responseEndMs:number;durationMs:number;transferBytes:number|null}[];
  visibility:'visible'|'hidden'|'unknown';
  connectionType:string|null;
}
function ms(value:number|undefined|null):number|null{
  return typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.round(value):null;
}
export function captureNetworkDiagnostics(
  perf:Pick<Performance,'getEntriesByType'>|undefined=typeof performance==='undefined'?undefined:performance,
  doc:Pick<Document,'visibilityState'>|undefined=typeof document==='undefined'?undefined:document,
  nav:Navigator|undefined=typeof navigator==='undefined'?undefined:navigator
):NetworkDiagnostics {
  const n=perf?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming|undefined;
  const between=(end:number|undefined,start:number|undefined)=>typeof end==='number'&&typeof start==='number'&&end>0&&start>0&&end>=start?ms(end-start):null;
  const raw=perf?.getEntriesByType?.('resource')??[];
  const assets=raw.flatMap(entry=>{
    const r=entry as PerformanceResourceTiming;
    // Only our static /assets/ files. Never show third-party Firebase request URLs.
    let kind:'script'|'style'|null=null;
    try {const p=new URL(r.name).pathname;kind=p.includes('/assets/')&&p.endsWith('.js')?'script':p.includes('/assets/')&&p.endsWith('.css')?'style':null;}catch{}
    if(!kind)return [];
    return [{kind,responseEndMs:ms(r.responseEnd)??0,durationMs:ms(r.duration)??0,
      transferBytes:r.transferSize>0?r.transferSize:null}];
  });
  const connection=(nav as Navigator&{connection?:{effectiveType?:string}}|undefined)?.connection?.effectiveType;
  return {
    navigation:{
      dnsMs:between(n?.domainLookupEnd,n?.domainLookupStart),
      connectMs:between(n?.connectEnd,n?.connectStart),
      ttfbMs:between(n?.responseStart,n?.requestStart),
      htmlReceivedMs:between(n?.responseEnd,n?.responseStart),
      domContentLoadedMs:ms(n?.domContentLoadedEventEnd),
      responseEndMs:ms(n?.responseEnd)
    },
    assets,visibility:doc?.visibilityState==='hidden'?'hidden':doc?.visibilityState==='visible'?'visible':'unknown',
    connectionType:typeof connection==='string'?connection:null
  };
}
