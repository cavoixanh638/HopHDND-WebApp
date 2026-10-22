import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {DEFAULT_SHEET_URL,parseSheetConfig,saveSheetConfig} from '../src/data/sheet-config';
import {mayEdit} from '../src/data/firebase-repository';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultReportLayout,withReportPageWidth,reportPageWidth} from '../src/data/report-preferences';
import {catalogFromItems} from '../src/data/catalogs';
import {createDemoItems} from '../src/data/demo-items';
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
vi.mock('react',()=>({memo:(component:any)=>component,useState:h.state,useRef:h.ref,useMemo:h.memo,useEffect:h.effect,useCallback:(fn:any,deps:any[])=>h.memo(()=>fn,deps)}));
vi.mock('../src/state/use-shared-config',()=>({useSharedConfig:h.common}));
vi.mock('../src/data/google-bridge',()=>({isGoogleHost:()=>false,googleCall:vi.fn()}));
import {App} from '../src/app/App';
import {ItemList} from '../src/features/items/ItemList';
import {ReportSettings} from '../src/features/settings/ReportSettings';
import {CatalogSettings} from '../src/features/catalogs/CatalogSettings';
import {ConnectionPanel} from '../src/features/settings/ConnectionPanel';
import {FirebasePanel} from '../src/features/settings/FirebasePanel';
import {ExcelTransferPanel} from '../src/features/settings/ExcelTransferPanel';
function nodes(v:any):any[]{return Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?text(v.props?.children):typeof v==='string'?v:'';}
const payload=(note='Nguồn Sheets')=>({status:'ok',table:{cols:Array.from({length:16},()=>({})),rows:[{c:[null,null,{v:'Nội dung trình'},{v:'Sở, ngành'}]},{c:['NQ01',1,'Nội dung giả','Sở giả','QPPL','','','','','CV giả','Phòng giả','LĐ VP','LĐ UBND','',note,false].map(v=>({v}))}]}});
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
let scripts:any[],firebase:FirebaseController;
function render(){h.begin();const tree=App({firebase,TransferPanel:ExcelTransferPanel});h.flush();return tree;}
function button(tree:any,label:string){const result=nodes(tree).find(n=>n.type==='button'&&
  (text(n)===label||nodes(n).some(child=>child.props?.className==='section-card-title'&&text(child)===label)));
  expect(result,`button ${label}`).toBeDefined();return result;}
