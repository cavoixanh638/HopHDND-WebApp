import {describe,it,expect} from 'vitest';
import {reportTooltipPosition} from '../src/components/SharedReportTooltip';
import {editTooltipPosition} from '../src/components/SharedEditTooltip';
function overlap(a:{left:number;top:number},w:number,h:number,b:{left:number;right:number;top:number;bottom:number}){
  return Math.max(0,Math.min(a.left+w,b.right)-Math.max(a.left,b.left))*
    Math.max(0,Math.min(a.top+h,b.bottom)-Math.max(a.top,b.top));
}
describe('Tooltips sit diagonally outside the active cell',()=>{
  it('prefers the upper right on ordinary report cells',()=>{
    const cell={left:210,right:285,top:120,bottom:155};
    const p=reportTooltipPosition(cell,1100,800);
    expect(p.left).toBeGreaterThan(cell.right);
    expect(p.top).toBeLessThan(cell.top);
    expect(overlap(p,190,32,cell)).toBe(0);
  });
  it('reverses horizontally near the right viewport boundary',()=>{
    const cell={left:925,right:1000,top:140,bottom:185};
    const p=reportTooltipPosition(cell,1100,800);
    expect(p.left+190).toBeLessThan(cell.left);
    expect(overlap(p,190,32,cell)).toBe(0);
  });
  it('positions editable hint immediately, outside the cell and within viewport',()=>{
    for(const cell of [{left:0,right:90,top:70,bottom:110},
      {left:330,right:430,top:3,bottom:30},{left:115,right:220,top:5,bottom:40}]){
      const p=editTooltipPosition(cell,450,800);
      expect(p.left).toBeGreaterThanOrEqual(6);
      expect(p.left+112).toBeLessThanOrEqual(444);
      expect(p.top).toBeGreaterThanOrEqual(6);
      expect(overlap(p,112,26,cell)).toBe(0);
    }
  });
});
