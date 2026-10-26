import {describe,it,expect,vi} from 'vitest';
import {SupabaseRepository,parseSupabaseItem,type SupabaseConnection} from '../src/data/supabase-repository';
import {createDemoItems} from '../src/data/demo-items';
import type {EditableField,Item,Patch} from '../shared/types';

const UUID_A='11111111-1111-4111-8111-111111111111';
const UUID_B='22222222-2222-4222-8222-222222222222';
const UUID_C='33333333-3333-4333-8333-333333333333';
const row=createDemoItems(1)[0];
function databaseRow(item:Item){
  const {recordId,displayCode,stt,revision,archivedAt,...fields}=item;
  return {record_id:recordId,display_code:displayCode,stt,revision,archived_at:archivedAt,fields};
}
function setup(fakeFetch:typeof fetch,changes?:SupabaseConnection['onBusinessChange'],
  getLease?:SupabaseConnection['getLease']){
  return new SupabaseRepository({
    url:'https://test-project.supabase.co',publishableKey:'sb_publishable_test',
    getAccessToken:async()=> 'demo-jwt',
    getLease:getLease??((_id:string,_f:EditableField)=>({session:UUID_A,token:UUID_B})),
    onBusinessChange:changes??(()=>()=>{}),
    fetcher:fakeFetch
  });
}
const json=(value:unknown,code=200)=>new Response(JSON.stringify(value),{
  status:code,headers:{'content-type':'application/json'}
});

describe('Supabase repository (offline client contract, not server security test)',()=>{
  it('converts database rows to the existing Item type and validates all editable fields',()=>{
    expect(parseSupabaseItem(databaseRow(row))).toEqual(row);
    const altered=databaseRow(row);
    (altered.fields as Record<string,unknown>).content=null;
    expect(()=>parseSupabaseItem(altered)).toThrow();
  });
  it('never permits a business field to shadow the immutable record ID',()=>{
    const r={...databaseRow(row),fields:{...databaseRow(row).fields,recordId:'forged'}};
    expect(parseSupabaseItem(r).recordId).toBe(row.recordId);
  });
  it('reads through authenticated PostgREST and returns sorted rows',async()=>{
    const fetchMock=vi.fn(async() => json([databaseRow(row)])) as unknown as typeof fetch;
    const repo=setup(fetchMock);
    expect(await repo.list()).toEqual([row]);
    const [u,request]=vi.mocked(fetchMock).mock.calls[0];
    expect(String(u)).toContain('/rest/v1/hdnd_items?select=');
    expect((request as RequestInit).headers).toMatchObject({authorization:'Bearer demo-jwt'});
  });
  it('writes only by protected RPC with an owned per-tab lease and verifies server ACK',async()=>{
    const patch:Patch={recordId:row.recordId,baseRevision:1,
      changes:{note:'Đã xem lại'},baseValues:{note:row.note},operationId:UUID_C};
    const fetchMock=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      expect(String(input)).toContain('/rpc/hdnd_save_cell_changes');
      expect(init?.method).toBe('POST');
      const args=JSON.parse(String(init?.body));
      expect(args).toMatchObject({p_record_id:row.recordId,p_session:UUID_A,
        p_operation_id:UUID_C,p_tokens:{note:UUID_B},
        p_changes:{note:'Đã xem lại'},p_base:{note:row.note}});
      return json({ok:true,item:{...row,note:'Đã xem lại',revision:2}});
    }) as unknown as typeof fetch;
    const result=await setup(fetchMock).save([patch]);
    expect(result).toMatchObject([{recordId:row.recordId,ok:true,item:{note:'Đã xem lại',revision:2}}]);
  });
  it('does not submit a write without a matching lock and keeps draft on failure',async()=>{
    const fetchMock=vi.fn(async()=>json({ok:true}));
    const repo=setup(fetchMock as unknown as typeof fetch,undefined,()=>null);
    const result=await repo.save([{recordId:row.recordId,baseRevision:1,
      baseValues:{note:row.note},changes:{note:'X'},operationId:UUID_C}]);
    expect(result[0]).toMatchObject({ok:false,error:'VALIDATION'});
    expect(result[0].message).toContain('Giữ nguyên nháp');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not count a malformed server acknowledgement as a saved patch',async()=>{
    const fetchMock=vi.fn(async()=>json({ok:true,item:{...row,note:'wrong'}})) as unknown as typeof fetch;
    const result=await setup(fetchMock).save([{recordId:row.recordId,baseRevision:1,
      baseValues:{note:row.note},changes:{note:'expected'},operationId:UUID_C}]);
    expect(result[0].ok).toBe(false);
  });
  it('on realtime reconnect, only the freshest completed load is applied',async()=>{
    const resolvers:((v:Response)=>void)[]=[];
    const http=vi.fn(()=>new Promise<Response>(resolve=>resolvers.push(resolve))) as unknown as typeof fetch;
    let signal:()=>void=()=>{};
    const output:Item[][]=[];
    const repo=setup(http,cb=>{signal=cb;return()=>{signal=()=>{}};});
    const stop=repo.subscribe(rows=>output.push(rows),e=>{throw e});
    signal();
    // request() awaits the Auth JWT before dispatching either fetch.
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(resolvers).toHaveLength(2);
    resolvers[1](json([databaseRow({...row,revision:2,note:'new'})]));
    await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,0));
    resolvers[0](json([databaseRow(row)]));
    await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,0));
    expect(output).toHaveLength(1);
    expect(output[0][0].revision).toBe(2);
    stop();
  });
});
