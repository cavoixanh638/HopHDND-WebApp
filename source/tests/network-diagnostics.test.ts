import {describe,it,expect} from 'vitest';
import {captureNetworkDiagnostics} from '../src/data/network-diagnostics';

const nav=(values:Record<string,number>)=>values as unknown as PerformanceNavigationTiming;
const res=(name:string,responseEnd:number,duration:number,transferSize=900)=>
  ({name,responseEnd,duration,transferSize} as PerformanceResourceTiming);

describe('startup timing diagnosis without sensitive network information',()=>{
 it('separates first HTML transfer and static bundle delay from Firebase auth and RTDB',()=>{
   const perf={getEntriesByType:(type:string)=>type==='navigation'
      ?[nav({domainLookupStart:4,domainLookupEnd:10,connectStart:10,connectEnd:40,
        requestStart:43,responseStart:110,responseEnd:125,domContentLoadedEventEnd:170})]
      :[res('https://site.example/assets/pages-secret.js',15000,14800),
        res('https://site.example/assets/site-style.css',100,90),
        res('https://hophdnd.firebaseio.com/.json?auth=secret',200000,120000)]} as Performance;
   const got=captureNetworkDiagnostics(perf,{visibilityState:'hidden'} as Document,{} as Navigator);
   expect(got.navigation.ttfbMs).toBe(67);
   expect(got.navigation.responseEndMs).toBe(125);
   expect(got.assets).toEqual([
     {kind:'script',responseEndMs:15000,durationMs:14800,transferBytes:900},
     {kind:'style',responseEndMs:100,durationMs:90,transferBytes:900}
   ]);
   expect(JSON.stringify(got)).not.toContain('auth=secret');
   expect(JSON.stringify(got)).not.toContain('site.example');
   expect(got.visibility).toBe('hidden');
 });
 it('keeps missing navigation or unobservable timing as null rather than claiming instant network',()=>{
   const got=captureNetworkDiagnostics({getEntriesByType:()=>[]} as unknown as Performance,
     {visibilityState:'visible'} as Document,{} as Navigator);
   expect(got.navigation.ttfbMs).toBeNull();
   expect(got.navigation.responseEndMs).toBeNull();
   expect(got.assets).toEqual([]);
 });
});
