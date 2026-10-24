import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {activateEditableCell} from '../src/features/items/activate-editable-cell';
class FakeElement {
  interactive=false;
  closest(_selector:string){return this.interactive?this:null;}
}
class FakeButton extends FakeElement {
  disabled=false;
  click=vi.fn();
}
class FakeInput extends FakeElement {
  disabled=false;
  focus=vi.fn();
}
function makeCell(controls:Array<FakeButton|FakeInput>,editable=true){
  return {classList:{contains:(name:string)=>editable&&name==='editable-cell'},
    querySelectorAll:(_selector:string)=>controls};
}
function invoke(cell:ReturnType<typeof makeCell>,target:FakeElement){
  activateEditableCell({currentTarget:cell,target} as unknown as Parameters<typeof activateEditableCell>[0]);
}
beforeEach(()=>{
  vi.stubGlobal('Element',FakeElement);
  vi.stubGlobal('HTMLInputElement',FakeInput);
});
afterEach(()=>vi.unstubAllGlobals());
describe('click empty space in a writable detail-list cell',()=>{
  it('opens the only enabled status editor when the user clicks the parent cell',()=>{
    const button=new FakeButton(),cell=makeCell([button]);
    invoke(cell,new FakeElement());
    expect(button.click).toHaveBeenCalledOnce();
  });
  it('does not double-click a nested button or hijack the history control',()=>{
    const button=new FakeButton(),cell=makeCell([button]);
    const nestedButton=new FakeElement();nestedButton.interactive=true;
    invoke(cell,nestedButton);
    expect(button.click).not.toHaveBeenCalled();
  });
  it('never closes an editor by forwarding clicks inside its open popover',()=>{
    const trigger=new FakeButton(),cell=makeCell([trigger]);
    const popoverBackground=new FakeElement();
    popoverBackground.interactive=true; // equivalent to [popover]/[role=dialog]
    invoke(cell,popoverBackground);
    expect(trigger.click).not.toHaveBeenCalled();
  });
  it('never activates cells without editable permission or locked editors',()=>{
    const button=new FakeButton();invoke(makeCell([button],false),new FakeElement());
    expect(button.click).not.toHaveBeenCalled();
    button.disabled=true;invoke(makeCell([button]),new FakeElement());
    expect(button.click).not.toHaveBeenCalled();
  });
  it('never guesses which of two merged controls to activate',()=>{
    const first=new FakeButton(),second=new FakeButton();
    invoke(makeCell([first,second]),new FakeElement());
    expect(first.click).not.toHaveBeenCalled();
    expect(second.click).not.toHaveBeenCalled();
  });
  it('focuses a single existing text input without simulating a click',()=>{
    const input=new FakeInput();
    invoke(makeCell([input]),new FakeElement());
    expect(input.focus).toHaveBeenCalledOnce();
  });
});
