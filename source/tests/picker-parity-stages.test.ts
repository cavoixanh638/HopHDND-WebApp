import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {defaultItemLayout,validateItemLayout,validatePartyTrackWidths,
  DEFAULT_PARTY_TRACK_WIDTHS,resolvedPartyTrackWidths,partyTrackModeWidth,L03_RAIL_GAP_PX,L03_CELL_CHROME_PX
} from '../src/data/item-preferences';

/* Guards against accidentally moving L03 widths into CSS or modifying the
   canonical model. Computed style/real click checks live in the browser test. */
const source=()=>readFileSync(resolve('src/features/items/picker-parity-stages.css'),'utf8');
const track=()=>readFileSync(resolve('src/features/items/l03-track-widths.css'),'utf8');
const presets=[
 {readonly:{label:122,status:225},editable:{label:145,level:82,status:279}},
 {readonly:{label:93,status:127},editable:{label:93,level:87,status:133}}
];
describe('STAGES scoped picker parity contract',()=>{
 it('uses screenshot-proportioned defaults without overwriting saved rails',()=>{
  expect(DEFAULT_PARTY_TRACK_WIDTHS).toEqual({
   readonly:{label:128,status:164},editable:{label:120,level:76,status:120}
  });
  expect(resolvedPartyTrackWidths(defaultItemLayout())).toEqual(DEFAULT_PARTY_TRACK_WIDTHS);
  expect(partyTrackModeWidth(DEFAULT_PARTY_TRACK_WIDTHS,'readonly')).toBe(323);
  expect(partyTrackModeWidth(DEFAULT_PARTY_TRACK_WIDTHS,'editable')).toBe(355);
  expect(resolvedPartyTrackWidths(validateItemLayout({
   ...defaultItemLayout(),partyTrackWidths:presets[0]
  }))).toEqual(presets[0]);
 });
 it('imports parity at the top and retains five independent CSS rail variables',()=>{
  const css=track();
  expect(css.startsWith('@import "./picker-parity-stages.css";')).toBe(true);
  expect(css).toContain('var(--hdnd-l03-label-track)');
  expect(css).toContain('var(--hdnd-l03-level-track)');
  expect(css).toContain('var(--hdnd-l03-status-track)');
  expect(css).toContain('column-gap:8px');
  expect(css).toContain('row-gap:5px');
  expect(css).toContain('grid-template-columns:subgrid!important');
 });
 it('keeps 76/120px picker labels readable by minimizing horizontal reservations',()=>{
  const css=source();
  expect(css).toContain('padding:4px 4px!important;');
  expect(css).toContain('gap:3px!important;');
  expect(css).toContain('width:5px!important;');
  // Distinct from the 8px GROUP gap between independently sized L03 tracks.
  expect(track()).toContain('column-gap:8px;');
 });
 it('isolates all overrides to L03 and leaves L04/control rules unchanged',()=>{
  const css=source();
  expect(css).toMatch(/td\[data-l03-layout\]/);
  expect(css).toMatch(/\.compact-stages\[data-rev2="true"\]/);
  expect(css).toMatch(/\[data-ui-picker-skin="standard"\]/);
  expect(css).not.toMatch(/\.compact-pair-lines|\.compact-document-heading|\.item-filter|\.settings-/);
  expect(css).toMatch(/prefers-reduced-motion:reduce/);
  expect(css).toMatch(/@media print/);
 });
 it.each(presets)('preserves all five explicit saved rails across a JSON reload: %j',(preset)=>{
  const rails=validatePartyTrackWidths(preset);
  const reloaded=validateItemLayout(JSON.parse(JSON.stringify({
   ...defaultItemLayout(),partyTrackWidths:rails
  })));
  expect(resolvedPartyTrackWidths(reloaded)).toEqual(rails);
  const ro=preset.readonly.label+preset.readonly.status+L03_RAIL_GAP_PX+L03_CELL_CHROME_PX;
  const edit=preset.editable.label+preset.editable.level+preset.editable.status+2*L03_RAIL_GAP_PX+L03_CELL_CHROME_PX;
  expect(partyTrackModeWidth(resolvedPartyTrackWidths(reloaded),'readonly')).toBe(ro);
  expect(partyTrackModeWidth(resolvedPartyTrackWidths(reloaded),'editable')).toBe(edit);
 });
});
