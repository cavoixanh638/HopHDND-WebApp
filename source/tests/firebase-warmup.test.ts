import {beforeEach,describe,expect,it,vi} from 'vitest';

const h=vi.hoisted(()=>{
  const auth={
    currentUser:null as null|{uid:string},
    authStateReady:vi.fn<()=>Promise<void>>().mockResolvedValue(undefined)
  };
  return {auth,signIn:vi.fn(),initialize:vi.fn(),getAuth:vi.fn()};
});
vi.mock('firebase/app',()=>({initializeApp:h.initialize.mockImplementation(()=>({}))}));
vi.mock('firebase/auth',()=>({
  getAuth:h.getAuth.mockImplementation(()=>h.auth),
  initializeAuth:h.getAuth.mockImplementation(()=>h.auth),
  indexedDBLocalPersistence:{},browserLocalPersistence:{},inMemoryPersistence:{},
  signInAnonymously:h.signIn.mockImplementation(async()=>({user:{uid:'guest'}})),
  connectAuthEmulator:vi.fn()
}));
vi.mock('firebase/database',()=>({
  getDatabase:()=>({}),connectDatabaseEmulator:vi.fn(),forceLongPolling:vi.fn()
}));
vi.mock('../src/data/startup-timings',()=>({markStartup:vi.fn()}));
beforeEach(()=>{
  vi.resetModules();
  h.auth.currentUser=null;
  h.auth.authStateReady.mockReset().mockResolvedValue(undefined);
  h.signIn.mockReset().mockResolvedValue({user:{uid:'guest'}});
  h.initialize.mockClear();h.getAuth.mockClear();
});
describe('Firebase cold-start warmup',()=>{
  it('does not create an anonymous user while a valid admin identity is restoring',async()=>{
    let restore!:()=>void;
    h.auth.authStateReady.mockReturnValue(new Promise(resolve=>restore=resolve));
    const boot=await import('../src/state/firebase-boot');
    const pending=boot.startFirebaseWarmup();
    expect(h.initialize).toHaveBeenCalledTimes(1);
    expect(h.signIn).not.toHaveBeenCalled();
    h.auth.currentUser={uid:'restored-admin'};
    restore();
    await pending;
    expect(h.signIn).not.toHaveBeenCalled();
  });
  it('signs in guest while UI may still load and shares a single in-flight attempt',async()=>{
    let resolveSign!:(value:unknown)=>void;
    h.signIn.mockReturnValue(new Promise(resolve=>resolveSign=resolve));
    const boot=await import('../src/state/firebase-boot');
    const first=boot.startFirebaseWarmup();
    await Promise.resolve();await Promise.resolve();
    expect(h.signIn).toHaveBeenCalledTimes(1);
    const controllerAttempt=boot.ensureGuestAuth(h.auth as never);
    expect(h.signIn).toHaveBeenCalledTimes(1);
    resolveSign(undefined);
    await Promise.all([first,controllerAttempt]);
    expect(boot.getFirebaseServices().auth).toBe(h.auth);
    expect(h.initialize).toHaveBeenCalledTimes(1);
  });
});