function open(label:string){button(render(),label).props.onClick({currentTarget:{closest:()=>null}});return render();}
function respond(note?:string){const script=scripts.at(-1),name=new URL(script.src).searchParams.get('tqx')!.split('responseHandler:')[1];(window as any)[name](payload(note));}
beforeEach(()=>{
  h.reset();vi.useFakeTimers();scripts=[];
  vi.stubGlobal('window',{setTimeout:globalThis.setTimeout,setInterval:globalThis.setInterval,addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn(),head:{append:(s:any)=>scripts.push(s)},createElement:()=>({src:'',remove:vi.fn()})});
  const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
  h.common.mockReturnValue({config:null,status:'disabled',busy:false,message:'',refresh:vi.fn(),save:vi.fn()});
  firebase={ready:true,user:{isAnonymous:true,uid:'guest'},isAdmin:false,connected:true,permissions:{columns:{note:true}},profile:null,emulator:true,canEdit:(id:string,field:Parameters<typeof mayEdit>[2])=>mayEdit(firebase.permissions,id,field,firebase.isAdmin),common:{config:null,status:'ready',busy:false,message:'Firebase configuration',refresh:vi.fn(),save:vi.fn().mockResolvedValue({revision:1})},savePermissions:vi.fn(),login:vi.fn(),logout:vi.fn()} as unknown as FirebaseController;
});
afterEach(()=>{h.dispose();vi.useRealTimers();vi.unstubAllGlobals();});
describe('Pages integrates Sheets content with Firebase administration',()=>{
  it('continues fetching Sheets but never paints an unsaved fallback layout while Firebase is unavailable',async()=>{
    firebase.ready=false;firebase.connected=false;firebase.error='Auth unavailable';
    render();expect(scripts).toHaveLength(1);const url=new URL(scripts[0].src);expect(url.pathname).toContain(parseSheetConfig(DEFAULT_SHEET_URL).spreadsheetId);expect(url.searchParams.get('gid')).toBe('60961344');expect(url.searchParams.get('range')).toBe('A:O');
    respond();await settle();const tree=open('Danh sách các ND trình HĐND');
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(false);
    expect(text(tree)).toContain('Chưa đọc được bố cục đã lưu từ Firebase');
    expect(h.common.mock.calls.at(-1)?.[1]).toBe(false);
  });
  it('uses the saved Firebase page widths on the first visible frame, not a post-paint child effect',async()=>{
    const columns=defaultItemLayout();
    columns.frameWidth=1090;
    firebase.common.config={revision:3,catalogs:catalogFromItems(createDemoItems(1)),
      reports:withReportPageWidth(defaultReportLayout(),1240),items:columns};
    firebase.common.status='loading';
    let tree=render();
    // A confirmed matching profile must remain visible during background fetch.
    expect(text(tree)).not.toContain('Đang tải bố cục đã lưu');
    expect(tree.props.style['--page-content-width']).toBe('1240px');
    firebase.common.status='ready';
    respond();await settle();
    tree=render();expect(tree.props.style['--page-content-width']).toBe('1240px');
    tree=open('Danh sách các ND trình HĐND');
    expect(tree.props.style['--page-content-width']).toBe('1090px');
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(true);
  });
  it('keeps last confirmed report width on the very first loading render, before Firebase has responded',async()=>{
    const source='pages:sheets:'+parseSheetConfig(DEFAULT_SHEET_URL).url;
    localStorage.setItem('hdnd.confirmed-widths.v1:'+source,
      JSON.stringify({schema:1,source,report:1380,list:970}));
    firebase.common.status='loading';firebase.common.config=null;
    let tree=render();
    expect(tree.props.style['--page-content-width']).toBe('1380px');
    expect(text(tree)).toContain('Đang tải bố cục đã lưu');
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(false);
    tree=open('Danh sách các ND trình HĐND');
    expect(tree.props.style['--page-content-width']).toBe('970px');
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(false);
  });
  it('uses a compact loading shell without cache, then stores only confirmed Firebase widths',async()=>{
    firebase.common.status='loading';
    let tree=render();
    expect(tree.props.style['--page-content-width']).toBe('1120px');
    const cols=defaultItemLayout();cols.frameWidth=960;
    firebase.common.config={revision:7,reports:withReportPageWidth(defaultReportLayout(),1320),
      items:cols,catalogs:catalogFromItems(createDemoItems(1))};
    firebase.common.status='ready';
    tree=render();
    expect(tree.props.style['--page-content-width']).toBe('1320px');
    const source='pages:sheets:'+parseSheetConfig(DEFAULT_SHEET_URL).url;
    expect(JSON.parse(localStorage.getItem('hdnd.confirmed-widths.v1:'+source)??'null'))
      .toMatchObject({report:1320,list:960,schema:1});
  });
  it('keeps Account settings on the same compact frame even before profile loading finishes',async()=>{
    firebase.user={isAnonymous:false,uid:'admin',email:'admin@example.com'} as FirebaseController['user'];
    firebase.isAdmin=true;
    firebase.common.status='loading';
    let tree=open('Tài khoản và dữ liệu');
    expect(tree.props.className).toContain('settings-page');
    expect(tree.props.style['--page-content-width']).toBe('1100px');
    expect(nodes(tree).some(n=>n.type===FirebasePanel)).toBe(true);
    expect(text(tree)).not.toContain('Đang tải bố cục đã lưu');
    firebase.common.status='ready';
    tree=render();
    expect(tree.props.style['--page-content-width']).toBe('1100px');
  });
  it('honors stored Sheets URL/gid and refreshes manually and every 60 seconds, only while visible',async()=>{
    saveSheetConfig(parseSheetConfig('https://docs.google.com/spreadsheets/d/fake-sheet/edit?gid=42'));
    render();expect(new URL(scripts[0].src).searchParams.get('gid')).toBe('42');respond();await settle();render();
    button(render(),'Đăng nhập').props.onClick();
    button(render(),'Làm mới dữ liệu').props.onClick();expect(scripts).toHaveLength(2);expect(firebase.common.refresh).toHaveBeenCalledOnce();respond('Sau đọc lại');await settle();render();
    await vi.advanceTimersByTimeAsync(60000);expect(scripts).toHaveLength(3);respond('Sau polling');await settle();render();
    (document as any).hidden=true;await vi.advanceTimersByTimeAsync(60000);expect(scripts).toHaveLength(3);
    const list=nodes(open('Danh sách các ND trình HĐND')).find(n=>n.type===ItemList);expect(list.props.items[0].note).toBe('Sau polling');
  });
  it('keeps the same mounted list and report rows during unchanged 60-second polls',async()=>{
    render();respond();await settle();render();
    let tree=open('Danh sách các ND trình HĐND');
    let list=nodes(tree).find(n=>n.type===ItemList);
    const original=list.props.items;
    expect(original).toHaveLength(1);
    expect(list.props.busy).toBe(false);
    await vi.advanceTimersByTimeAsync(60000);
    // Request is still in flight: the table must remain visible and interactive.
    tree=render();list=nodes(tree).find(n=>n.type===ItemList);
    expect(list.props.items).toBe(original);
    expect(list.props.busy).toBe(false);
    expect(text(tree)).not.toContain('Đang tải bố cục đã lưu');
    respond();await settle();
    tree=render();list=nodes(tree).find(n=>n.type===ItemList);
    expect(list.props.items).toBe(original);
    expect(list.props.busy).toBe(false);
    // A genuine source change is applied once without first clearing the rows.
    await vi.advanceTimersByTimeAsync(60000);
    expect(nodes(render()).find(n=>n.type===ItemList).props.items).toBe(original);
    respond('Nguồn đã đổi');await settle();
    tree=render();list=nodes(tree).find(n=>n.type===ItemList);
    expect(list.props.items).not.toBe(original);
    expect(list.props.items[0].note).toBe('Nguồn đã đổi');
  });
  it('keeps previously confirmed Firebase layout visible when refreshing or temporarily unavailable',async()=>{
    const columns=defaultItemLayout();columns.frameWidth=1050;
    firebase.common.config={revision:4,catalogs:catalogFromItems(createDemoItems(1)),
      items:columns,reports:withReportPageWidth(defaultReportLayout(),1260)};
    firebase.common.status='ready';
    render();respond();await settle();
    let tree=open('Danh sách các ND trình HĐND');
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(true);
    firebase.common.status='loading';
    tree=render();
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(true);
    expect(tree.props.style['--page-content-width']).toBe('1050px');
    firebase.common.status='error';firebase.error='Temporary network failure';
    tree=render();
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(true);
    expect(text(tree)).not.toContain('Chưa đọc được bố cục đã lưu từ Firebase');
  });
  it('exposes only relevant anonymous browsing and a permitted edit entry, with no technical Firebase details',async()=>{
    render();respond();await settle();const tree=open('Danh sách các ND trình HĐND');
    expect(button(tree,'Đăng nhập')).toBeDefined();
    expect(nodes(tree).some(n=>n.type==='button'&&text(n)==='Sửa thử nội dung')).toBe(false);
    expect(nodes(tree).some(n=>n.type==='details'&&n.props.className==='options-menu')).toBe(false);
    expect(nodes(tree).some(n=>n.type==='span'&&n.props.className==='version')).toBe(true);
    expect(nodes(tree).some(n=>n.props?.className==='demo-banner')).toBe(false);
    expect(nodes(tree).some(n=>n.props?.className==='brand')).toBe(false);
    expect(nodes(tree).filter(n=>n.type==='button'&&String(n.props.className).includes('primary-section-card'))).toHaveLength(2);
    expect(text(tree)).not.toContain('GID');
    expect(text(tree)).not.toContain('Danh mục và bố trí:');
    const list=nodes(tree).find(n=>n.type===ItemList);
    expect(list.props.anonymousViewer).toBe(true);
  });
  it('permits only granted columns in admin view while retaining full admin editing controls in customize mode',async()=>{
    firebase.isAdmin=true;
    firebase.user={isAnonymous:false,uid:'admin',email:'cavoixanh638@gmail.com'} as FirebaseController['user'];
    firebase.permissions={columns:{content:false,note:true,progressParty:true}};
    render();respond();await settle();
    const list=nodes(open('Danh sách các ND trình HĐND')).find(n=>n.type===ItemList);
    const id=list.props.items[0].recordId;
    expect(list.props.anonymousViewer).toBe(false);
    expect(list.props.customizing).toBe(false);
    expect(list.props.canEditCell(id,'note')).toBe(true);
    expect(list.props.canEditCell(id,'progressParty')).toBe(true);
    expect(list.props.canEditCell(id,'content')).toBe(false);
    const editList=nodes(open('Chỉnh sửa')).find(n=>n.type===ItemList);
    expect(editList.props.customizing).toBe(true);
    expect(editList.props.canEditCell(id,'content')).toBe(true);
  });
  it('uses the same granted-cell checks for signed-in non-admin viewers',async()=>{
    firebase.isAdmin=false;
    firebase.user={isAnonymous:false,uid:'member',email:'member@example.com'} as FirebaseController['user'];
    firebase.permissions={columns:{content:false,note:true}};
    render();respond();await settle();
    const list=nodes(open('Danh sách các ND trình HĐND')).find(n=>n.type===ItemList);
    const id=list.props.items[0].recordId;
    expect(list.props.anonymousViewer).toBe(false);
    expect(list.props.customizing).toBe(false);
    expect(list.props.canEditCell(id,'note')).toBe(true);
    expect(list.props.canEditCell(id,'content')).toBe(false);
  });
  it('allows guest drafts only in granted cells, retains them and never saves content or common configuration',async()=>{
    render();respond();await settle();let list=nodes(open('Danh sách các ND trình HĐND')).find(n=>n.type===ItemList);const id=list.props.items[0].recordId;
    expect(list.props.allowLayout).toBe(false);expect(list.props.canEditCell(id,'note')).toBe(true);expect(list.props.canEditCell(id,'content')).toBe(false);
    list.props.onUpdate(id,{content:'forbidden'});list=nodes(render()).find(n=>n.type===ItemList);expect(list.props.drafts).toEqual({});
    list.props.onUpdate(id,{note:'Nháp thử'});list=nodes(render()).find(n=>n.type===ItemList);expect(list.props.items[0].note).toBe('Nháp thử');
    await vi.advanceTimersByTimeAsync(120000);render();expect(scripts).toHaveLength(1);expect(firebase.common.save).not.toHaveBeenCalled();
    expect(list.props.onKeepDraft()).toBe(true);await expect(list.props.onSaveData()).resolves.toBe(false);expect(firebase.common.save).not.toHaveBeenCalled();
    await expect(list.props.onPersistLayout(list.props.initialLayout)).rejects.toThrow();
  });
  it('hides anonymous edit controls on empty Sheets while keeping admin permissions accessible',async()=>{
    render();
    const script=scripts.at(-1),name=new URL(script.src).searchParams.get('tqx')!.split('responseHandler:')[1];
    (window as any)[name]({status:'ok',table:{cols:Array.from({length:16},()=>({})),rows:[{c:[null,null,{v:'Nội dung trình'},{v:'Sở, ngành'}]}]}});
    await settle();render();
    expect(nodes(render()).some(n=>n.type==='button'&&text(n)==='Sửa thử nội dung')).toBe(false);
    expect(nodes(render()).some(n=>n.type==='button'&&text(n)==='Đăng nhập')).toBe(true);
    firebase.isAdmin=true;
    let list=nodes(open('Chỉnh sửa')).find(n=>n.type===ItemList);
    expect(list.props.items).toHaveLength(0);
    expect(list.props.permissions).toEqual(firebase.permissions);
    expect(list.props.onSavePermissions).toBe(firebase.savePermissions);
  });
  it('keeps the last Sheets snapshot when a subsequent GViz read fails',async()=>{
    render();respond();await settle();render();button(render(),'Đăng nhập').props.onClick();button(render(),'Làm mới dữ liệu').props.onClick();scripts.at(-1).onerror();await settle();
    const tree=open('Danh sách các ND trình HĐND'),list=nodes(tree).find(n=>n.type===ItemList);expect(list.props.items[0].note).toBe('Nguồn Sheets');expect(text(tree)).toContain('Bản đọc trước được giữ');
  });
  it('uses the same Firebase save path for reports, catalogs and item layout after switching to Sheets',async()=>{
    firebase.isAdmin=true;render();respond();await settle();
    open('Chỉnh sửa');let tree=open('Bảng thống kê');let panel=nodes(tree).find(n=>n.type===ReportSettings);await panel.props.onSave(panel.props.initial);expect(firebase.common.save).toHaveBeenLastCalledWith('reports',panel.props.initial,0);panel.props.onClose();
    open('Chỉnh sửa');tree=render();panel=nodes(tree).find(n=>n.type===ItemList);await panel.props.onPersistCatalog(catalogFromItems(createDemoItems(2)));expect(vi.mocked(firebase.common.save).mock.calls.at(-1)?.[0]).toBe('catalogs');
    tree=open('Chỉnh sửa');panel=nodes(tree).find(n=>n.type===ItemList);await panel.props.onPersistLayout(panel.props.initialLayout);expect(firebase.common.save).toHaveBeenLastCalledWith('items',panel.props.initialLayout,0,panel.props.initialLayout);
  });
  it('saves only reports even if the displayed Sheets-augmented catalog contains invalid duplicate labels',async()=>{
    firebase.isAdmin=true;
    const config={
      revision:3,
      items:defaultItemLayout(),
      reports:defaultReportLayout(),
      catalogs:catalogFromItems(createDemoItems(2))
    };
    // A valid persisted catalog plus a source-derived label with extra whitespace
    // can make the transient merged catalog fail validation on an unrelated save.
    config.catalogs.options.department.push('Sở giả');
    firebase.common.config=config;
    const dirtySource={...payload()};
    const sourceCell=dirtySource.table.rows[1].c[3];
    if(!sourceCell)throw new Error('Missing synthetic department field');
    sourceCell.v='Sở giả ';
    render();
    const script=scripts.at(-1),name=new URL(script.src).searchParams.get('tqx')!.split('responseHandler:')[1];
    (window as any)[name](dirtySource);await settle();
    open('Chỉnh sửa');
    const panel=nodes(open('Bảng thống kê')).find(n=>n.type===ReportSettings);
    const next=withReportPageWidth(panel.props.initial,2450);
    await panel.props.onSave(next);
    expect(firebase.common.save).toHaveBeenLastCalledWith('reports',next,0);
    expect(vi.mocked(firebase.common.save).mock.calls.at(-1)?.[1]).not.toHaveProperty('catalogs');
    expect(firebase.common.config.catalogs).toEqual(config.catalogs);
  });
  it('previews unsaved report width immediately and restores persisted value on exit',async()=>{
    firebase.isAdmin=true;
    firebase.common.config={revision:1,items:{...defaultItemLayout(),frameWidth:900},
      reports:withReportPageWidth(defaultReportLayout(),1500),
      catalogs:catalogFromItems(createDemoItems(2))};
    render();respond();await settle();
    open('Chỉnh sửa');
    let tree=open('Bảng thống kê');
    expect(tree.props.style['--page-content-width']).toBe('1500px');
    const editor=nodes(tree).find(n=>n.type===ReportSettings);
    editor.props.onPreviewWidthChange(2700);
    tree=render();expect(tree.props.style['--page-content-width']).toBe('2700px');
    editor.props.onClose();
    tree=render();expect(tree.props.style['--page-content-width']).toBe('1500px');
    tree=open('Danh sách các ND trình HĐND');expect(tree.props.style['--page-content-width']).toBe('900px');
  });
  it('keeps independent 2400px report and 640px list content widths without moving the header',async()=>{
    firebase.isAdmin=true;
    firebase.common.config={
      revision:1,
      items:{...defaultItemLayout(),frameWidth:640},
      reports:withReportPageWidth(defaultReportLayout(),2400),
      catalogs:catalogFromItems(createDemoItems(2))
    };
    expect(reportPageWidth(firebase.common.config.reports)).toBe(2400);
    let tree=render();
    expect(tree.props.style['--page-content-width']).toBe('2400px');
    respond();await settle();
    tree=open('Danh sách các ND trình HĐND');
    expect(tree.props.style['--page-content-width']).toBe('640px');
    tree=open('Báo cáo tổng hợp');
    expect(tree.props.style['--page-content-width']).toBe('2400px');
    expect(nodes(tree).filter(n=>n.type==='button'&&text(n)==='Hướng dẫn')).toHaveLength(0);
    open('Chỉnh sửa');tree=open('Bảng thống kê');
    const panel=nodes(tree).find(n=>n.type===ReportSettings);
    expect(reportPageWidth(panel.props.initial)).toBe(2400);
    expect(tree.props.style['--page-content-width']).toBe('2400px');
  });
  it('provides one global View mode exit to every editor, while local saves remain in their own tabs',async()=>{
    firebase.isAdmin=true;render();respond();await settle();
    let tree=open('Chỉnh sửa');
    expect(nodes(tree).filter(n=>n.type==='button'&&text(n)==='Về chế độ xem')).toHaveLength(1);
    let list=nodes(tree).find(n=>n.type===ItemList);
    expect(typeof list.props.exitRequest).toBe('number');
    tree=open('Bảng thống kê');
    const report=nodes(tree).find(n=>n.type===ReportSettings);
    expect(typeof report.props.exitRequest).toBe('number');
    expect(nodes(tree).filter(n=>n.type==='button'&&text(n)==='Về chế độ xem')).toHaveLength(1);
    const before=report.props.exitRequest;
    button(tree,'Về chế độ xem').props.onClick();
    tree=render();
    expect(nodes(tree).find(n=>n.type===ReportSettings).props.exitRequest).toBe(before+1);
    tree=open('Danh sách dữ liệu');
    expect(nodes(tree).filter(n=>n.type==='button'&&text(n)==='Về chế độ xem')).toHaveLength(1);
    expect(typeof nodes(tree).find(n=>n.type===ItemList).props.onPersistCatalog).toBe('function');
    list=nodes(tree).find(n=>n.type===ItemList);
    expect(typeof list.props.exitRequest).toBe('number');
  });

  it('keeps all column choices and permission controls inside one manager instead of separate tabs',async()=>{
    firebase.isAdmin=true;render();respond();await settle();
    const tree=open('Chỉnh sửa');
    expect(nodes(tree).some(n=>n.props?.className==='settings-sub-tabs')).toBe(false);
    expect(nodes(tree).some(n=>n.props?.className==='settings-section')).toBe(false);
    const list=nodes(tree).find(n=>n.type===ItemList);
    expect(list.props.permissionModeOnly).toBe(false);
    expect(list.props.onPersistCatalog).toBeInstanceOf(Function);
    expect(list.props.onSavePermissions).toBe(firebase.savePermissions);
    expect(text(tree)).toContain('Quản lý cột');
    expect(nodes(tree).some(n=>n.type==='button'&&text(n)==='Giá trị lựa chọn')).toBe(false);
    expect(nodes(tree).some(n=>n.type==='button'&&text(n)==='Quyền chỉnh sửa')).toBe(false);
  });
  it('has exactly two compact settings menu choices and keeps the gear visible across sections',async()=>{
    firebase.isAdmin=true;render();respond();await settle();
    let tree=render();
    const menu=nodes(tree).find(n=>n.type==='details'&&n.props.className==='options-menu');
    expect(menu).toBeDefined();
    const popover=nodes(menu).find(n=>n.type==='div'&&n.props.className==='options-popover');
    expect(nodes(popover).filter(n=>n.type==='button').map(n=>text(n))).toEqual(['Chỉnh sửa','Tài khoản và dữ liệu']);
    expect(nodes(menu).filter(n=>n.type==='details')).toHaveLength(1);
    tree=open('Chỉnh sửa');
    expect(nodes(tree).some(n=>n.type===ItemList&&n.props.customizing===true)).toBe(true);
    expect(nodes(tree).some(n=>n.type==='details'&&n.props.className==='options-menu')).toBe(true);
    expect(nodes(tree).some(n=>n.props?.className==='settings-hub-tabs')).toBe(true);
    tree=open('Bảng thống kê');
    expect(nodes(tree).some(n=>n.type===ReportSettings)).toBe(true);
    tree=open('Tài khoản và dữ liệu');
    expect(nodes(tree).some(n=>n.props?.className==='settings-hub-tabs')).toBe(true);
    expect(nodes(tree).some(n=>n.type==='details'&&n.props.className==='options-menu')).toBe(true);
    expect(nodes(tree).some(n=>n.type==='div'&&n.props?.className==='options-popover')).toBe(true);
    tree=open('Excel · Trích xuất');
    expect(nodes(tree).some(n=>n.type===ExcelTransferPanel)).toBe(true);
    expect(nodes(tree).some(n=>n.type==='details'&&n.props.className==='options-menu')).toBe(true);
  });
  it('blocks switching editing sections while a report draft is unsaved',async()=>{
    firebase.isAdmin=true;render();respond();await settle();
    open('Chỉnh sửa');let tree=open('Bảng thống kê');
    const panel=nodes(tree).find(n=>n.type===ReportSettings);
    panel.props.onDirtyChange(true);
    tree=open('Danh sách dữ liệu');
    expect(nodes(tree).some(n=>n.type===ReportSettings)).toBe(true);
    expect(text(tree)).toContain('Có thay đổi chưa lưu');
    panel.props.onDirtyChange(false);
    tree=open('Danh sách dữ liệu');
    expect(nodes(tree).some(n=>n.type===ItemList)).toBe(true);
  });
  it('keeps Excel content import blocked and selecting another Sheets source read-only',async()=>{
    firebase.isAdmin=true;render();respond();await settle();open('Tài khoản và dữ liệu');const tree=open('Excel · Trích xuất'),panel=nodes(tree).find(n=>n.type===ExcelTransferPanel);expect(panel.props.importEnabled).toBe(false);await expect(panel.props.onImport([])).rejects.toThrow('chuyển đổi');panel.props.onClose();
    open('Tài khoản và dữ liệu');const source=nodes(open('Google Sheets')).find(n=>n.type===ConnectionPanel);const pending=source.props.onConnect(parseSheetConfig('https://docs.google.com/spreadsheets/d/another-fake/edit?gid=9'));respond();await pending;await settle();render();await settle();source.props.onClose();
    const list=nodes(open('Danh sách các ND trình HĐND')).find(n=>n.type===ItemList);expect(list.props.sourceKind).toBe('google');expect(list.props.readOnly).toBe(true);expect(list.props.items[0].recordId).toContain('another-fake:9');
  });
});
