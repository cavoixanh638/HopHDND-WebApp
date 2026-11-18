import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {defaultStatusPalette,defaultStatusPaletteStore,loadStatusPaletteStore,
  saveStatusPaletteStore,MAX_STATUS_PALETTES,type StatusPaletteStore} from '../src/data/status-palettes';

const hooks=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;
  return {
    reset:()=>{slots.length=0;cursor=0;},begin:()=>{cursor=0;},
    useState:(seed:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof seed==='function'?seed():seed;
      return [slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    useRef:(seed:any)=>{const i=cursor++;if(!(i in slots))slots[i]={current:seed};return slots[i];},
  };
});
vi.mock('react',()=>({useState:hooks.useState,useRef:hooks.useRef,useId:()=> 'g06-fixture',useEffect:()=>{}}));
import {StatusPaletteManager,inlineG06PreviewPalette} from '../src/features/items/StatusPaletteManager';

const nodes=(x:any):any[]=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
const matching=(tree:any,type:string,attr:string,value:string)=>nodes(tree).find(n=>n.type===type&&n.props?.[attr]===value);
const quick=(tree:any)=>matching(tree,'div','aria-label','Tô màu trạng thái nhanh');
const field=(tree:any,label:string)=>matching(quick(tree),'input','aria-label',label);
const textOf=(x:any):string=>typeof x==='string'?x:Array.isArray(x)?x.map(textOf).join(''):x?.props?textOf(x.props.children):'';
const button=(tree:any,label:string)=>nodes(tree).find(n=>n.type==='button'&&
  (n.props?.['aria-label']===label||textOf(n).trim()===label));

let current:StatusPaletteStore;
let writes:number;
let local:ReturnType<typeof localStorageMock>;
function localStorageMock(){const cache=new Map<string,string>();return {
  cache,getItem:(k:string)=>cache.get(k)??null,setItem:(k:string,v:string)=>{cache.set(k,v);},removeItem:(k:string)=>{cache.delete(k);}};}
const storeUpdate=(next:StatusPaletteStore)=>{writes++;if(!saveStatusPaletteStore('g06-source',next))return false;current=next;return true;};
const render=()=>{hooks.begin();return StatusPaletteManager({store:current,onStoreChange:storeUpdate});};
const open=()=>{button(render(),'🎨 Bộ màu trạng thái')!.props.onClick();return render();};

beforeEach(()=>{hooks.reset();current=defaultStatusPaletteStore();writes=0;local=localStorageMock();
  vi.stubGlobal('localStorage',local);vi.stubGlobal('location',{pathname:'/HopHDND-WebApp/'});});
afterEach(()=>vi.unstubAllGlobals());

