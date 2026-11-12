import {describe,it,expect} from 'vitest';
import {placeCellPicker} from '../src/features/items/pr95-v5-l1-picker-placement';
import {claimCellPicker,releaseCellPickerClaim} from '../src/features/items/pr95-v5-l1-picker-coordinator';
import {CellPicker} from '../src/features/items/CellPicker';
import {renderToStaticMarkup} from 'react-dom/server';

const vp={left:0,top:0,width:1440,height:760};
const anchor=(top:number,height=38,width=130)=>({
  top,bottom:top+height,left:400,width
});
describe('UI V5 L1 natural-height anchored picker',()=>{
  it.each([3,5,7])('keeps a %i-choice menu just below its trigger when room is sufficient',(n)=>{
    const height=16+n*36;
    const rect=anchor(200);
    const pos=placeCellPicker(rect,height,vp);
    expect(pos.side).toBe('below');
    expect(pos.top-rect.bottom).toBe(6);
    expect(pos.maxHeight).toBe(height);
    expect(pos.top+pos.maxHeight).toBeLessThanOrEqual(752);
  });
  it.each([3,5,7])('flips %i choices UP at the page bottom, using its actual height',(n)=>{
    const height=16+n*36;
    const rect=anchor(699);
    const pos=placeCellPicker(rect,height,vp);
    expect(pos.side).toBe('above');
    expect(rect.top-(pos.top+pos.maxHeight)).toBe(6);
    expect(pos.maxHeight).toBe(height);
    expect(pos.top).toBeGreaterThanOrEqual(8);
  });
  it('constrains an overlong menu to the side with most space and scrollable height',()=>{
    const rect=anchor(320);
    const p=placeCellPicker(rect,900,{left:0,top:0,width:390,height:640});
    expect(p.side).toBe('above');
    expect(p.maxHeight).toBe(306);
    expect(p.top).toBe(8);
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.left+p.width).toBeLessThanOrEqual(382);
  });
  it('repositions a filtered menu to its shorter measured content (no 360px jump)',()=>{
    const rect=anchor(615);
    const long=placeCellPicker(rect,265,vp);
    const short=placeCellPicker(rect,55,vp);
    expect(long.side).toBe('above');
    expect(short.side).toBe('below');
    expect(short.top-rect.bottom).toBe(6);
    expect(short.maxHeight).toBe(55);
  });
  it('respects panned/zoomed visualViewport coordinates and off-axis width',()=>{
    const view={left:80,top:120,width:300,height:350};
    const rect={left:345,top:397,bottom:432,width:165};
    const pos=placeCellPicker(rect,180,view);
    expect(pos.side).toBe('above');
    expect(pos.top).toBeGreaterThanOrEqual(128);
    expect(pos.left).toBeGreaterThanOrEqual(88);
    expect(pos.left+pos.width).toBeLessThanOrEqual(372);
  });
  it('does not mount hidden options in baseline cells and preserves input props',()=>{
    const html=renderToStaticMarkup(<CellPicker label="Lãnh đạo VP" value="Giữ nguyên"
      options={['A','B','C']} searchable onChange={()=>{}}/>);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('cell-picker-popover');
    expect(html).not.toContain('role="option"');
  });
});
describe('UI V5 L1 one-click handoff fences',()=>{
  // No Firebase endpoint: emulate the manager's async cancellation only.
  it('dismisses A exactly once before B starts, even when A lease release is slow',async()=>{
    const a={} as HTMLButtonElement,b={} as HTMLButtonElement;
    let finishA!:()=>void;
    const pendingA=new Promise<void>(resolve=>{finishA=resolve;});
    const events:string[]=[];
    await claimCellPicker(a,()=>{events.push('dismiss A');releaseCellPickerClaim(a,pendingA);return pendingA;});
    let bReady=false;
    const readyB=claimCellPicker(b,async()=>{events.push('dismiss B');}).then(()=>{bReady=true;events.push('ready B');});
    await Promise.resolve();
    expect(events).toEqual(['dismiss A']);
    expect(bReady).toBe(false);
    finishA();await readyB;
    expect(events).toEqual(['dismiss A','ready B']);
    releaseCellPickerClaim(b);
  });
  it('serializes A->B->C without a second click or duplicate cancellation',async()=>{
    const a={} as HTMLButtonElement,b={} as HTMLButtonElement,c={} as HTMLButtonElement;
    let releaseA!:()=>void;
    const slow=new Promise<void>(resolve=>{releaseA=resolve;});
    const events:string[]=[];
    await claimCellPicker(a,()=>{events.push('A close');return slow;});
    const pB=claimCellPicker(b,async()=>{events.push('B close');});
    const pC=claimCellPicker(c,async()=>{events.push('C close');});
    expect(events).toEqual(['A close','B close']);
    releaseA();await Promise.all([pB,pC]);
    expect(events).toEqual(['A close','B close']);
    releaseCellPickerClaim(c);
  });
});
