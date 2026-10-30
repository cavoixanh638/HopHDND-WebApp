import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {catalogFromItems} from '../src/data/catalogs';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultReportLayout} from '../src/data/report-preferences';
import {firebaseAdmin,mayEdit} from '../src/data/firebase-repository';
const h=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];
  return{auth:{currentUser:null as any},authChanged:null as any,listeners:new Map<string,any>(),profileRaw:null as any,get:vi.fn(),transaction:vi.fn(),anonymous:vi.fn().mockResolvedValue({}),popup:vi.fn().mockResolvedValue({}),persistence:vi.fn().mockResolvedValue(undefined),popupResolver:{kind:'google-popup'},
    state:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    ref:(v:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:v});},
    effect:(fn:any,deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
    begin:()=>{cursor=0;},flush:()=>{const work=effects;effects=[];work.forEach(fn=>fn());},reset:()=>{slots.length=0;cursor=0;effects=[];},dispose:()=>slots.forEach(slot=>slot?.cleanup?.()),
  };
});
vi.mock('react',()=>({useState:h.state,useRef:h.ref,useEffect:h.effect}));
vi.mock('firebase/app',()=>({initializeApp:()=>({})}));
vi.mock('firebase/auth',()=>({getAuth:()=>h.auth,initializeAuth:()=>h.auth,
  indexedDBLocalPersistence:{},browserLocalPersistence:{},inMemoryPersistence:{},
  connectAuthEmulator:vi.fn(),GoogleAuthProvider:class{},browserPopupRedirectResolver:h.popupResolver,onAuthStateChanged:(_auth:any,next:any)=>{h.authChanged=next;return vi.fn();},signInAnonymously:h.anonymous,signInWithPopup:h.popup,signOut:vi.fn(),setPersistence:h.persistence}));
