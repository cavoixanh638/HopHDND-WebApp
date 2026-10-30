import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import type {ActiveDatasetPointer} from '../src/data/dataset-replacement-integrity';

const h=vi.hoisted(()=>{
  const slots:unknown[]=[];let cursor=0;
  return {
    reset:()=>{slots.length=0;cursor=0;},
    begin:()=>{cursor=0;},
    state:<T,>(initial:T|(()=>T))=>{
      const at=cursor++;
      if(!(at in slots))slots[at]=typeof initial==='function'?(initial as ()=>T)():initial;
      const set=(next:T|((old:T)=>T))=>{
        slots[at]=typeof next==='function'?(next as (old:T)=>T)(slots[at] as T):next;
      };
      return [slots[at] as T,set] as const;
    }
  };
});
const api=vi.hoisted(()=>({
  resolve:vi.fn(),stage:vi.fn(),read:vi.fn(),commit:vi.fn(),restore:vi.fn()
}));
vi.mock('react',async importOriginal=>({
  ...(await importOriginal<typeof import('react')>()),useState:h.state
}));
vi.mock('../src/data/firebase-versioned-replacement',()=>({
  resolveDatasetOperation:api.resolve,
  stageDatasetReplacement:api.stage,
  readStagedDataset:api.read,
  commitDatasetReplacement:api.commit,
  restoreDatasetBackup:api.restore
}));
import {
  presentDatasetOperation,readOperationView,VersionedExcelReplacementPanel
} from '../src/features/settings/VersionedExcelReplacementPanel';

