import {initializeApp} from 'firebase/app';
import {connectAuthEmulator,getAuth,initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence,signInAnonymously,type Auth} from 'firebase/auth';
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
  }
  markStartup('firebase-initialized');
  return {auth,database,emulator};
}
export function getFirebaseServices(){
  return services??(services=createServices());
}
export function ensureGuestAuth(auth:Auth):Promise<void>{
  if(auth.currentUser)return Promise.resolve();
  if(anonymousTask)return anonymousTask;
  markStartup('auth-start-anonymous');
  anonymousTask=signInAnonymously(auth).then(()=>{})
    .catch(error=>{
      markStartup('auth-error','Đăng nhập ẩn danh không thành công');
      throw error;
    })
    .finally(()=>{anonymousTask=null;});
  return anonymousTask;
}
export function startFirebaseWarmup():Promise<void>{
  if(warmupTask)return warmupTask;
  const {auth}=getFirebaseServices();
  // authStateReady prevents a newly created guest from overwriting an
  // existing Google/admin session that Firebase is still restoring.
  warmupTask=(typeof auth.authStateReady==='function'
    ?auth.authStateReady():Promise.resolve())
    .then(()=>auth.currentUser?undefined:ensureGuestAuth(auth))
    .catch(error=>{
      markStartup('auth-error','Khởi tạo phiên Firebase không thành công');
      // The React controller still reports auth failures to the user.
      console.warn('Firebase anonymous authentication could not complete:',error?.code??'auth-error');
    });
  return warmupTask;
}
