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
