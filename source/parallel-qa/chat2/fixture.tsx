/** Scoped real React/Preact-compatible component mount. No Firebase, credentials,
 * production URL, API, or data source. This is NOT an integrated application test.
 */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Item} from '../../shared/types';
import type {CellEditSessionManager} from '../../src/data/cell-edit-leases';
import {Modal} from '../../src/components/Modal';
import {RoomSpecialistFilterCell} from '../../src/features/items/RoomSpecialistFilterCell';
import {LeaseTextInput} from '../../src/features/items/LeaseTextInput';
import '../../src/styles/app.css';

const rows=[
  {recordId:'synthetic-a',room:'Phòng Tổng hợp',specialist:'Nguyễn Thị Hồng'},
  {recordId:'synthetic-b',room:'Phòng Tư pháp',specialist:'Đặng Minh Anh'},
  {recordId:'synthetic-c',room:'Phòng Tổng hợp',specialist:'Trần Văn Hải'},
] as Item[];

const events:string[]=[];
let requests=0,cancels=0,held=false,storedDraft='';
let acceptFirst:(()=>void)|null=null;
let rejectFirst:((error:Error)=>void)|null=null;
const manager={
  async acquire(id:string,field:string,kind:string){
    if(id!=='synthetic-a'||field!=='room'||kind!=='short')throw Error('Unexpected synthetic lease request');
    const index=++requests;
    events.push('request:'+index);
    if(index===1)await new Promise<void>((resolve,reject)=>{
      acceptFirst=resolve;rejectFirst=reject;
    });
    if(held)throw Error('Two simultaneous leases in component fixture');
    held=true;events.push('ack:'+index);
    return true;
  },
  isPending(){return false;},
  has(){return held;},
  preserveDraft(_id:string,_field:string,value:string){storedDraft=value;return true;},
  async cancel(){
    cancels++;events.push('cancel:'+(held?'held':'empty'));held=false;
  },
} as unknown as CellEditSessionManager;

function FilterFixture(){
  const [open,setOpen]=useState(true);
  const [room,setRoom]=useState('');
  const [person,setPerson]=useState('');
  return <main>
    <button type="button" data-qa="reopen" onClick={()=>{setOpen(true);setRoom('');setPerson('');}}>Mở lại popup</button>
    {open&&<Modal title="Bộ lọc dữ liệu tổng hợp (fixture, không có quyền ghi)" onClose={()=>setOpen(false)}>
      <div className="modal-body">
        <p data-qa="source">Dữ liệu tổng hợp — không có Firebase và không xác thực tài khoản.</p>
        <div className="item-table-scroll" style={{maxWidth:'100%',overflow:'auto'}}>
          <table><thead><tr><RoomSpecialistFilterCell items={rows} room={room} person={person}
            onRoom={setRoom} onPerson={setPerson}/></tr></thead></table>
        </div>
        <p data-qa="filters">{room||'Chưa chọn Phòng'} / {person||'Chưa tìm chuyên viên'}</p>
      </div>
    </Modal>}
  </main>;
}

function LeaseFixture(){
  const [value,setValue]=useState('Giữ nguyên');
  const [mounted,setMounted]=useState(true);
  const [disabled,setDisabled]=useState(false);
  return <main style={{maxWidth:460,padding:12}}>
    <h1>Nháp ô nhập ngắn — dữ liệu tổng hợp</h1>
    {mounted&&<LeaseTextInput value={value} label="Ô nhập thử nghiệm" id="synthetic-a"
      field="room" disabled={disabled} manager={manager} onChange={setValue}/>}
    <button type="button" data-qa="outside">Chuyển focus</button>
    <button type="button" data-qa="unmount" onClick={()=>setMounted(false)}>Ẩn ô</button>
    <button type="button" data-qa="disable" onClick={()=>setDisabled(true)}>Thu hồi quyền UI</button>
    <output data-qa="value">{value}</output>
  </main>;
}
Object.assign(window,{__chat2:{
  ack:()=>{acceptFirst?.();acceptFirst=null;rejectFirst=null;},
  deny:()=>{rejectFirst?.(new Error('Mất mạng giả lập: chưa được cấp khóa.'));acceptFirst=null;rejectFirst=null;},
  snapshot:()=>({events:[...events],requests,cancels,held,storedDraft,
    focused:document.activeElement?.getAttribute('aria-label'),
    readOnly:document.querySelector<HTMLInputElement>('input[aria-label="Ô nhập thử nghiệm"]')?.readOnly,
    inputPresent:!!document.querySelector('input[aria-label="Ô nhập thử nghiệm"]'),
    dialogOpen:!!document.querySelector('dialog[open]')})
}});
createRoot(document.getElementById('root')!).render(
  new URL(location.href).searchParams.get('mode')==='lease'?<LeaseFixture/>:<FilterFixture/>
);