describe('G06 palette quick popover and local draft boundary',()=>{
  it('previews HEX without persisting per keystroke and commits only on blur',()=>{
    let tree=open();
    expect(matching(tree,'div','popover','auto')).toBeDefined();
    expect(button(tree,'🎨 Bộ màu trạng thái')!.props['aria-expanded']).toBe(true);
    field(tree,'Mã màu chữ Sở chưa trình')!.props.onChange({currentTarget:{value:'#a1b2c3'}});
    tree=render();
    expect(field(tree,'Mã màu chữ Sở chưa trình')!.props.value).toBe('#a1b2c3');
    const preview=nodes(quick(tree)).find(n=>n.type==='span'&&String(n.props?.className).includes('inline-g06-preview'));
    expect(preview.props.style.color).toBe('#A1B2C3');
    expect(current.active['not-submitted'].text).toBe('#B14052');
    expect(writes).toBe(0);expect(local.cache.size).toBe(0);
    field(tree,'Mã màu chữ Sở chưa trình')!.props.onBlur();
    expect(current.active['not-submitted'].text).toBe('#A1B2C3');
    expect(loadStatusPaletteStore('g06-source').active['not-submitted'].text).toBe('#A1B2C3');
    expect(writes).toBe(1);
  });
  it('rolls back an invalid HEX and preserves original colors',()=>{
    let tree=open();
    field(tree,'Mã màu nền Sở chưa trình')!.props.onChange({currentTarget:{value:'#GGGGGG'}});
    tree=render();
    expect(field(tree,'Mã màu nền Sở chưa trình')!.props['aria-invalid']).toBe(true);
    expect(nodes(quick(tree)).some(n=>String(n.props?.className).includes('inline-g06-invalid'))).toBe(true);
    field(tree,'Mã màu nền Sở chưa trình')!.props.onBlur();
    expect(writes).toBe(0);expect(current.active['not-submitted'].background).toBe('#FFF1F3');
    expect(field(render(),'Mã màu nền Sở chưa trình')!.props.value).toBe('#FFF1F3');
  });
  it('Escape cancels draft, Enter commits exactly once without status patch',()=>{
    let tree=open();
    field(tree,'Mã màu chữ Sở chưa trình')!.props.onChange({currentTarget:{value:'#123456'}});
    tree=render();
    const stop=vi.fn(),prevent=vi.fn();
    field(tree,'Mã màu chữ Sở chưa trình')!.props.onKeyDown({key:'Escape',stopPropagation:stop,preventDefault:prevent});
    field(tree,'Mã màu chữ Sở chưa trình')!.props.onBlur();
    expect(stop).toHaveBeenCalledOnce();expect(prevent).toHaveBeenCalledOnce();expect(writes).toBe(0);
    field(render(),'Mã màu chữ Sở chưa trình')!.props.onChange({currentTarget:{value:'#aabbcc'}});
    tree=render();
    field(tree,'Mã màu chữ Sở chưa trình')!.props.onKeyDown({key:'Enter',stopPropagation:stop,preventDefault:prevent});
    field(tree,'Mã màu chữ Sở chưa trình')!.props.onBlur();
    expect(writes).toBe(1);expect(current.active['not-submitted'].text).toBe('#AABBCC');
    expect(Object.keys(current)).toEqual(['version','active','activePresetId','presets']);
  });
  it('keeps four status meanings, opt-in other, group reset and full reset',()=>{
    let tree=open();
    const choices=nodes(quick(tree)).filter(n=>n.type==='button'&&typeof n.props?.['aria-pressed']==='boolean');
    expect(choices).toHaveLength(4);
    expect(choices.map(n=>textOf(n))).toEqual(['Sở chưa trình','VP đang xử lý','Hoàn thành theo khâu','Trạng thái khác']);
    choices[3].props.onClick();tree=render();
    expect(field(tree,'Mã màu nền Trạng thái khác')).toBeDefined();
    nodes(quick(tree)).find(n=>n.type==='input'&&n.props.type==='checkbox')!.props.onChange({currentTarget:{checked:true}});
    expect(current.active.otherEnabled).toBe(true);
    field(render(),'Mã màu nền Trạng thái khác')!.props.onChange({currentTarget:{value:'#ffeedd'}});
    field(render(),'Mã màu nền Trạng thái khác')!.props.onBlur();
    expect(current.active.other.background).toBe('#FFEEDD');
    button(render(),'Đặt lại nhóm')!.props.onClick();
    expect(current.active.otherEnabled).toBe(false);
    expect(current.active.other.background).toBe(defaultStatusPalette().other.background);
    button(render(),'Mặc định V5')!.props.onClick();
    expect(current.active).toEqual(defaultStatusPalette());
  });
  it('selects, updates and deletes presets; keeps 20-preset ceiling',()=>{
    current={...current,presets:[{id:'red',name:'Bộ đỏ',colors:{...current.active,
      done:{text:'#BB0011',background:'#FFFFFF'}}}],activePresetId:''};
    let tree=open();
    matching(quick(tree),'select','aria-label','Chọn bộ màu nhanh')!.props.onChange({currentTarget:{value:'red'}});
    expect(current.active.done.text).toBe('#BB0011');
    button(render(),'Quản lý bộ màu…')!.props.onClick();
    tree=render();
    const modal=nodes(tree).find(n=>n.props?.title==='Bộ màu trạng thái · Bảng dữ liệu & popup');
    expect(modal).toBeDefined();
    button(modal,'Xóa bộ đã chọn')!.props.onClick();expect(current.presets).toHaveLength(1);
    button(render(),'Xác nhận xóa bộ màu')!.props.onClick();
    expect(current.presets).toHaveLength(0);expect(current.active.done.text).toBe('#BB0011');
    current={...current,presets:Array.from({length:MAX_STATUS_PALETTES},(_,i)=>({
      id:'p'+i,name:'Bộ '+i,colors:defaultStatusPalette()}))};
    expect(button(render(),'Lưu bộ mới')!.props.disabled).toBe(true);
    expect(current.presets).toHaveLength(20);
  });
  it('previews only valid draft swatches without mutating active or otherEnabled',()=>{
    const draft=inlineG06PreviewPalette(current.active,{'office.text':'#fedcba','done.background':'broken'});
    expect(draft.office.text).toBe('#FEDCBA');
    expect(draft.done.background).toBe(current.active.done.background);
    expect(current.active.office.text).toBe('#80531F');
    expect(draft.otherEnabled).toBe(false);
  });
});
