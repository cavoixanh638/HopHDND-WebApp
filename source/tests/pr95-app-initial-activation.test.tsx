import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import type {ActiveDatasetPointer} from '../src/data/dataset-replacement-integrity';

const hooks=vi.hoisted(()=>{
  const state:unknown[]=[];let idx=0;
  return {reset(){state.length=0;idx=0;},begin(){idx=0;},
    useState<T>(initial:T|(()=>T)){
      const index=idx++;
      if(!(index in state))state[index]=typeof initial==='function'?(initial as ()=>T)():initial;
      return [state[index] as T,(next:T|((current:T)=>T))=>{
        state[index]=typeof next==='function'?(next as (current:T)=>T)(state[index] as T):next;
      }] as const;
    }};
});
const calls=vi.hoisted(()=>({
  prepare:vi.fn(),activate:vi.fn(),stage:vi.fn(),read:vi.fn(),
  commit:vi.fn(),restore:vi.fn(),resolve:vi.fn(),
  freeze:vi.fn(),leases:vi.fn()
}));
vi.mock('react',async importOriginal=>({
  ...(await importOriginal<typeof import('react')>()),useState:hooks.useState
}));
vi.mock('../src/data/firebase-versioned-replacement',()=>({
  prepareInitialDatasetActivation:calls.prepare,
  commitInitialDatasetActivation:calls.activate,
  stageDatasetReplacement:calls.stage,
  readStagedDataset:calls.read,
  commitDatasetReplacement:calls.commit,
  restoreDatasetBackup:calls.restore,
  resolveDatasetOperation:calls.resolve
}));
vi.mock('../src/data/freeze-control',()=>({
  readFreeze:calls.freeze,activeEditLeaseCount:calls.leases
}));
import {VersionedExcelReplacementPanel} from '../src/features/settings/VersionedExcelReplacementPanel';
const operationId='excel_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const rows=createDemoItems(2);
const manifest={schemaVersion:1,operationId,generationId:'gen_'+operationId,
  rowCount:2,digest:'a'.repeat(64)};
const preview={oldCount:2,newCount:2,difference:{added:[],changed:[],removed:[],unchanged:[]},
  totals:{}};
const frozen={mode:'FROZEN',revision:3,epoch:1,actor:'admin',
  changedAt:1,deadline:0,closedAt:2};
const initialApproval={operationId,manifest,legacyBaseline:'b'.repeat(64),
  legacyRowCount:2,freezeRevision:3,freezeEpoch:1,preview,fileName:'safe.xlsx'};
const active:ActiveDatasetPointer={generationId:'gen_initial_abcdefghijkl',
  operationId:'initial_abcdefghijkl',revision:1,rowCount:2,digest:'c'.repeat(64)};
const replacementApproval={operationId,manifest,expected:active,
  baseline:'confirmed',preview,fileName:'safe.xlsx'};
const common={database:{} as Database,user:{uid:'admin'} as User,
  items:rows,current:rows,fileName:'safe.xlsx',reports:[],enabled:true,readyForMutation:true};