const operationId='excel_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const pointer:ActiveDatasetPointer={
  generationId:'gen_'+operationId,operationId,revision:3,rowCount:1,digest:'a'.repeat(64)
};
const rows=createDemoItems(1);
const props={
  database:{} as Database,
  user:{uid:'emulator-admin'} as User,
  items:rows,current:rows,fileName:'synthetic-only.xlsx',reports:[],
  active:pointer,enabled:true
};
const approved={
  operationId,manifest:{schemaVersion:1,generationId:'gen_'+operationId,
    operationId,rowCount:1,digest:'b'.repeat(64)},
  expected:pointer,baseline:'synthetic',preview:{oldCount:1,newCount:1},
  fileName:'synthetic-only.xlsx'
};
function children(node:unknown):any[]{
  if(Array.isArray(node))return node.flatMap(children);
  if(!node||typeof node!=='object')return [];
  const element=node as {type?:unknown;props?:{children?:unknown}};
  return [element,...children(element.props?.children)];
}
function label(node:unknown):string{
  if(Array.isArray(node))return node.map(label).join('');
  if(node&&typeof node==='object')return label((node as any).props?.children);
  return typeof node==='string'||typeof node==='number'?String(node):'';
}
function render(){h.begin();return VersionedExcelReplacementPanel(props);}
function control(root:unknown,type:string,needle:string){
  const item=children(root).find(node=>node.type===type&&
    (label(node).includes(needle)||node.props?.id===needle||
      node.props?.['aria-label']===needle));
  if(!item)throw Error('Control not found: '+needle);
  return item as {props:any};
}
function notice(root:unknown){
  return children(root).filter(node=>node.type==='p'&&
    (node.props?.role==='alert'||node.props?.role==='status')).map(label).join(' ');
}
async function reviewCandidate(){
  control(render(),'button','Ghi staging, đọc lại').props.onClick();
  await vi.waitFor(()=>expect(api.stage).toHaveBeenCalledOnce());
  await vi.waitFor(()=>expect(notice(render())).toContain('Đã ghi staging'));
  control(render(),'input','Xác nhận thay thế toàn bộ').props.onChange({
    currentTarget:{value:'THAY '+operationId+' 1 1'}
  });
}
beforeEach(()=>{
  h.reset();vi.clearAllMocks();
  api.stage.mockResolvedValue(approved);
  api.read.mockResolvedValue(rows);
  api.commit.mockResolvedValue({status:'committed',operationId});
  api.restore.mockResolvedValue({status:'committed',operationId:'restore_test_0001'});
  api.resolve.mockResolvedValue({status:'committed-active',operationId,generationId:'gen_'+operationId});
  vi.stubGlobal('crypto',{randomUUID:()=> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'});
});
afterEach(()=>vi.unstubAllGlobals());

describe('L2 / API-CHANGE-02 operationId statuses — synthetic UI contract',()=>{
  it('maps all four ACKed statuses without marking historic commits as failures',()=>{
    const active=presentDatasetOperation({status:'committed-active',operationId,generationId:'gen_x'},operationId);
    expect(active.status).toBe('committed-active');
    expect(active.committed).toBe(true);
    expect(active.message).toContain('ĐANG HOẠT ĐỘNG');
    const historic=presentDatasetOperation({status:'committed-historical',operationId,generationId:'gen_old'},operationId);
    expect(historic.status).toBe('committed-historical');
    expect(historic.committed).toBe(true);
    expect(historic.message).toContain('KHÔNG PHẢI thất bại');
    const absent=presentDatasetOperation({status:'not-committed',operationId},operationId);
    expect(absent.committed).toBe(false);
    expect(absent.message).toContain('CHƯA GHI NHẬN COMMIT');
    const unknown=presentDatasetOperation({status:'unknown',operationId},operationId);
    expect(unknown.status).toBe('unknown');
    expect(unknown.message).toContain('Không tự gửi lại');
  });
  it('fails closed on legacy strings, invalid shape, another ID, or unknown enum',()=>{
    for(const wire of ['not-committed','committed','unknown',null,
      {status:'committed-active',operationId:'different'},
      {status:'committed-historical',operationId,generationId:4},
      {status:'other',operationId}]){
      const view=presentDatasetOperation(wire,operationId);
      expect(view.status).toBe('unknown');
      expect(view.committed).toBe(false);
    }
  });
  it('queries the backend once, returns UNKNOWN on read/network failure, never retries',async()=>{
    api.resolve.mockRejectedValueOnce(new Error('connection-lost'));
    expect((await readOperationView(props.database,operationId)).status).toBe('unknown');
    expect(api.resolve).toHaveBeenCalledOnce();
    expect(api.stage).not.toHaveBeenCalled();
    expect(api.commit).not.toHaveBeenCalled();
    expect(api.restore).not.toHaveBeenCalled();
  });
  it('manual history lookup displays committed-historical without any write or retry',async()=>{
    api.resolve.mockResolvedValue({status:'committed-historical',
      operationId,generationId:'gen_'+operationId});
    control(render(),'input','v2-operation-lookup').props.onChange({currentTarget:{value:operationId}});
    control(render(),'button','Tra cứu trạng thái operationId').props.onClick();
    await vi.waitFor(()=>expect(notice(render())).toContain('ĐÃ COMMIT THÀNH CÔNG TRONG LỊCH SỬ'));
    expect(notice(render())).toContain('KHÔNG PHẢI thất bại');
    expect(api.resolve).toHaveBeenCalledOnce();
    expect(api.stage).not.toHaveBeenCalled();
    expect(api.commit).not.toHaveBeenCalled();
    expect(api.restore).not.toHaveBeenCalled();
  });
  it('UNKNOWN commit is not resent automatically and requires explicit operationId lookup',async()=>{
    api.commit.mockResolvedValue({status:'unknown',operationId});
    await reviewCandidate();
    const button=control(render(),'button','Chuyển thế hệ bằng CAS');
    expect(button.props.disabled).toBe(false);
    button.props.onClick();
    await vi.waitFor(()=>expect(notice(render())).toContain('CHƯA RÕ TRẠNG THÁI'));
    const noRetry=control(render(),'button','Chuyển thế hệ bằng CAS');
    expect(noRetry.props.disabled).toBe(true);
    noRetry.props.onClick(); // Even forced handler calls cannot resend this operation.
    expect(api.commit).toHaveBeenCalledOnce();
    expect(api.resolve).not.toHaveBeenCalled();
    expect(api.restore).not.toHaveBeenCalled();
  });
  it('a completed commit that became historical stays successful in the UI',async()=>{
    api.resolve.mockResolvedValue({status:'committed-historical',
      operationId,generationId:'gen_'+operationId});
    await reviewCandidate();
    control(render(),'button','Chuyển thế hệ bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(notice(render())).toContain('ĐÃ COMMIT THÀNH CÔNG TRONG LỊCH SỬ'));
    expect(notice(render())).not.toContain('CHƯA GHI NHẬN COMMIT');
    expect(api.commit).toHaveBeenCalledOnce();
    expect(api.resolve).toHaveBeenCalledOnce();
    expect(control(render(),'button','Khôi phục bằng CAS')).toBeDefined();
  });
  it('a backend exception after historical COMMITTED triggers only a read-only status query',async()=>{
    api.commit.mockRejectedValue(new Error('COMMITTED trong lịch sử; không nhập lại'));
    api.resolve.mockResolvedValue({status:'committed-historical',
      operationId,generationId:'gen_'+operationId});
    await reviewCandidate();
    control(render(),'button','Chuyển thế hệ bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(notice(render())).toContain('ĐÃ COMMIT THÀNH CÔNG TRONG LỊCH SỬ'));
    expect(notice(render())).not.toContain('Không xác minh được kết quả ghi');
    expect(api.resolve).toHaveBeenCalledOnce();
    expect(api.commit).toHaveBeenCalledOnce();
    expect(api.stage).toHaveBeenCalledOnce();
    expect(api.restore).not.toHaveBeenCalled();
  });
  it('a restoration that becomes historical is not falsely shown as failed',async()=>{
    const restorationId='restore_test_0001';
    api.resolve.mockImplementation(async(_db:unknown,id:string)=>({
      status:id===restorationId?'committed-historical':'committed-active',
      operationId:id,generationId:'gen_'+id
    }));
    await reviewCandidate();
    control(render(),'button','Chuyển thế hệ bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(notice(render())).toContain('ĐÃ COMMIT THÀNH CÔNG — ĐANG HOẠT ĐỘNG'));
    api.restore.mockRejectedValue(new Error('Khôi phục đã COMMITTED trong lịch sử'));
    control(render(),'input','Mã khôi phục mới').props.onChange({currentTarget:{value:restorationId}});
    control(render(),'input','Xác nhận khôi phục').props.onChange({
      currentTarget:{value:'KHOI PHUC '+restorationId}
    });
    control(render(),'button','Khôi phục bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(notice(render())).toContain('ĐÃ COMMIT THÀNH CÔNG TRONG LỊCH SỬ'));
    expect(api.restore).toHaveBeenCalledOnce();
    expect(api.resolve).toHaveBeenCalledTimes(2);
    expect(api.commit).toHaveBeenCalledOnce();
  });
  it('stale old primitive status cannot be misreported as a failed commit',async()=>{
    api.resolve.mockResolvedValue('not-committed'); // pre-ACK L1 implementation
    await reviewCandidate();
    control(render(),'button','Chuyển thế hệ bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(notice(render())).toContain('CHƯA RÕ TRẠNG THÁI'));
    expect(notice(render())).not.toContain('CHƯA GHI NHẬN COMMIT');
    expect(api.commit).toHaveBeenCalledOnce();
  });
  it('no status query is permitted by the UI outside Emulator',()=>{
    h.begin();
    const tree=VersionedExcelReplacementPanel({...props,enabled:false});
    expect(control(tree,'button','Tra cứu trạng thái operationId').props.disabled).toBe(true);
    control(tree,'button','Tra cứu trạng thái operationId').props.onClick();
    expect(api.resolve).not.toHaveBeenCalled();
  });
});
