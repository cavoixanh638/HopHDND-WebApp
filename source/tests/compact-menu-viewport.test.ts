import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {placeCompactMenu} from '../src/features/items/compact-menu-placement';
describe('responsibility popup fits the viewport and escapes List clipping',()=>{
  it('opens below the near-top trigger and scrolls in a short window',()=>{
    const p=placeCompactMenu({top:35,bottom:65,right:450},453,420);
    expect(p.side).toBe('below');
    expect(p.top).toBe(71);
    expect(p.maxHeight).toBeLessThan(560);
    expect(p.top+p.maxHeight).toBeLessThanOrEqual(408);
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect(p.left+p.width).toBeLessThanOrEqual(441);
  });
  it('flips above the trigger when lower space is insufficient',()=>{
    const p=placeCompactMenu({top:530,bottom:559,right:1130},1200,600);
    expect(p.side).toBe('above');
    expect(p.top).toBeGreaterThanOrEqual(12);
    expect(p.top+p.maxHeight).toBeLessThanOrEqual(524);
    expect(p.maxHeight).toBeGreaterThan(500);
  });
  it('fits the horizontal bounds of a 390px mobile viewport',()=>{
    const p=placeCompactMenu({top:250,bottom:280,right:388},390,520);
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect(p.left+p.width).toBeLessThanOrEqual(378);
    expect(p.top+p.maxHeight).toBeLessThanOrEqual(508);
    expect(p.width).toBe(340);
  });
  it('renders from document.body, not the clipped List region',()=>{
    const list=readFileSync(new URL('../src/features/items/ItemList.tsx',import.meta.url),'utf8');
    const css=readFileSync(new URL('../src/features/items/item-frame.css',import.meta.url),'utf8');
    expect(list).toContain('createPortal(');
    expect(list).toContain('document.body');
    expect(list).toContain('compactPanelRef.current?.contains(node)');
    expect(list).toContain("event.key!=='Escape'");
    expect(css).toContain('.compact-columns-options.compact-columns-options-floating');
    expect(css).toContain('position:fixed');
    expect(css).toContain('overflow-y:auto');
  });
});
