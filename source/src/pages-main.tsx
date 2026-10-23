import {createRoot} from 'react-dom/client';
import {App} from './app/App';
import {useFirebase} from './state/use-firebase';
import {ExcelTransferPanel} from './features/settings/ExcelTransferPanel';
import {markStartup} from './data/startup-timings';
import './styles/app.css';
function FirebaseEntry(){
  const firebase=useFirebase();
  // Sheets remains readable even if Auth/configuration is unavailable.
  return <App firebase={firebase} TransferPanel={ExcelTransferPanel}/>;
}
markStartup('js-entry');
createRoot(document.getElementById('root')!).render(<FirebaseEntry/>);
