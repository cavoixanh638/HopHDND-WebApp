// Same-host cold-start A/B with independent Chrome profiles and no business data output.
// Alternates order to reduce systematic runner-side warmed-CDN bias.
// Run only AFTER the diagnostic guestMetadata=defer version has deployed.
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2);
if(args.includes('--help')){
  console.log('node scripts/compare-guest-cold-start.mjs --rounds=5 --timeout=20000');
  console.log('Runs baseline and guestMetadata=defer with fresh Chrome profiles.');
  process.exit(0);
}
const option=(n,d)=>args.find(x=>x.startsWith('--'+n+'='))?.slice(n.length+3)??d;
const rounds=Number(option('rounds','5')),timeout=Number(option('timeout','20000'));
if(!Number.isInteger(rounds)||rounds<2||rounds>15||!Number.isInteger(timeout)||timeout<2000||timeout>60000)
  throw Error('Invalid rounds or timeout');
const base='https://cavoixanh638.github.io/HopHDND-WebApp/';
const modes=[
  {id:'baseline',url:base+'?startupMetrics=1&dataCache=off'},
  {id:'guest-data-first',url:base+'?startupMetrics=1&dataCache=off&guestMetadata=defer'}
];
const collected=new Map(modes.map(x=>[x.id,[]]));
for(let i=0;i<rounds;i++){
  const ordered=i%2===0?modes:[...modes].reverse();
  for(const mode of ordered){
    const output=spawnSync(process.execPath,[
      'scripts/measure-web-startup.mjs','--runs=1','--timeout='+timeout,'--host='+mode.id+'='+mode.url
    ],{encoding:'utf8',timeout:timeout+23000,maxBuffer:2_000_000});
    const lines=(output.stdout??'').split('\n');
    const matched=lines.filter(x=>x.startsWith('HOPHDND_STARTUP_SAMPLE '));
    let sample;
    try{sample=JSON.parse(matched.at(-1)?.slice('HOPHDND_STARTUP_SAMPLE '.length)??'null');}catch{}
    const verified=output.status===0&&sample?.result==='verified-live'&&
      sample?.dataCacheMs===null&&sample?.dataMilestoneMs!=null&&sample?.snapshotMs!=null;
    const item={round:i+1,mode:mode.id,
      result:verified?'verified-live':'timeout-or-invalid',
      dataMilestoneMs:verified?sample.dataMilestoneMs:null,
      snapshotMs:verified?sample.snapshotMs:null,
      authMs:verified?sample.authMs:null,
      jsEntryMs:verified?sample.jsEntryMs:null};
    collected.get(mode.id).push(item);
    console.log('COLD_AB_SAMPLE',JSON.stringify(item));
  }
}
const percentile=(values,p)=>{
  if(values.length===0)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.ceil(sorted.length*p)-1];
};
for(const mode of modes){
  const items=collected.get(mode.id);
  const values=items.filter(x=>x.result==='verified-live').map(x=>x.dataMilestoneMs);
  const live=items.filter(x=>x.result==='verified-live').map(x=>x.snapshotMs);
  console.log('COLD_AB_SUMMARY',JSON.stringify({
    mode:mode.id,attempted:items.length,verified:values.length,failed:items.length-values.length,
    render:{medianMs:percentile(values,.5),p75Ms:percentile(values,.75),p95Ms:percentile(values,.95)},
    live:{medianMs:percentile(live,.5),p75Ms:percentile(live,.75),p95Ms:percentile(live,.95)}
  }));
}
console.log('COLD_AB_NOTE','GitHub runner is not the user network. No change to defaults or permissions.');
if([...collected.values()].some(items=>items.filter(x=>x.result==='verified-live').length<rounds))
  process.exitCode=1;
