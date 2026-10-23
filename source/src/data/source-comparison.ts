/** A/B experiment only. Never persists or changes the administrator's saved source. */
export type CompareSource='excel'|'database';
export function compareSourceFromSearch(search:string):CompareSource|null{
  const params=new URLSearchParams(search);
  if(params.get('startupMetrics')!=='1')return null;
  const value=params.get('compareSource');
  return value==='excel'||value==='database'?value:null;
}
export function comparisonUrl(current:string,source:CompareSource):string{
  const next=new URL(current);
  next.searchParams.set('startupMetrics','1');
  next.searchParams.set('compareSource',source);
  next.searchParams.delete('dbTransport'); // Equal Firebase transport for both groups
  return next.toString();
}