function nodes(value:unknown):any[]{
  if(Array.isArray(value))return value.flatMap(nodes);
  if(!value||typeof value!=='object')return [];
  const node=value as {type?:unknown;props?:{children?:unknown}};
  return [node,...nodes(node.props?.children)];
}
function label(value:unknown):string{
  if(Array.isArray(value))return value.map(label).join('');
  if(value&&typeof value==='object')return label((value as any).props?.children);
  return typeof value==='string'||typeof value==='number'?String(value):'';
}
function render(overrides:Record<string,unknown>={}){
  hooks.begin();
  return VersionedExcelReplacementPanel({...common,active:null,...overrides});
}
function find(tree:unknown,type:string,match:string){
  const node=nodes(tree).find(n=>n.type===type&&(label(n).includes(match)||
    n.props?.['aria-label']===match||n.props?.id===match));
  if(!node)throw Error('Control missing: '+type+' '+match);
  return node as {props:any};
}
function messages(tree:unknown){
  return nodes(tree).filter(n=>n.type==='p'&&
    ['status','alert'].includes(n.props?.role)).map(label).join(' ');
}
async function review(overrides:Record<string,unknown>={}){
  find(render(overrides),'button','Ghi staging, đọc lại').props.onClick();
  await vi.waitFor(()=>expect(calls.read).toHaveBeenCalledOnce());
  await vi.waitFor(()=>expect(messages(render(overrides))).toContain('staging'));
}
beforeEach(()=>{
  hooks.reset();vi.clearAllMocks();
  calls.freeze.mockResolvedValue(frozen);
  calls.leases.mockResolvedValue(0);
  calls.prepare.mockResolvedValue(initialApproval);
  calls.stage.mockResolvedValue(replacementApproval);
  calls.read.mockResolvedValue(rows);
  calls.activate.mockResolvedValue({status:'committed',operationId});
  calls.commit.mockResolvedValue({status:'committed',operationId});
  calls.resolve.mockImplementation(async(_db:unknown,id:string)=>({
    status:'committed-active',operationId:id,generationId:'gen_'+id
  }));
  vi.stubGlobal('crypto',{randomUUID:()=> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'});
});
afterEach(()=>vi.unstubAllGlobals());

describe('L2 API-CHANGE-01 — admin Emulator-only first V2 activation',()=>{
  it('initial mode requires server-confirmed FROZEN and zero active leases, stages and reads back before CAS',async()=>{
    await review();
    expect(calls.freeze).toHaveBeenCalledTimes(2);
    expect(calls.leases).toHaveBeenCalledTimes(2);
    expect(calls.prepare).toHaveBeenCalledOnce();
    expect(calls.read).toHaveBeenCalledOnce();
    expect(calls.stage).not.toHaveBeenCalled();
    const confirmation='KHOI TAO V2 '+operationId+' 2 2';
    const before=find(render(),'button','Kích hoạt V2 lần đầu bằng CAS');
    expect(before.props.disabled).toBe(true);
    find(render(),'input','Xác nhận kích hoạt V2 lần đầu').props.onChange({
      currentTarget:{value:confirmation}
    });
    expect(find(render(),'button','Kích hoạt V2 lần đầu bằng CAS').props.disabled).toBe(false);
    find(render(),'button','Kích hoạt V2 lần đầu bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(calls.activate).toHaveBeenCalledOnce());
    expect(calls.activate.mock.calls[0][3]).toBe(confirmation);
    expect(calls.commit).not.toHaveBeenCalled();
    expect(calls.resolve).toHaveBeenCalledOnce();
  });
  it('rejects OPEN, DRAINING and stale freeze revision without preparing a V2 candidate',async()=>{
    for(const mode of ['OPEN','DRAINING']){
      hooks.reset();calls.prepare.mockClear();calls.read.mockClear();
      calls.freeze.mockResolvedValueOnce({...frozen,mode});
      find(render(),'button','Ghi staging, đọc lại').props.onClick();
      await vi.waitFor(()=>expect(messages(render())).toContain('FROZEN'));
      expect(calls.prepare).not.toHaveBeenCalled();
    }
    hooks.reset();calls.prepare.mockClear();calls.read.mockClear();
    calls.freeze.mockReset()
      .mockResolvedValueOnce(frozen).mockResolvedValueOnce({...frozen,revision:4});
    find(render(),'button','Ghi staging, đọc lại').props.onClick();
    await vi.waitFor(()=>expect(messages(render())).toContain('Freeze revision/epoch'));
    expect(calls.prepare).toHaveBeenCalledOnce();
    expect(messages(render())).toContain('Freeze revision/epoch');
  });
  it('refuses active edit leases even if FROZEN was acknowledged',async()=>{
    calls.leases.mockResolvedValue(1);
    find(render(),'button','Ghi staging, đọc lại').props.onClick();
    await vi.waitFor(()=>expect(messages(render())).toContain('lease'));
    expect(calls.prepare).not.toHaveBeenCalled();
  });
  it('Emulator-only, clean drafts and current comparison are preconditions; disabled button cannot write',async()=>{
    for(const props of [{enabled:false},{readyForMutation:false},{comparisonStale:true}]){
      hooks.reset();
      const root=render(props);
      const button=find(root,'button','Ghi staging, đọc lại');
      expect(button.props.disabled).toBe(true);
      button.props.onClick();
    }
    expect(calls.prepare).not.toHaveBeenCalled();
  });
  it('UNKNOWN activation stops all automatic replays and permits only manual status lookup',async()=>{
    calls.activate.mockResolvedValue({status:'unknown',operationId});
    await review();
    find(render(),'input','Xác nhận kích hoạt V2 lần đầu').props.onChange({
      currentTarget:{value:'KHOI TAO V2 '+operationId+' 2 2'}
    });
    find(render(),'button','Kích hoạt V2 lần đầu bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(messages(render())).toContain('CHƯA RÕ TRẠNG THÁI'));
    const retry=find(render(),'button','Kích hoạt V2 lần đầu bằng CAS');
    expect(retry.props.disabled).toBe(true);
    retry.props.onClick();
    expect(calls.activate).toHaveBeenCalledOnce();
    expect(calls.resolve).not.toHaveBeenCalled();
    find(render(),'button','Tra cứu trạng thái operationId').props.onClick();
    await vi.waitFor(()=>expect(calls.resolve).toHaveBeenCalledOnce());
  });
  it('lost initial commit ACK is recovered read-only as historical COMMITTED, never retried',async()=>{
    calls.activate.mockRejectedValue(new Error('ACK lost after server COMMITTED'));
    calls.resolve.mockResolvedValue({status:'committed-historical',
      operationId,generationId:'gen_'+operationId});
    await review();
    find(render(),'input','Xác nhận kích hoạt V2 lần đầu').props.onChange({
      currentTarget:{value:'KHOI TAO V2 '+operationId+' 2 2'}
    });
    const button=find(render(),'button','Kích hoạt V2 lần đầu bằng CAS');
    button.props.onClick();
    await vi.waitFor(()=>expect(messages(render())).toContain('ĐÃ COMMIT THÀNH CÔNG TRONG LỊCH SỬ'));
    expect(calls.activate).toHaveBeenCalledOnce();
    expect(calls.resolve).toHaveBeenCalledOnce();
    expect(calls.stage).not.toHaveBeenCalled();
    expect(find(render(),'button','Kích hoạt V2 lần đầu bằng CAS').props.disabled).toBe(true);
  });
  it('freeze revision changed at final confirmation blocks first-activation CAS',async()=>{
    await review();
    find(render(),'input','Xác nhận kích hoạt V2 lần đầu').props.onChange({
      currentTarget:{value:'KHOI TAO V2 '+operationId+' 2 2'}
    });
    calls.freeze.mockResolvedValueOnce({...frozen,revision:4});
    calls.resolve.mockResolvedValue({status:'not-committed',operationId});
    find(render(),'button','Kích hoạt V2 lần đầu bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(messages(render())).toContain('Không xác minh được kết quả ghi'));
    expect(calls.activate).not.toHaveBeenCalled();
    expect(calls.resolve).toHaveBeenCalledOnce();
  });
  it('active V2 mode routes to replacement/restore, not prepare initial, without a freeze side effect',async()=>{
    await review({active});
    expect(calls.stage).toHaveBeenCalledOnce();
    expect(calls.prepare).not.toHaveBeenCalled();
    expect(calls.freeze).not.toHaveBeenCalled();
    const confirm='THAY '+operationId+' 2 2';
    find(render({active}),'input','Xác nhận thay thế toàn bộ').props.onChange({currentTarget:{value:confirm}});
    find(render({active}),'button','Chuyển thế hệ bằng CAS').props.onClick();
    await vi.waitFor(()=>expect(calls.commit).toHaveBeenCalledOnce());
  });
});
