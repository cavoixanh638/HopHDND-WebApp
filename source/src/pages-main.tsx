import {createRoot} from 'react-dom/client';
import {lazy,Suspense} from 'react';
import {App} from './app/App';
import {useFirebase} from './state/use-firebase';
// The SheetJS engine is only needed by the admin Excel import/export screen.
// Keep it out of the public visitor's first network request.
const ExcelTransferPanel=lazy(()=>import('./features/settings/ExcelTransferPanel')
  .then(module=>({default:module.ExcelTransferPanel})));
import {markStartup} from './data/startup-timings';
import {startFirebaseWarmup} from './state/firebase-boot';
import './styles/app.css';
function FirebaseEntry(){
  const firebase=useFirebase();
  // Firebase is the only operational database. Authentication is mandatory
  // in the background, but public guests sign in anonymously without a prompt.
  return <Suspense fallback={<p role="status">Đang mở công cụ quản trị…</p>}>
    <App firebase={firebase} TransferPanel={ExcelTransferPanel}/>
  </Suspense>;
}
markStartup('js-entry');
// Warm up Firebase's restored identity before the first React commit;
// don't wait for the useEffect that mounts after the UI shell.
void startFirebaseWarmup();
createRoot(document.getElementById('root')!).render(<FirebaseEntry/>);
