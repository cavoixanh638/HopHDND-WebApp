import {describe,it,expect} from 'vitest';
import {emptyListContentMinimums,fitMeasuredPartyWidths,staffContentWidth,preserveListContentMinimums} from '../src/features/items/list-nowrap-widths';
const old={readonly:{label:220,status:340},editable:{label:200,level:100,status:350}};
describe('Intrinsic group width projection (not persisted)',()=>{
  it('shrinks below a wide saved layout, grows for long text, retains empty-mode fallback',()=>{
    const small={readonly:{label:104,status:140},editable:{label:0,level:0,status:0}};
    expect(fitMeasuredPartyWidths(old,small)).toEqual({readonly:small.readonly,editable:old.editable});
    const larger={readonly:{label:180,status:430},editable:{label:0,level:0,status:0}};
    expect(fitMeasuredPartyWidths(old,larger).readonly).toEqual(larger.readonly);
    expect(old.readonly).toEqual({label:220,status:340});
  });
  it('aligns mixed permission mode to the minimum common status and right edge',()=>{
    const measured={readonly:{label:146,status:210},editable:{label:126,level:52,status:230}};
    const fit=fitMeasuredPartyWidths(old,measured);
    expect(fit.readonly.label+8).toBe(fit.editable.label+fit.editable.level+16);
    expect(fit.readonly.status).toBe(230);expect(fit.editable.status).toBe(230);
    expect(fit.editable.label).toBe(126);expect(fit.editable.level).toBe(52);
    expect(fit.readonly.label).toBe(186);
  });
  it('staff fits the longest tag and value plus only actual chrome or its heading',()=>{
    expect(staffContentWidth({label:40,value:156,chrome:19,heading:148})).toBe(215);
    expect(staffContentWidth({label:40,value:100,chrome:19,heading:170})).toBe(170);
    expect(staffContentWidth({label:54,value:251,chrome:19,heading:148})).toBe(324);
  });
  it('preserves picker chrome in an explicit layout draft, not the saved width',()=>{
    const normal=emptyListContentMinimums(),draft=emptyListContentMinimums();
    normal.staff.room={label:50,value:170,chrome:19,heading:120};
    draft.staff.room={label:45,value:150,chrome:19,heading:120};
    expect(staffContentWidth(preserveListContentMinimums(draft,normal).staff.room)).toBe(239);
  });
});
