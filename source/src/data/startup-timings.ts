/**
 * On-demand startup timing trace; never stores data rows, user ids, tokens,
 * query results or URLs. Open ?startupMetrics=1 to show durations on screen.
 * Firebase channels are asynchronous; times are milestones from navigation,
 * not individual network request durations.
 */
export interface StartupSample {stage:string;atMs:number;detail?:string}
const enabled=typeof window!=='undefined'&&
  new URLSearchParams(window.location.search).get('startupMetrics')==='1';
const samples:StartupSample[]=[];
const clock=()=>typeof performance==='undefined'?0:performance.now();
export function startupEnabled(){return enabled;}
export function markStartup(stage:string,detail?:string){
  if(!enabled||samples.some(sample=>sample.stage===stage))return;
  const point={stage,atMs:Math.round(clock()),...(detail?{detail}:{})};
  samples.push(point);
  try{performance.mark('hdnd:'+stage);}catch{}
  console.info('[HopHDND startup]',stage,point.atMs+'ms',detail??'');
  window.dispatchEvent(new Event('hdnd-startup-sample'));
}
export function startupSamples():StartupSample[]{return [...samples].sort((a,b)=>a.atMs-b.atMs);}
