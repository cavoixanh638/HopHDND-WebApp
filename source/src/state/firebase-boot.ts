import {initializeApp} from 'firebase/app';
import {connectAuthEmulator,getAuth,initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence,setPersistence,signOut,signInAnonymously,type Auth} from 'firebase/auth';
import {connectDatabaseEmulator,forceLongPolling,getDatabase} from 'firebase/database';
import {firebaseConfig} from '../data/firebase-config';
import {markStartup} from '../data/startup-timings';

/**
 * Small shared Firebase bootstrap, deliberately independent of React,
 * table rendering, admin panels, reporting and SheetJS.
 *
 * Called by public Pages BEFORE the full React app module is downloaded.
 * Firebase Authentication restores a persisted identity first, then starts
 * anonymous sign-in only when there is no identity. No permission bypass.
 */
let services:ReturnType<typeof createServices>|null=null;
let anonymousTask:Promise<void>|null=null;
let guestTabIdentityReady=false;
let warmupTask:Promise<void>|null=null;

function createServices(){
  const emulator=import.meta.env.MODE==='pages-test';
  const config=emulator?{
    apiKey:'demo-test-key',authDomain:'demo-hdnd.firebaseapp.com',
    projectId:'demo-hdnd',appId:'demo-hdnd',
    databaseURL:'https://demo-hdnd.firebaseio.com'
  }:firebaseConfig;
  const longpoll=!emulator&&typeof window!=='undefined'&&
    new URLSearchParams(window.location?.search??'').get('dbTransport')==='longpoll';
  if(longpoll)forceLongPolling();
  markStartup('db-transport',longpoll?'HTTP long-poll':'Firebase auto');
  const app=initializeApp(config,'hdnd-pages');
  // Avoid the default popup/redirect iframe bootstrap for ordinary viewers;
  // popup code is only needed when an admin explicitly chooses Google login.
  // Keep emulator defaults unchanged for reliable isolated smoke tests.
  const auth=emulator?getAuth(app):initializeAuth(app,{
    persistence:[indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence]
  });
  const database=getDatabase(app);
  if(emulator){
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    connectDatabaseEmulator(database,'127.0.0.1',9000);
    // PR95 real-Chromium two-tab harness: a test-only SDK Google Auth login.
    // Only the pages-test build on a loopback origin may install this hook;
    // production does not load the module or expose an admin shortcut.
    if(typeof window!=='undefined'&&import.meta.env.MODE==='pages-test'&&
      ['localhost','127.0.0.1'].includes(window.location.hostname)){
      void import('./firebase-emulator-admin-auth').then(({signInAsEmulatorGoogleAdmin})=>{
        const testing=window as Window & {
          __pr95EmulatorGoogleAdminSignIn?:()=>Promise<{
            uid:string;email:string|null;emailVerified:boolean;providerIds:string[]
          }>
        };
        testing.__pr95EmulatorGoogleAdminSignIn=async()=>{
          const user=await signInAsEmulatorGoogleAdmin(auth);
          return {uid:user.uid,email:user.email,emailVerified:user.emailVerified,
            providerIds:user.providerData.map(p=>p.providerId)};
        };
      });
      void import('../data/firebase-versioned-replacement').then(
        ({armEmulatorPostCommitCallerAckLoss})=>{
          const testing=window as Window & {
            __pr95EmulatorArmLostCallerAck?:(operationId:string)=>void
          };
          testing.__pr95EmulatorArmLostCallerAck=(operationId:string)=>
            armEmulatorPostCommitCallerAckLoss(database,operationId);
        });
    }
  }
  markStartup('firebase-initialized');
  return {auth,database,emulator};
}
export function getFirebaseServices(){
  return services??(services=createServices());
}
/**
 * Each anonymous editing tab needs an independent Firebase Auth principal.
 * Never reuse an anonymous login persisted from older versions/another tab.
 * A tab-local UID is stronger than a client-generated session UUID but does
 * not turn a Google/admin UID shared across tabs into separate principals.
 */
export function ensureGuestAuth(auth:Auth):Promise<void>{
  if(auth.currentUser&&!auth.currentUser.isAnonymous)return Promise.resolve();
  if(anonymousTask)return anonymousTask;
  if(guestTabIdentityReady&&auth.currentUser)return Promise.resolve();
  markStartup('auth-start-anonymous');
  anonymousTask=(async()=>{
    // Make each page load's anonymous principal independent, including when
    // upgrading from older releases that persisted an anonymous session.
    const mustRotate=!guestTabIdentityReady&&auth.currentUser?.isAnonymous;
    guestTabIdentityReady=true;
    await setPersistence(auth,inMemoryPersistence);
    if(mustRotate)await signOut(auth);
    if(!auth.currentUser)await signInAnonymously(auth);
  })().catch(error=>{
    markStartup('auth-error','Đăng nhập ẩn danh không thành công');
    guestTabIdentityReady=false;
    throw error;
  }).finally(()=>{anonymousTask=null;});
  return anonymousTask;
}

export function startFirebaseWarmup():Promise<void>{
  if(warmupTask)return warmupTask;
  const {auth}=getFirebaseServices();
  // authStateReady prevents a newly created guest from overwriting an
  // existing Google/admin session that Firebase is still restoring.
  warmupTask=(typeof auth.authStateReady==='function'
    ?auth.authStateReady():Promise.resolve())
    .then(()=>auth.currentUser&&!auth.currentUser.isAnonymous?undefined:ensureGuestAuth(auth))
    .catch(error=>{
      markStartup('auth-error','Khởi tạo phiên Firebase không thành công');
      // The React controller still reports auth failures to the user.
      console.warn('Firebase anonymous authentication could not complete:',error?.code??'auth-error');
    });
  return warmupTask;
}
