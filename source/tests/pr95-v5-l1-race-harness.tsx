/** R-V5-02: real mounted/unmounted CellPicker in Chrome.
 * Stub models held-after-ACK baseline CellEditSessionManager semantics.
 * NO Firebase/production network, no import from other V5 workers.
 */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CellPicker} from '../src/features/items/CellPicker';
import type {CellEditSessionManager} from '../src/data/cell-edit-leases';
import '../src/styles/app.css';

const events:string[]=[];
let held:'A'|'B'|null=null;
let count=0;
let patches=0;
let canceledA=0,canceledB=0;
let ackA!:()=>void;
const delayedA=new Promise<void>(resolve=>{ackA=resolve;});
const liveListeners=new Map<string,number>();
const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
const watched=(self:EventTarget,type:string)=>self===document&&['pointerdown','keydown'].includes(type)||
  self===window&&['scroll','resize'].includes(type)||
  self===window.visualViewport&&['scroll','resize'].includes(type);
EventTarget.prototype.addEventListener=function(type:string,callback:EventListenerOrEventListenerObject|null,options?:boolean|AddEventListenerOptions){
  if(watched(this,type))liveListeners.set(type,(liveListeners.get(type)??0)+1);
  return add.call(this,type,callback,options);
};
EventTarget.prototype.removeEventListener=function(type:string,callback:EventListenerOrEventListenerObject|null,options?:boolean|EventListenerOptions){
  if(watched(this,type))liveListeners.set(type,(liveListeners.get(type)??0)-1);
  return remove.call(this,type,callback,options);
};
const manager={
  async acquire(id:string,field:string){
    if(id!=='same-record'||field!=='progressBuild')throw Error('Unexpected lease request');
    const tag=++count===1?'A':'B';
    events.push('acquire:'+tag);
    if(tag==='A')await delayedA;
    if(held!==null)throw Error('New picker attempted acquire before old lease release: '+held);
    held=tag;
    events.push('ack:'+tag);
    return true;
  },
  isPending(){return false;},
  async cancel(id:string,field:string){
    if(id!=='same-record'||field!=='progressBuild')throw Error('Unexpected cancellation');
    events.push('cancel:'+(held??'none'));
    if(held==='A')canceledA++;
    if(held==='B')canceledB++;
    // Baseline manager.cancel() is a no-op if no held entry yet.
    held=null;
  }
} as unknown as CellEditSessionManager;
let hideUnused:()=>void=()=>{};
function App(){
  const [popup,setPopup]=useState(true);
  const [unused,setUnused]=useState(true);
  hideUnused=()=>setUnused(false);
  const record={leaseManager:manager,recordId:'same-record',field:'progressBuild' as const,
    value:'Giữ nguyên',options:['Giữ nguyên','Chờ xử lý','Hoàn thành'],
    onChange:()=>{patches++;events.push('PATCH');}};
  return <main style={{width:640,maxWidth:'100%',color:'#18362b'}}>
    <h1 style={{fontSize:18}}>R-V5-02 · mount / unmount / acquire ACK</h1>
    {popup&&<section data-race="popup" role="dialog" aria-label="Popup mô phỏng">
      <h2 style={{fontSize:16}}>Popup A</h2>
      <CellPicker {...record} label="Popup A · trạng thái"/>
      <button data-race="unmount-popup" type="button" onClick={()=>setPopup(false)}>Đóng popup A</button>
    </section>}
    <section data-race="list" aria-label="Danh sách mô phỏng">
      <h2 style={{fontSize:16}}>List B · cùng record/field</h2>
      <CellPicker {...record} label="List B · trạng thái"/>
    </section>
    {unused&&<section data-race="unused">
      <CellPicker {...record} label="Unused C · cùng record/field"/>
    </section>}
  </main>;
}
Object.assign(window,{
  __pr95V5L1Race:{
    ackOld:()=>ackA(),
    unmountUnused:()=>hideUnused(),
    snapshot:()=>({
      events:[...events],held,count,patches,canceledA,canceledB,
      activePopup:!!document.querySelector('[data-race=popup]'),
      activeB:!!document.querySelector('[data-race=list] .cell-picker-popover:popover-open'),
      expandedB:document.querySelector('[data-race=list] .cell-picker-trigger')?.getAttribute('aria-expanded'),
      waitingB:document.querySelector('[data-race=list] .cell-picker-trigger')?.getAttribute('aria-busy'),
      listenerCounts:Object.fromEntries(liveListeners),
      visiblePopovers:document.querySelectorAll('.cell-picker-popover:popover-open').length
    })
  }
});
createRoot(document.getElementById('root')!).render(<App/>);
