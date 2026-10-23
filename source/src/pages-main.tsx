import {createRoot} from 'react-dom/client';
import {lazy,Suspense} from 'react';
import {App} from './app/App';
import {useFirebase} from './state/use-firebase';
// The SheetJS engine is only needed by the admin Excel import/export screen.
// Keep it out of the public visitor's first network request.
const ExcelTransferPanel=lazy(()=>import('./features/settings/ExcelTransferPanel')
  .then(module=>({default:module.ExcelTransferPanel})));
import {markStartup} from './data/startup-timings';
import './styles/app.css';
function FirebaseEntry(){
  const firebase=useFirebase();
  // Sheets remains readable even if Auth/configuration is unavailable.
  return <Suspense fallback={<p role="status">Đang mở công cụ quản trị…</p>}>
    <App firebase={firebase} TransferPanel={ExcelTransferPanel}/>
  </Suspense>;
}
markStartup('js-entry');
createRoot(document.getElementById('root')!).render(<FirebaseEntry/>);
