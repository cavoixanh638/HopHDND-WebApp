import {markStartup} from './data/startup-timings';
import {startFirebaseWarmup} from './state/firebase-boot';
import './styles/app.css';

// This module is intentionally tiny compared with the reports/admin bundle.
// Start Auth in parallel with loading the table UI, not after React mounting.
markStartup('js-entry');
void startFirebaseWarmup();
markStartup('app-module-fetch');
void import('./pages-app-entry').then(async({FirebaseEntry})=>{
  markStartup('app-module-loaded');
  const {createRoot}=await import('react-dom/client');
  const {createElement}=await import('react');
  createRoot(document.getElementById('root')!).render(createElement(FirebaseEntry));
}).catch(error=>{
  console.error('Could not start HopHDND interface',error);
  const root=document.getElementById('root');
  if(root)root.textContent='Không tải được ứng dụng. Kiểm tra kết nối mạng và tải lại trang.';
});
