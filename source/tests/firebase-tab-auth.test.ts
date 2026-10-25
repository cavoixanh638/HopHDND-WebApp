import {afterAll,describe,expect,it} from 'vitest';
import {deleteApp,initializeApp} from 'firebase/app';
import {connectAuthEmulator,initializeAuth,inMemoryPersistence,signInAnonymously,signOut} from 'firebase/auth';
import {ensureGuestAuth} from '../src/state/firebase-boot';

const enabled=process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099';
describe.skipIf(!enabled)('Anonymous Firebase Auth per-browser-tab identity',()=>{
  const applications:ReturnType<typeof initializeApp>[]=[];
  const newTab=(label:string)=>{
    const app=initializeApp({
      apiKey:'demo-test-key',authDomain:'demo-hdnd.firebaseapp.com',
      projectId:'demo-hdnd',appId:'demo-hdnd',
    },'test-editor-'+label+'-'+crypto.randomUUID());
    applications.push(app);
    const auth=initializeAuth(app,{persistence:inMemoryPersistence});
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    return auth;
  };
  afterAll(async()=>{await Promise.all(applications.map(app=>deleteApp(app)));});

  it('rotates any anonymously restored credential in this tab once',async()=>{
    const tab=newTab('restored-legacy');
    await signInAnonymously(tab);
    const staleUid=tab.currentUser?.uid;
    expect(staleUid).toBeTruthy();
    await ensureGuestAuth(tab);
    const freshUid=tab.currentUser?.uid;
    expect(freshUid).toBeTruthy();
    expect(freshUid).not.toBe(staleUid);
    // Reentrant warmup must not rotate or lose an ongoing unsaved draft.
    await ensureGuestAuth(tab);
    expect(tab.currentUser?.uid).toBe(freshUid);
    await signOut(tab);
  });
  it('independent anonymous tabs have distinct Firebase security principals',async()=>{
    const first=newTab('first'),second=newTab('second');
    await Promise.all([signInAnonymously(first),signInAnonymously(second)]);
    expect(first.currentUser?.uid).toBeTruthy();
    expect(second.currentUser?.uid).toBeTruthy();
    expect(first.currentUser?.uid).not.toBe(second.currentUser?.uid);
  });
});
