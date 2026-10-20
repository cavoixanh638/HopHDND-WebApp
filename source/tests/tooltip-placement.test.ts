import {describe,it,expect} from 'vitest';
import {reportTooltipPosition} from '../src/components/SharedReportTooltip';
import {editTooltipPosition} from '../src/components/SharedEditTooltip';
describe('Shared tooltip positioning',()=>{
  it('does not obscure a report number in the middle or at the top',()=>{
    const normal={left:300,right:350,top:200,bottom:240};
    const a=reportTooltipPosition(normal,1100,800);
    expect(a.top+32).toBeLessThan(normal.top);
    const top={left:300,right:350,top:8,bottom:40};
    const b=reportTooltipPosition(top,1100,800);
    expect(b.top).toBeGreaterThan(top.bottom);
  });
  it('keeps instant edit cue outside the target',()=>{
    const cell={left:0,right:90,top:70,bottom:110};
    const p=editTooltipPosition(cell,450,800);
    expect(p.left).toBeGreaterThanOrEqual(6);
    expect(p.top+26).toBeLessThan(cell.top);
  });
});
