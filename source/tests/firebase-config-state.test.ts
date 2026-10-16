import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {catalogFromItems} from '../src/data/catalogs';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultReportLayout} from '../src/data/report-preferences';
import {firebaseAdmin,mayEdit} from '../src/data/firebase-repository';
const h=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];
  return{auth:{currentUser:null as any},authChanged:null as any,listeners:new Map<string,any>(),get:vi.fn(),transaction:vi.fn(),anonymous:vi.fn().mockResolvedValue({}),
    state:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    ref:(v:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:v});},
    effect:(fn:any,deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
    begin:()=>{cursor=0;},flush:()=>{const work=effects;effects=[];work.forEach(fn=>fn());},reset:()=>{slots.length=0;cursor=0;effects=[];},dispose:()=>slots.forEach(slot=>slot?.cleanup?.()),
  };
});
vi.mock('react',()=>({useState:h.state,useRef:h.ref,useEffect:h.effect}));
vi.mock('firebase/app',()=>({initializeApp:()=>({})}));
vi.mock('firebase/auth',()=>({getAuth:()=>h.auth,connectAuthEmulator:vi.fn(),GoogleAuthProvider:class{},onAuthStateChanged:(_auth:any,next:any)=>{h.authChanged=next;return vi.fn();},signInAnonymously:h.anonymous,signInWithPopup:vi.fn(),signOut:vi.fn()}));
vi.mock('firebase/database',()=>({getDatabase:()=>({}),connectDatabaseEmulator:vi.fn(),ref:(_db:any,path:string)=>path,onValue:(path:string,next:any,error:any)=>{h.listeners.set(path,{next,error});return()=>h.listeners.delete(path);},get:h.get,runTransaction:h.transaction}));
import {useFirebase} from '../src/state/use-firebase';
const user=(admin=false)=>({uid:admin?'admin':'guest',email:admin?'cavoixanh638@gmail.com':null,emailVerified:admin,providerData:admin?[{providerId:'google.com'}]:[]});
const profile=(revision=1)=>({revision,catalogs:catalogFromItems(createDemoItems(1)),reports:defaultReportLayout(),items:defaultItemLayout()});
const stored=(revision=1)=>({revision,payload:JSON.stringify(profile(revision))});
function render(){h.begin();const value=useFirebase();h.flush();return value;}
function login(admin=false){render();h.auth.currentUser=user(admin);h.authChanged(h.auth.currentUser);render();h.listeners.get('.info/connected').next({val:()=>true});}
function emit(path:string,value:any){h.listeners.get(path).next({val:()=>value});}
beforeEach(()=>{h.reset();h.listeners.clear();h.auth.currentUser=null;h.get.mockReset();h.transaction.mockReset();});
afterEach(()=>h.dispose());
describe('Firebase config controller remains independent of business data',()=>{
  it('subscribes to permissions/profile/control and fails closed until the editing lock arrives',()=>{
    login();expect([...h.listeners.keys()].sort()).toEqual(['.info/connected','hdnd/control','hdnd/permissions','hdnd/profile']);expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    emit('hdnd/permissions',{columns:{note:true}});expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
    emit('hdnd/control',{revision:1,editingLocked:false});expect(render().canEdit('sheet:42:row:3','note')).toBe(true);
    h.listeners.get('hdnd/permissions').error(new Error('permission_denied'));expect(render().canEdit('sheet:42:row:3','note')).toBe(false);
  });
  it('blocks guests when admin locks editing and uses a transaction to unlock',async()=>{
    login(true);emit('hdnd/control',{revision:2,editingLocked:true});
    const admin=render();expect(admin.editingLocked).toBe(true);
    h.transaction.mockResolvedValue({committed:true});
    await admin.saveEditingLock(false);
    const [path,update]=h.transaction.mock.calls[0];
    expect(path).toBe('hdnd/control');
    expect(update({revision:3,editingLocked:true})).toBeUndefined();
    expect(update({revision:2,editingLocked:true})).toMatchObject({revision:3,editingLocked:false});
    expect(render().editingLocked).toBe(false);
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
    const [path,update,options]=h.transaction.mock.calls[0];expect(path).toBe('hdnd/profile');expect(options).toEqual({applyLocally:false});expect(update(stored(2))).toBeUndefined();expect(update(stored()).revision).toBe(2);
    await expect(state.savePermissions({columns:{note:false}})).rejects.toThrow('Đang lưu');resolve({committed:true});await pending;
  });
  it('actually rereads Firebase config and permissions, and revokes privileges after logout',async()=>{
    login(true);emit('hdnd/profile',stored());emit('hdnd/permissions',{columns:{note:true}});
    h.get.mockImplementation(async(path:string)=>({val:()=>path==='hdnd/profile'?stored(3):{columns:{content:false},rows:{'sheet:42:row:3':true},cells:{'sheet:42:row:3':{note:false}}}}));
    await render().common.refresh();let state=render();expect(state.profile?.revision).toBe(3);expect(h.get).toHaveBeenCalledTimes(2);
    h.auth.currentUser=null;h.authChanged(null);state=render();expect(state.isAdmin).toBe(false);expect(state.canEdit('sheet:42:row:3','note')).toBe(false);expect(state.profile).toBeNull();
  });
  it('saves normalized row and cell permissions against their original baseline',async()=>{
    login(true);emit('hdnd/permissions',{columns:{note:true}});const state=render();h.transaction.mockResolvedValue({committed:true});
    await state.savePermissions({columns:{note:true},rows:{'sheet:42:row:3':false}});
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
