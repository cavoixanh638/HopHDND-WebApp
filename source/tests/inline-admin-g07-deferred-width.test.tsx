import {beforeEach,describe,expect,it,vi} from 'vitest';
const hook=vi.hoisted(()=>({
  slots:[] as unknown[],index:0,
  reset(){this.slots=[];this.index=0;},
  begin(){this.index=0;},
  state<T>(initial:T):[T,(next:T)=>void]{
    const index=this.index++;
    if(!(index in this.slots))this.slots[index]=initial;
    return [this.slots[index] as T,(next:T)=>{this.slots[index]=next;}];
  },
  ref<T>(initial:T){const index=this.index++;if(!(index in this.slots))this.slots[index]={current:initial};return this.slots[index] as {current:T};}
}));
vi.mock('react',()=>({
  useState:<T,>(initial:T)=>hook.state(initial),
  useRef:<T,>(initial:T)=>hook.ref(initial),
  useEffect:(callback:()=>void)=>callback()
}));
import {InlineG07DeferredWidthInput,parseInlineG07Width} from '../src/components/inline-g07-DeferredWidthInput';

const findInput=(node:any):any=>{
  if(!node||typeof node!=='object')return null;
  if(node.type==='input')return node.props;
  const children=node.props?.children;
  for(const child of Array.isArray(children)?children:[children]){
    const match=findInput(child);if(match)return match;
  }
  return null;
};
const make=()=>{
  const onCommit=vi.fn();
  const render=(value=700)=>{
    hook.begin();
    return findInput(InlineG07DeferredWidthInput({
      id:'popup-width',label:'Độ rộng popup',min:640,max:2400,value,onCommit
    }));
  };
  return {render,onCommit};
};
const event=(value:string,key?:string)=>{
  const blur=vi.fn();
  return {key,currentTarget:{value,blur},preventDefault:vi.fn(),stopPropagation:vi.fn()};
};
beforeEach(()=>hook.reset());

describe('G07 opt-in DeferredWidthInput adapter',()=>{
  it('rejects blanks, decimals, exponent notation and out-of-range values',()=>{
    for(const raw of ['', ' ', '3.14', '1e3','-2','639','2401','12a','99999999999999999999'])
      expect(parseInlineG07Width(raw,640,2400)).toBeNull();
    expect(parseInlineG07Width(' 800 ',640,2400)).toBe(800);
    expect(parseInlineG07Width('640',640,2400)).toBe(640);
    expect(parseInlineG07Width('2400',640,2400)).toBe(2400);
  });
  it('does not call the writer on keystrokes; Enter followed by blur saves only once',()=>{
    const a=make();
    let input=a.render();
    input.onFocus();
    input.onChange({currentTarget:{value:'8'}});
    input.onChange({currentTarget:{value:'850'}});
    expect(a.onCommit).not.toHaveBeenCalled();
    input=a.render();
    expect(input.value).toBe('850'); // Parent rerender must preserve the draft.
    const enter=event('850','Enter');
    input.onKeyDown(enter);
    input.onBlur(event('850'));
    expect(a.onCommit).toHaveBeenCalledTimes(1);
    expect(a.onCommit).toHaveBeenCalledWith(850);
  });
  it('Escape cancels the draft without a late blur commit',()=>{
    const a=make();
    const input=a.render();
    input.onFocus();
    input.onChange({currentTarget:{value:'1400'}});
    input.onKeyDown(event('1400','Escape'));
    input.onBlur(event('1400'));
    expect(a.onCommit).not.toHaveBeenCalled();
    expect(a.render().value).toBe('700');
  });
  it('blur commits valid values, invalid input preserves old width',()=>{
    const a=make();
    let input=a.render();
    input.onFocus();
    input.onBlur(event('1300'));
    expect(a.onCommit).toHaveBeenCalledWith(1300);
    input=a.render(1300);
    input.onFocus();
    input.onBlur(event('1e3'));
    expect(a.onCommit).toHaveBeenCalledTimes(1);
  });
});
