import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {DEFAULT_SHEET_URL,parseSheetConfig,saveSheetConfig} from '../src/data/sheet-config';
import {mayEdit} from '../src/data/firebase-repository';
import type {FirebaseController} from '../src/state/use-firebase';
const h=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];
  const memo=(fn:any,deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))slots[i]={deps,value:fn()};return slots[i].value;};
  return {common:vi.fn(),
    state:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    ref:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});},memo,
    effect:(fn:any,deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
    begin:()=>{cursor=0;},flush:()=>{const work=effects;effects=[];work.forEach(fn=>fn());},dispose:()=>slots.forEach(slot=>slot?.cleanup?.()),reset:()=>{slots.length=0;cursor=0;effects=[];},
  };
});
vi.mock('react',()=>({useState:h.state,useRef:h.ref,useMemo:h.memo,useEffect:h.effect,useCallback:(fn:any,deps:any[])=>h.memo(()=>fn,deps)}));
vi.mock('../src/state/use-shared-config',()=>({useSharedConfig:h.common}));
vi.mock('../src/data/google-bridge',()=>({isGoogleHost:()=>false,googleCall:vi.fn()}));
import {App} from '../src/app/App';
import {ItemList} from '../src/features/items/ItemList';
import {ReportSettings} from '../src/features/settings/ReportSettings';
import {CatalogSettings} from '../src/features/catalogs/CatalogSettings';
import {ConnectionPanel} from '../src/features/settings/ConnectionPanel';
import {ExcelTransferPanel} from '../src/features/settings/ExcelTransferPanel';
function nodes(v:any):any[]{return Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?text(v.props?.children):typeof v==='string'?v:'';}
const payload=(note='Nguồn Sheets')=>({status:'ok',table:{cols:Array.from({length:16},()=>({})),rows:[{c:[null,null,{v:'Nội dung trình'},{v:'Sở, ngành'}]},{c:['NQ01',1,'Nội dung giả','Sở giả','QPPL','','','','','CV giả','Phòng giả','LĐ VP','LĐ UBND','',note,false].map(v=>({v}))}]}});
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
let scripts:any[],firebase:FirebaseController;
function render(){h.begin();const tree=App({firebase,TransferPanel:ExcelTransferPanel});h.flush();return tree;}
function button(tree:any,label:string){const result=nodes(tree).find(n=>n.type==='button'&&text(n)===label);expect(result,`button ${label}`).toBeDefined();return result;}
function open(label:string){button(render(),label).props.onClick({currentTarget:{closest:()=>null}});return render();}
function respond(note?:string){const script=scripts.at(-1),name=new URL(script.src).searchParams.get('tqx')!.split('responseHandler:')[1];(window as any)[name](payload(note));}
beforeEach(()=>{
  h.reset();vi.useFakeTimers();scripts=[];
  vi.stubGlobal('window',{setTimeout:globalThis.setTimeout,setInterval:globalThis.setInterval,addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn(),head:{append:(s:any)=>scripts.push(s)},createElement:()=>({src:'',remove:vi.fn()})});
  const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
  h.common.mockReturnValue({config:null,status:'disabled',busy:false,message:'',refresh:vi.fn(),save:vi.fn()});
  firebase={ready:true,user:{isAnonymous:true,uid:'guest'},isAdmin:false,connected:true,permissions:{columns:{note:true}},profile:null,emulator:true,canEdit:(id:string,field:Parameters<typeof mayEdit>[2])=>mayEdit(firebase.permissions,id,field,firebase.isAdmin),common:{config:null,status:'ready',busy:false,message:'Firebase configuration',refresh:vi.fn(),save:vi.fn().mockResolvedValue(undefined)},savePermissions:vi.fn(),login:vi.fn(),logout:vi.fn()} as unknown as FirebaseController;
});
afterEach(()=>{h.dispose();vi.useRealTimers();vi.unstubAllGlobals();});
describe('Pages integrates Sheets content with Firebase administration',()=>{
  it('reads real GViz parser output with default URL/gid even while Firebase auth/config is unavailable',async()=>{
    firebase.ready=false;firebase.connected=false;firebase.error='Auth unavailable';
    render();expect(scripts).toHaveLength(1);const url=new URL(scripts[0].src);expect(url.pathname).toContain(parseSheetConfig(DEFAULT_SHEET_URL).spreadsheetId);expect(url.searchParams.get('gid')).toBe('60961344');expect(url.searchParams.get('range')).toBe('A:P');
    respond();await settle();const tree=open('Danh sách nội dung'),list=nodes(tree).find(n=>n.type===ItemList);
    expect(list.props.items).toHaveLength(1);expect(list.props.items[0].note).toBe('Nguồn Sheets');expect(list.props.readOnly).toBe(true);expect(list.props.sourceKind).toBe('google');expect(h.common.mock.calls.at(-1)?.[1]).toBe(false);
  });
  it('honors stored Sheets URL/gid and refreshes manually and every 60 seconds, only while visible',async()=>{
    saveSheetConfig(parseSheetConfig('https://docs.google.com/spreadsheets/d/fake-sheet/edit?gid=42'));
    render();expect(new URL(scripts[0].src).searchParams.get('gid')).toBe('42');respond();await settle();render();
    button(render(),'Đọc lại dữ liệu Sheets và cấu hình').props.onClick();expect(scripts).toHaveLength(2);expect(firebase.common.refresh).toHaveBeenCalledOnce();respond('Sau đọc lại');await settle();render();
    await vi.advanceTimersByTimeAsync(60000);expect(scripts).toHaveLength(3);respond('Sau polling');await settle();render();
    (document as any).hidden=true;await vi.advanceTimersByTimeAsync(60000);expect(scripts).toHaveLength(3);
    const list=nodes(open('Danh sách nội dung')).find(n=>n.type===ItemList);expect(list.props.items[0].note).toBe('Sau polling');
  });
  it('allows guest drafts only in granted cells, retains them and never saves content or common configuration',async()=>{
    render();respond();await settle();let list=nodes(open('Vào chế độ tùy chỉnh danh sách')).find(n=>n.type===ItemList);const id=list.props.items[0].recordId;
    expect(list.props.allowLayout).toBe(false);expect(list.props.canEditCell(id,'note')).toBe(true);expect(list.props.canEditCell(id,'content')).toBe(false);
    list.props.onUpdate(id,{content:'forbidden'});list=nodes(render()).find(n=>n.type===ItemList);expect(list.props.drafts).toEqual({});
    list.props.onUpdate(id,{note:'Nháp thử'});list=nodes(render()).find(n=>n.type===ItemList);expect(list.props.items[0].note).toBe('Nháp thử');
    await vi.advanceTimersByTimeAsync(120000);render();expect(scripts).toHaveLength(1);expect(firebase.common.save).not.toHaveBeenCalled();
    expect(list.props.onKeepDraft()).toBe(true);await expect(list.props.onSaveData()).resolves.toBe(false);expect(firebase.common.save).not.toHaveBeenCalled();
    await expect(list.props.onPersistLayout(list.props.initialLayout)).rejects.toThrow();
  });
  it('keeps list customization available with an empty GViz sheet and embeds admin permissions in the list',async()=>{
    render();
    const script=scripts.at(-1),name=new URL(script.src).searchParams.get('tqx')!.split('responseHandler:')[1];
    (window as any)[name]({status:'ok',table:{cols:Array.from({length:16},()=>({})),rows:[{c:[null,null,{v:'Nội dung trình'},{v:'Sở, ngành'}]}]}});
    await settle();render();
    expect(button(render(),'Vào chế độ tùy chỉnh danh sách').props.disabled).toBe(false);
    let list=nodes(open('Vào chế độ tùy chỉnh danh sách')).find(n=>n.type===ItemList);
    expect(list.props.items).toHaveLength(0);
    expect(list.props.permissions).toBeUndefined();
    list.props.onClose();firebase.isAdmin=true;
    list=nodes(open('Vào chế độ tùy chỉnh danh sách')).find(n=>n.type===ItemList);
    expect(list.props.permissions).toEqual(firebase.permissions);
    expect(list.props.onSavePermissions).toBe(firebase.savePermissions);
  });
  it('keeps the last Sheets snapshot when a subsequent GViz read fails',async()=>{
    render();respond();await settle();render();button(render(),'Đọc lại dữ liệu Sheets và cấu hình').props.onClick();scripts.at(-1).onerror();await settle();
    const tree=open('Danh sách nội dung'),list=nodes(tree).find(n=>n.type===ItemList);expect(list.props.items[0].note).toBe('Nguồn Sheets');expect(text(tree)).toContain('Bản đọc trước được giữ');
  });
  it('uses the same Firebase save path for reports, catalogs and item layout after switching to Sheets',async()=>{
    firebase.isAdmin=true;render();respond();await settle();
    let tree=open('Vào chế độ tùy chỉnh bảng báo cáo');let panel=nodes(tree).find(n=>n.type===ReportSettings);await panel.props.onSave(panel.props.initial);expect(firebase.common.save).toHaveBeenLastCalledWith('all',expect.any(Object),0);panel.props.onClose();
    tree=open('Danh mục và quan hệ chuyên viên – phòng');panel=nodes(tree).find(n=>n.type===CatalogSettings);await panel.props.onSave(panel.props.config);expect(firebase.common.save).toHaveBeenLastCalledWith('all',expect.any(Object),0);panel.props.onClose();
    tree=open('Vào chế độ tùy chỉnh danh sách');panel=nodes(tree).find(n=>n.type===ItemList);await panel.props.onPersistLayout(panel.props.initialLayout);expect(firebase.common.save).toHaveBeenLastCalledWith('items',panel.props.initialLayout,0);
  });
  it('keeps Excel content import blocked and selecting another Sheets source read-only',async()=>{
    firebase.isAdmin=true;render();respond();await settle();const tree=open('Nhập / Xuất Excel'),panel=nodes(tree).find(n=>n.type===ExcelTransferPanel);expect(panel.props.importEnabled).toBe(false);await expect(panel.props.onImport([])).rejects.toThrow('chuyển đổi');panel.props.onClose();
    const source=nodes(open('Kết nối dữ liệu Google Sheets')).find(n=>n.type===ConnectionPanel);const pending=source.props.onConnect(parseSheetConfig('https://docs.google.com/spreadsheets/d/another-fake/edit?gid=9'));respond();await pending;await settle();render();await settle();source.props.onClose();
    const list=nodes(open('Danh sách nội dung')).find(n=>n.type===ItemList);expect(list.props.sourceKind).toBe('google');expect(list.props.readOnly).toBe(true);expect(list.props.items[0].recordId).toContain('another-fake:9');
  });
});
