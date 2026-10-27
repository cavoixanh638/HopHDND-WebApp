import {createRoot} from 'react-dom/client';
import {lazy,Suspense,useEffect,useState} from 'react';
import {onAuthStateChanged,signInWithPopup,signOut,setPersistence,GoogleAuthProvider,browserPopupRedirectResolver,browserLocalPersistence,type User} from 'firebase/auth';
import {onValue,ref} from 'firebase/database';
import {App} from './app/App';
import {useFirebase} from './state/use-firebase';
import {firebaseAdmin} from './data/firebase-repository';
import {PublicGuestViewer} from './features/public/PublicGuestViewer';
// The SheetJS engine is only needed by the admin Excel import/export screen.
const ExcelTransferPanel=lazy(()=>import('./features/settings/ExcelTransferPanel')
  .then(module=>({default:module.ExcelTransferPanel})));
import {markStartup} from './data/startup-timings';
import {startFirebaseWarmup,getFirebaseServices} from './state/firebase-boot';
import './styles/app.css';

function AuthorizedWorkspace(){
  const firebase=useFirebase();
  return <Suspense fallback={<p role="status">Đang mở công cụ quản trị…</p>}>
    <App firebase={firebase} TransferPanel={ExcelTransferPanel}/>
  </Suspense>;
}

/** Role is resolved from Firebase Auth + server-owned staff enrollment BEFORE
 * mounting the business app. Unregistered Google and anonymous visitors mount
 * only PublicGuestViewer, which never fetches raw items, mirrors or Sheets.
 */
function RestrictedPagesEntry(){
  const [services]=useState(getFirebaseServices);
  const [role,setRole]=useState<'loading'|'guest'|'authorized'>('loading');
  const [account,setAccount]=useState<User|null>(null);
  useEffect(()=>{
    let active=true;
    let unsubscribeGrant:()=>void=()=>{};
    const unsubscribeAuth=onAuthStateChanged(services.auth,user=>{
      unsubscribeGrant();
      unsubscribeGrant=()=>{};
      if(!active)return;
      setAccount(user);
      if(!user||user.isAnonymous){setRole('guest');return;}
      if(firebaseAdmin(user)){setRole('authorized');return;}
      setRole('loading');
      unsubscribeGrant=onValue(ref(services.database,'hdnd/editors/'+user.uid),snapshot=>{
        if(active)setRole(snapshot.val()===true?'authorized':'guest');
      },()=>{
        // Missing or inaccessible enrollment must never grant access to raw data.
        if(active)setRole('guest');
      });
    },()=>{if(active)setRole('guest');});
    return()=>{active=false;unsubscribeGrant();unsubscribeAuth();};
  },[services]);
  const login=async()=>{
    await signInWithPopup(services.auth,new GoogleAuthProvider(),browserPopupRedirectResolver);
    await setPersistence(services.auth,browserLocalPersistence);
  };
  const logout=async()=>{await signOut(services.auth);};
  if(role==='loading')return <p role="status">Đang xác minh quyền truy cập…</p>;
  if(role==='authorized')return <AuthorizedWorkspace/>;
  return <PublicGuestViewer database={services.database} onLogin={login}
    authLabel={!account||account.isAnonymous?undefined:account.email??undefined}
    onLogout={account&&!account.isAnonymous?logout:undefined}/>;
}
markStartup('js-entry');
void startFirebaseWarmup();
const Root=import.meta.env.MODE==='pages-test'?AuthorizedWorkspace:RestrictedPagesEntry;
createRoot(document.getElementById('root')!).render(<Root/>);
