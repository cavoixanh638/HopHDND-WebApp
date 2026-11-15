type ColumnWidth={key:string;width:number};

/** Add the unused viewport width to text columns. Saved pixel widths remain
 * the baseline; compact IDs/order columns never absorb the spare space.
 * Weights are independent of saved widths so an ordinary target/tail resize
 * keeps every other displayed column unchanged while the viewport is fixed. */
export function fitTableColumns(columns:readonly ColumnWidth[],viewport:number,
  weights:Readonly<Record<string,number>>={},previousGrowth?:Readonly<Record<string,number>>):Record<string,number>{
  const result=Object.fromEntries(columns.map(c=>[c.key,c.width]));
  let spare=Math.max(0,Math.floor(Number.isFinite(viewport)?viewport:0)-
    columns.reduce((sum,c)=>sum+c.width,0));
  // Keep the already allocated spare space during a target/tail transfer.
  // Recalculating a capped column's share can otherwise cancel a user's drag.
  if(previousGrowth&&Object.keys(previousGrowth).length===columns.length&&
    columns.every(c=>Number.isInteger(previousGrowth[c.key])&&previousGrowth[c.key]>=0&&
      ((c.key!=='displayCode'&&c.key!=='stt')||previousGrowth[c.key]===0)&&
      (previousGrowth[c.key]===0||c.width+previousGrowth[c.key]<=1600))&&
    columns.reduce((sum,c)=>sum+previousGrowth[c.key],0)===spare){
    return Object.fromEntries(columns.map(c=>[c.key,c.width+previousGrowth[c.key]]));
  }
  let flexible=columns.filter(c=>c.key!=='displayCode'&&c.key!=='stt'&&c.width<1600);
  while(spare>0&&flexible.length){
    const weight=(key:string)=>Math.max(1,weights[key]??1);
    const total=flexible.reduce((sum,c)=>sum+weight(c.key),0);
    const budget=spare;
    let used=0;
    for(const c of flexible){
      const add=Math.min(1600-result[c.key],Math.floor(budget*weight(c.key)/total));
      result[c.key]+=add;used+=add;
    }
    spare-=used;
    // Integer remainder, or a capped column: distribute deterministically.
    for(const c of flexible){
      if(!spare)break;
      if(result[c.key]<1600){result[c.key]++;spare--;}
    }
    flexible=flexible.filter(c=>result[c.key]<1600);
  }
  return result;
}

/** Viewport-only responsive projection for the normal compact List.
 * The saved Firebase widths remain untouched. L03 is not passed here because
 * its independent 2/3-mode tracks have one owner-selected physical width.
 *
 * The old fitTableColumns only grew: with a saved sum larger than clientWidth
 * (including the permanent vertical scrollbar) the List ALWAYS overflowed.
 * Shrink other columns toward readable minimums, proportionally to available
 * slack, and keep horizontal scrolling only when the minimums truly cannot fit.
 */
export function fitTableColumnsResponsive(columns:readonly ColumnWidth[],viewport:number,
  weights:Readonly<Record<string,number>>={},
  previousDelta?:Readonly<Record<string,number>>,
  minWidths:Readonly<Record<string,number>>={}):Record<string,number>{
  const base=Object.fromEntries(columns.map(c=>[c.key,c.width]));
  if(!Number.isFinite(viewport)||viewport<=0||columns.length===0)return base;
  const target=Math.floor(viewport);
  const total=columns.reduce((sum,c)=>sum+c.width,0);
  if(total<=target)return fitTableColumns(columns,target,weights,previousDelta);

  const minimum=Object.fromEntries(columns.map(c=>{
    // ID/STT are fixed compact rails. A soft floor may not enlarge an owner's
    // already smaller setting; shrinking never mutates persisted source widths.
    const requested=(c.key==='displayCode'||c.key==='stt')
      ?c.width:(Number.isFinite(minWidths[c.key])?minWidths[c.key]:60);
    return [c.key,Math.min(c.width,Math.max(0,Math.ceil(requested)))];
  }));
  const minTotal=columns.reduce((sum,c)=>sum+minimum[c.key],0);
  const fittedTotal=Math.max(target,minTotal);
  const deficit=total-fittedTotal;
  if(deficit<=0)return base;

  // A manual drag should not spring back when saved widths are projected
  // through a shrink-fit view. Retain the exact previous per-column deltas
  // only when their sum and all minimums still match this viewport.
  if(previousDelta&&columns.every(c=>Number.isInteger(previousDelta[c.key])&&
    c.width+previousDelta[c.key]>=minimum[c.key]&&
    c.width+previousDelta[c.key]<=1600&&
    (!['displayCode','stt'].includes(c.key)||previousDelta[c.key]===0))&&
    columns.reduce((sum,c)=>sum+previousDelta[c.key],0)===-deficit)
    return Object.fromEntries(columns.map(c=>[c.key,c.width+previousDelta[c.key]]));

  const capacity=columns.map(c=>Math.max(0,c.width-minimum[c.key]));
  const totalCapacity=capacity.reduce((a,b)=>a+b,0);
  if(!totalCapacity)return base;
  const reductions=capacity.map(value=>Math.floor(deficit*value/totalCapacity));
  let remainder=deficit-reductions.reduce((a,b)=>a+b,0);
  // Round-robin the fractional remainder without changing deterministic
  // source order, preserving the exact 1px viewport-fit invariant.
  for(let i=0;remainder>0;i=(i+1)%columns.length){
    if(reductions[i]<capacity[i]){reductions[i]++;remainder--;}
  }
  return Object.fromEntries(columns.map((c,i)=>[c.key,c.width-reductions[i]]));
}