vi.mock('firebase/database',()=>({getDatabase:()=>({}),connectDatabaseEmulator:vi.fn(),ref:(_db:any,path:string)=>path,onValue:(path:string,next:any,error:any)=>{h.listeners.set(path,{next,error});return()=>h.listeners.delete(path);},get:h.get,runTransaction:h.transaction}));
import {useFirebase} from '../src/state/use-firebase';
const user=(admin=false)=>({uid:admin?'admin':'guest',email:admin?'cavoixanh638@gmail.com':'guest@example.test',emailVerified:true,isAnonymous:false,providerData:[{providerId:'google.com'}]});
const profile=(revision=1)=>({revision,catalogs:catalogFromItems(createDemoItems(1)),reports:defaultReportLayout(),items:defaultItemLayout()});
const stored=(revision=1)=>({revision,payload:JSON.stringify(profile(revision))});
function render(){h.begin();const value=useFirebase();h.flush();return value;}
function login(admin=false){render();h.auth.currentUser=user(admin);h.authChanged(h.auth.currentUser);render();h.listeners.get('hdnd/datasetV2/active').next({val:()=>null});h.listeners.get('.info/connected').next({val:()=>true});h.listeners.get(admin?'hdnd/editors':'hdnd/editors/guest').next({val:()=>admin?{guest:true}:true});}
function emit(path:string,value:any){if(path==='hdnd/profile')h.profileRaw=value;h.listeners.get(path).next({val:()=>value});}
beforeEach(()=>{h.reset();h.listeners.clear();h.auth.currentUser=null;h.profileRaw=null;h.get.mockReset();h.get.mockImplementation(async(path:string)=>({val:()=>path==='hdnd/profile'?h.profileRaw:null}));h.transaction.mockReset();h.popup.mockReset().mockResolvedValue({});h.persistence.mockReset().mockResolvedValue(undefined);});
afterEach(()=>h.dispose());
describe('Firebase config controller remains independent of business data',()=>{
  it('loads the Google popup resolver only for an explicit login action',async()=>{
    const view=render();
    expect(h.popup).not.toHaveBeenCalled();
    await view.login();
    expect(h.popup).toHaveBeenCalledTimes(1);
    expect(h.popup.mock.calls[0][0]).toBe(h.auth);
    expect(h.popup.mock.calls[0][2]).toBe(h.popupResolver);
  });
  it('does not persist an anonymous user when Google popup is cancelled',async()=>{
    const view=render();
    h.popup.mockRejectedValueOnce(new Error('popup-closed-by-user'));
    await expect(view.login()).rejects.toThrow('popup-closed-by-user');
    expect(h.persistence).not.toHaveBeenCalled();
  });
  it('persists only a successful verified Google login',async()=>{
    const view=render();
    await view.login();
    expect(h.popup).toHaveBeenCalledOnce();
    expect(h.persistence).toHaveBeenCalledOnce();
    expect(h.popup.mock.invocationCallOrder[0]).toBeLessThan(h.persistence.mock.invocationCallOrder[0]);
  });
  it('does not prefetch the mirror during source comparison so Excel and Database are measured fairly',()=>{
    vi.stubGlobal('window',{location:{search:'?startupMetrics=1&compareSource=database'}});
    try {
      login();
      expect([...h.listeners.keys()]).not.toContain('hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344');
      expect(h.listeners.has('hdnd/profile')).toBe(true);
    }finally{vi.unstubAllGlobals();}
  });
  it('can disable early prefetch to perform an on-device A/B performance comparison',()=>{
    vi.stubGlobal('window',{location:{search:'?startupMetrics=1&mirrorWarmup=off'}});
    try{
      login();
      expect([...h.listeners.keys()]).not.toContain('hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344');
      expect(h.listeners.has('hdnd/profile')).toBe(true);
    }finally{vi.unstubAllGlobals();}
  });
  it('subscribes to permissions/profile/control and fails closed until the editing lock arrives',()=>{
    login();expect([...h.listeners.keys()].sort()).toEqual(['.info/connected','hdnd/control','hdnd/datasetV2/active','hdnd/editors/guest','hdnd/freezeControl','hdnd/permissions','hdnd/profile']);expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    emit('hdnd/permissions',{columns:{note:true}});expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    emit('hdnd/control',{revision:1,editingLocked:false});
    emit('hdnd/freezeControl',{mode:'OPEN',revision:1,epoch:0,actor:'admin',changedAt:1,deadline:0,closedAt:0});
    expect(render().canEdit('sheet:42:row:3','note')).toBe(true);
    emit('hdnd/editors/guest',false);
    expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    emit('hdnd/editors/guest',true);
    expect(render().canEdit('sheet:42:row:3','note')).toBe(true);
    emit('hdnd/freezeControl',{mode:'DRAINING',revision:2,epoch:1,actor:'admin',changedAt:2,deadline:62,closedAt:0});
    expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    emit('hdnd/freezeControl',{mode:'OPEN',revision:3,epoch:1,actor:'admin',changedAt:3,deadline:0,closedAt:0});
    h.listeners.get('hdnd/permissions').error(new Error('permission_denied'));expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
  });
  it('lets a public anonymous Firebase visitor edit only granted fields without Google enrollment',()=>{
    render();
    h.auth.currentUser={uid:'public-guest',isAnonymous:true,email:null,emailVerified:false,providerData:[]};
    h.authChanged(h.auth.currentUser);
    render();
    emit('hdnd/datasetV2/active',null); // Initial absence verified before legacy access.
    emit('hdnd/permissions',{columns:{note:true,content:false}});
    emit('.info/connected',true);
    emit('hdnd/control',{revision:1,editingLocked:false});
    emit('hdnd/freezeControl',{mode:'OPEN',revision:1,epoch:0,actor:'admin',changedAt:1,deadline:0,closedAt:0});
    const state=render();
    expect(state.editorAuthorized).toBe(true);
    expect(state.canEdit('sheet:42:row:3','note')).toBe(true);
    expect(state.canEdit('sheet:42:row:3','content')).toBe(false);
    emit('hdnd/permissions',{columns:{note:true},cells:{'sheet:42:row:3':{note:false}}});
    expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    emit('hdnd/control',{revision:2,editingLocked:true});
    expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    expect(render().isAdmin).toBe(false);
  });
  it('blocks guests when admin locks editing and uses a transaction to unlock',async()=>{
    login(true);emit('hdnd/control',{revision:2,editingLocked:true});
    const admin=render();expect(admin.editingLocked).toBe(true);
    h.transaction.mockResolvedValue({committed:true,snapshot:{val:()=>({revision:3,editingLocked:false})}});
    await admin.saveEditingLock(false);
    const [path,update]=h.transaction.mock.calls[0];
    expect(path).toBe('hdnd/control');
    expect(update(null)).toBeNull();
    expect(update({revision:3,editingLocked:true})).toBeUndefined();
    expect(update({revision:2,editingLocked:true})).toMatchObject({revision:3,editingLocked:false});
    expect(render().editingLocked).toBe(false);
  });
  it('administrator grants and revokes Google employee UID through guarded CAS',async()=>{
    login(true);
    h.get.mockImplementation(async(path:string)=>({val:()=>path==='hdnd/editors/employee123'?null:null}));
    h.transaction.mockImplementation(async(path:string,fn:(value:unknown)=>unknown)=>{
      expect(path).toBe('hdnd/editors/employee123');
      const next=fn(null);
      expect(next).toBe(true);
      return {committed:true,snapshot:{val:()=>next}};
    });
    await render().saveEditorAccess('employee123',true);
    expect(h.transaction).toHaveBeenCalledOnce();
    await expect(render().saveEditorAccess('invalid uid!',true)).rejects.toThrow('UID');
  });
  it('denies guest config writes, even with direct handler calls',async()=>{
    login();emit('hdnd/profile',null);emit('hdnd/permissions',{columns:{note:true}});const state=render();
    await expect(state.common.save('all',profile(),0)).rejects.toThrow('Chỉ tài khoản Google');await expect(state.savePermissions({columns:{content:true}})).rejects.toThrow('Cần quản trị Google');expect(h.transaction).not.toHaveBeenCalled();
  });
  it('never initializes over an unreadable profile; rejects an editor with a stale revision',async()=>{
    login(true);await expect(render().common.save('all',profile(),0)).rejects.toThrow('Chưa đọc được');
    emit('hdnd/profile',stored(2));await expect(render().common.save('all',profile(),1)).rejects.toThrow('đã đổi');expect(h.transaction).not.toHaveBeenCalled();
  });
  it('saves with server revision checking and blocks overlapping writes before a rerender',async()=>{
    login(true);emit('hdnd/profile',stored());emit('hdnd/permissions',{columns:{note:true}});const state=render();
    let resolve!:(v:any)=>void;h.transaction.mockReturnValue(new Promise(done=>resolve=done));const pending=state.common.save('all',profile(),1);
    await vi.waitFor(()=>expect(h.transaction).toHaveBeenCalledOnce());const [path,update,options]=h.transaction.mock.calls[0];expect(path).toBe('hdnd/profile');expect(options).toEqual({applyLocally:false});
    expect(update(null)).toBeUndefined();expect(update(stored(2))).toBeUndefined();
    const confirmed=update(stored());expect(confirmed.revision).toBe(2);
    await expect(state.savePermissions({columns:{note:false}})).rejects.toThrow('Đang lưu');
    resolve({committed:true,snapshot:{val:()=>confirmed}});await pending;
  });
  it('report-only transaction preserves canonical Firebase catalog and item widths',async()=>{
    login(true);
    const existing=profile(4),statePayload={revision:4,payload:JSON.stringify(existing)};
    emit('hdnd/profile',statePayload);
    const state=render(),next=existing.reports.map((row,index)=>index===0?{...row,pageWidth:2750}:row);
    h.transaction.mockImplementation(async(path:string,apply:(value:any)=>any)=>{
      expect(path).toBe('hdnd/profile');
      expect(apply(null)).toBeUndefined();
      const proposed=apply(statePayload);
      expect(proposed.revision).toBe(5);
      return {committed:true,snapshot:{val:()=>proposed}};
    });
    const saved=await state.common.save('reports',next,4);
    expect(saved.revision).toBe(5);
    expect(saved.reports[0].pageWidth).toBe(2750);
    expect(saved.catalogs).toEqual(existing.catalogs);
    expect(saved.items).toEqual(existing.items);
    expect(render().profile?.reports[0].pageWidth).toBe(2750);
  });
  it('rebases a stale list layout onto a new global profile revision without overwriting other sections',async()=>{
    login(true);
    const baseline=profile(1),server=profile(3);
    server.reports=[...server.reports].reverse();
    server.items={...server.items,columns:server.items.columns.map(c=>c.key==='room'?{...c,width:290}:c)};
    emit('hdnd/profile',stored(2));
    const state=render();
    let confirmed:any;
    h.transaction.mockImplementation(async(path:string,apply:(value:any)=>any)=>{
      expect(path).toBe('hdnd/profile');
      expect(apply(null)).toBeUndefined();
      confirmed=apply({revision:3,payload:JSON.stringify(server)});
      return {committed:true,snapshot:{val:()=>confirmed}};
    });
    const draft={...baseline.items,frameWidth:1500 as const};
    const saved=await state.common.save('items',draft,1,baseline.items);
    expect(saved.revision).toBe(4);
    expect(saved.items.frameWidth).toBe(1500);
    expect(saved.items.columns.find(c=>c.key==='room')?.width).toBe(290);
    expect(saved.reports).toEqual(server.reports);
    expect(render().profile?.revision).toBe(4);
  });
  it('rejects saving stale layout when the same dimension changed elsewhere',async()=>{
    login(true);
    emit('hdnd/profile',stored(2));
    const state=render();
    const old=profile(1).items;
    const current={...profile(3),items:{...old,frameWidth:600}};
    h.transaction.mockImplementation(async(_path:string,apply:(v:any)=>any)=>{
      apply(null);
      const result=apply({revision:3,payload:JSON.stringify(current)});
      expect(result).toBeUndefined();
      return {committed:false,snapshot:{val:()=>({revision:3,payload:JSON.stringify(current)})}};
    });
    await expect(state.common.save('items',{...old,frameWidth:1500},1,old)).rejects.toThrow('độ rộng vùng danh sách');
    expect(render().profile?.revision).toBe(2);
  });
  it('enforces explicit per-field admin decisions inside a fresh Firebase CAS transaction',async()=>{
    login(true);
    emit('hdnd/profile',stored(2));
    const current=render(),base=profile(1).items;
    const local={...base,columns:base.columns.map(c=>c.key==='note'?{...c,width:210}:c)};
    const server=profile(3);
    server.items={...base,tableWidth:1900,columns:base.columns.map(c=>c.key==='note'?{...c,width:117}:c)};
    let confirmed:any;
    h.transaction.mockImplementation(async(_path:string,apply:(value:any)=>any)=>{
      expect(apply(null)).toBeUndefined();
      confirmed=apply({revision:3,payload:JSON.stringify(server)});
      return {committed:true,snapshot:{val:()=>confirmed}};
    });
    const saved=await current.common.save('items',local,1,base,{'columns.note.width':'local'});
    expect(saved.revision).toBe(4);
    expect(saved.items.tableWidth).toBe(1900);
    expect(saved.items.columns.find(c=>c.key==='note')?.width).toBe(210);
    expect(saved.catalogs).toEqual(server.catalogs);
    expect(saved.reports).toEqual(server.reports);
  });
  it('actually rereads Firebase config and permissions, and revokes privileges after logout',async()=>{
    login(true);emit('hdnd/profile',stored());emit('hdnd/permissions',{columns:{note:true}});
    h.get.mockImplementation(async(path:string)=>({val:()=>path==='hdnd/profile'?stored(3):{columns:{content:false},rows:{'sheet:42:row:3':true},cells:{'sheet:42:row:3':{note:false}}}}));
    await render().common.refresh();let state=render();expect(state.profile?.revision).toBe(3);expect(h.get).toHaveBeenCalledTimes(2);
    h.auth.currentUser=null;h.authChanged(null);state=render();expect(state.isAdmin).toBe(false);expect(state.canEdit('sheet:42:row:3','note')).toBe(false);expect(state.profile).toBeNull();
  });
  it('refuses stale permissions without invoking a transaction or overwriting Firebase',async()=>{
    login(true);emit('hdnd/permissions',{columns:{note:true}});
    const state=render(),draft={columns:{note:false}};
    h.get.mockImplementation(async(path:string)=>({val:()=>path==='hdnd/datasetV2/active'?null:{columns:{note:false}}}));
    await expect(state.savePermissions(draft)).rejects.toThrow('đã thay đổi');
    expect(h.transaction).not.toHaveBeenCalled();
    expect(h.get).toHaveBeenCalledWith('hdnd/permissions');
  });
  it('saves normalized row and cell permissions against their original baseline',async()=>{
    login(true);emit('hdnd/permissions',{columns:{note:true}});const state=render();
    const next={columns:{note:true},rows:{'sheet:42:row:3':false}};
    h.get.mockImplementation(async(path:string)=>({val:()=>path==='hdnd/datasetV2/active'?null:{columns:{note:true}}}));
    h.transaction.mockResolvedValue({committed:true,snapshot:{val:()=>next}});
    await state.savePermissions(next);
    const [path,update]=h.transaction.mock.calls[0];expect(path).toBe('hdnd/permissions');expect(update({columns:{note:true}})?.rows).toEqual({'sheet:42:row:3':false});expect(update({columns:{note:false}})).toBeUndefined();
  });
});
describe('cell, row and column policy',()=>{
  it('uses cell > row > column > deny, while identity fields remain locked even for admin',()=>{
    const permission={columns:{note:true,content:false},rows:{r1:false,r2:true},cells:{r1:{content:true},r2:{note:false}}};
    expect(mayEdit(permission,'r1','note')).toBe(false);expect(mayEdit(permission,'r1','content')).toBe(true);expect(mayEdit(permission,'r2','content')).toBe(true);expect(mayEdit(permission,'r2','note')).toBe(false);expect(mayEdit(permission,'r3','note')).toBe(true);expect(mayEdit({columns:{}},'r3','note')).toBe(false);expect(mayEdit(permission,'r1','stt' as never,true)).toBe(false);
    expect(firebaseAdmin(user(true) as never)).toBe(true);expect(firebaseAdmin({...user(true),emailVerified:false} as never)).toBe(false);expect(firebaseAdmin({...user(true),providerData:[{providerId:'password'}]} as never)).toBe(false);
  });
});
