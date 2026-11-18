import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {defaultReportLayout} from '../src/data/report-preferences';
import {inlineG03ApplyVisualChange,inlineG03RestoreVisual,inlineG03VisualValue}
  from '../src/features/settings/inline-g03-report-visual-adapter';

const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
describe('G00 integrated inline report visual host',()=>{
  it('mounts the G03 visual toolbar in the real G02 report slot only for verified admin',()=>{
    expect(app).toContain('canEdit={inlineAllowed&&inlineEditing}');
    expect(app).toContain('onChange={change=>changeInlineVisual(config.id,change)}');
    expect(app).toContain('onSave={saveInlineVisual}');
    expect(app).toContain('onCancel={()=>cancelInlineVisual(config.id)}');
    expect(app).toContain('if(!inlineAllowed||!inlineEditing||inlinePending)return;');
    expect(app).toContain('setInlineVisualDraft(null); // rollback the visual preview;');
    expect(app).toContain('if(inlineVisualDraft){setInlineError(');
    expect(app).not.toContain('firebase.database().ref(');
  });
  it('previews font changes locally and cancels without mutating source layout',()=>{
    const original=defaultReportLayout();
    const initial=JSON.stringify(original);
    const next=inlineG03ApplyVisualChange(original,original[0].id,{
      tableFontSize:17,emphasizeProgress:false,titleAccentText:'Nghị quyết',
    });
    expect(inlineG03VisualValue(next,original[0].id).tableFontSize).toBe(17);
    expect(inlineG03RestoreVisual(next,original,original[0].id)).toEqual(original);
    expect(JSON.stringify(original)).toBe(initial);
  });
});
