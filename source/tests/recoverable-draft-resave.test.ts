import {beforeEach,describe,expect,it,vi} from 'vitest';

const hooks=vi.hoisted(()=>{
  const slots:any[]=[];
  let cursor=0;
  return {
    reset:()=>{slots.length=0;cursor=0;},
    begin:()=>{cursor=0;},
    state:(initial:any)=>{
      const index=cursor++;
      if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;
      return [slots[index],(next:any)=>{
        slots[index]=typeof next==='function'?next(slots[index]):next;
      }];
    },
    ref:(initial:any)=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});},
  };
});
vi.mock('react',()=>({useState:hooks.state,useRef:hooks.ref,useEffect:vi.fn()}));
import {useRecoverableDraft} from '../src/state/use-recoverable-draft';

beforeEach(()=>{hooks.reset();});
describe('repeatable save in one editing session',()=>{
  it('rebases dirty state after each successful save and preserves the latest revision',()=>{
    const initial={value:1};
    const render=()=>{hooks.begin();return useRecoverableDraft('test:resave:unique',initial);};
    let editor=render();
    expect(editor.dirty).toBe(false);
    editor.setDraft({value:2});
    editor=render();
    expect(editor.dirty).toBe(true);
    editor.markSaved({value:2});
    editor=render();
    expect(editor.dirty).toBe(false);
    expect(editor.draft.value).toBe(2);
    editor.setDraft({value:3});
    editor=render();
    expect(editor.dirty).toBe(true);
    editor.markSaved({value:3});
    editor=render();
    expect(editor.dirty).toBe(false);
    expect(editor.draft.value).toBe(3);
    editor.setDraft({value:4});
    editor=render();
    expect(editor.dirty).toBe(true);
  });
});
