import {describe,it,expect,vi} from 'vitest';
import {sourceNamespace,sourceSwitchBlocker,resolveTabSource,type SourceSwitchState} from '../src/data/parallel-source-selection';
import {SupabasePreviewRepository,SupabaseAnonymousPreviewAuth,validateSupabasePreviewConfig,readSupabaseTabConfig,saveSupabaseTabConfig} from '../src/data/supabase-preview-source';
import {createDemoItems} from '../src/data/demo-items';
import type {Item,Patch} from '../shared/types';

const config={url:'https://qa-example.supabase.co',publishableKey:'sb_publishable_unit-test'};
const clear:SourceSwitchState={
  drafts:0,protectedRecovery:false,busy:false,cachePending:false,
  editorUnsaved:false,editorOpen:false,heldLeases:0
};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{'content-type':'application/json'}
});
function memoryStorage(){
  const cache=new Map<string,string>();
  return {
    getItem:(key:string)=>cache.get(key)??null,
    setItem:(key:string,value:string)=>{cache.set(key,value);},
    removeItem:(key:string)=>{cache.delete(key);}
  };
}
const authResponse=(expires_in:number,marker='123456789ab')=>({
  access_token:'header.payload.'+marker,
  refresh_token:'refresh-token-'+marker,
  expires_in
});
const dbRow=(item:Item)=>{
  const {recordId,displayCode,stt,revision,archivedAt,...fields}=item;
  return {record_id:recordId,display_code:displayCode,stt,revision,archived_at:archivedAt,fields};
};

describe('tab-only source policy (no Firebase admin mutation)',()=>{
  it('uses local override without changing Firebase shared preference',()=>{
    expect(resolveTabSource('supabase','primary',null)).toBe('supabase');
    expect(resolveTabSource(null,'primary',null)).toBe('primary');
    expect(resolveTabSource('supabase','primary','database')).toBe('database');
    expect(sourceNamespace('primary','url','ref')).toBe('pages:primary');
    expect(sourceNamespace('supabase','url','ref')).toBe('pages:supabase:ref');
    expect(sourceNamespace('database','url','ref')).not.toBe(sourceNamespace('supabase','url','ref'));
  });
  it('allows a clean change but blocks drafts, protected recovery, leases, editors, and loading',()=>{
    expect(sourceSwitchBlocker(clear)).toBeNull();
    for(const state of [
      {drafts:1},{protectedRecovery:true},{heldLeases:1},
      {editorUnsaved:true},{editorOpen:true},{busy:true},{cachePending:true}
    ])expect(sourceSwitchBlocker({...clear,...state})).toBeTruthy();
  });
  it('stores only an explicitly validated public staging connection in this tab',()=>{
    const memory=memoryStorage();
    expect(readSupabaseTabConfig(memory)).toBeNull();
    expect(saveSupabaseTabConfig(config,memory)).toBe(true);
    expect(readSupabaseTabConfig(memory)).toEqual(config);
    expect(saveSupabaseTabConfig({...config,publishableKey:'sb_secret_bad'},memory)).toBe(false);
    expect(readSupabaseTabConfig(memory)).toEqual(config);
  });
  it('never accepts secret keys, unsupported hosts or non-HTTPS backends',()=>{
    expect(validateSupabasePreviewConfig(config.url,config.publishableKey)).toEqual(config);
    expect(validateSupabasePreviewConfig(config.url,'sb_secret_forbidden')).toBeNull();
    expect(validateSupabasePreviewConfig('https://attacker.example.com','sb_publishable_public')).toBeNull();
    expect(validateSupabasePreviewConfig('http://qa-example.supabase.co','sb_publishable_public')).toBeNull();
  });
});

describe('Supabase staging anonymous auth and READ-ONLY REST',()=>{
  it('uses only Supabase Auth, keeps one session per tab and refreshes rotated token',async()=>{
    const storage=memoryStorage();
    const fetcher=vi.fn(async(input:RequestInfo|URL,options?:RequestInit)=>{
      if(String(input).endsWith('/auth/v1/signup')){
        expect(options?.method).toBe('POST');
        expect(options?.headers).toMatchObject({apikey:config.publishableKey});
        expect(JSON.parse(String(options?.body))).toMatchObject({data:{}});
        return json(authResponse(1,'first-login'));
      }
      expect(String(input)).toContain('grant_type=refresh_token');
      expect(JSON.parse(String(options?.body))).toEqual({refresh_token:'refresh-token-first-login'});
      return json(authResponse(3600,'rotated-key'));
    }) as unknown as typeof fetch;
    const auth=new SupabaseAnonymousPreviewAuth(config,fetcher,storage);
    const first=await Promise.all([auth.getAccessToken(),auth.getAccessToken()]);
    expect(first[0]).toBe(first[1]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const second=await auth.getAccessToken();
    expect(second).toContain('rotated-key');
    expect(fetcher).toHaveBeenCalledTimes(2);
    const reloaded=new SupabaseAnonymousPreviewAuth(config,fetcher,storage);
    expect(await reloaded.getAccessToken()).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('fails closed on bad authentication: no list attempt, no Firebase fallback',async()=>{
    const fetcher=vi.fn(async()=>json({msg:'Anonymous sign-ins disabled'},401)) as unknown as typeof fetch;
    const source=new SupabasePreviewRepository(config,fetcher,memoryStorage());
    await expect(source.list()).rejects.toThrow('Không đăng nhập được Supabase');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(source.readOnly).toBe(true);
    expect(source.canDraft).toBe(false);
  });
  it('loads staging business rows for reports but never invokes mutation RPC',async()=>{
    const row=createDemoItems(1)[0];
    const fetchMock=vi.fn(async(input:RequestInfo|URL,options?:RequestInit)=>{
      if(String(input).includes('/signup'))return json(authResponse(3600,'good-login'));
      expect(String(input)).toContain('/rest/v1/hdnd_items');
      expect(options?.method).toBe('GET');
      expect(String((options?.headers as Record<string,string>).authorization)).toContain('Bearer header.payload.');
      return json([dbRow(row)]);
    });
    const source=new SupabasePreviewRepository(config,fetchMock as unknown as typeof fetch,memoryStorage());
    expect(await source.list()).toEqual([row]);
    const dummy:Patch={recordId:row.recordId,operationId:'33333333-3333-4333-8333-333333333333',
      baseRevision:row.revision,baseValues:{note:row.note},changes:{note:'forbidden'}};
    await expect(source.save([dummy])).rejects.toThrow('chỉ được đọc');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url])=>!String(url).includes('/rpc/'))).toBe(true);
  });
  it('loads server-signed source capabilities; never trusts Firebase claims',async()=>{
    const serverState={userId:'11111111-1111-4111-8111-111111111111',isAdmin:true,
      aclRevision:1,rights:{columns:{note:true},rows:{},cells:{}},
      controlRevision:1,mode:'OPEN',guestEditingLocked:true,epoch:0,deadline:null};
    const request=vi.fn(async(input:RequestInfo|URL,options?:RequestInit)=>{
      if(String(input).includes('/auth/v1/signup'))return json(authResponse(3600,'api-session'));
      if(String(input).includes('/rest/v1/rpc/hdnd_access_state')){
        expect(options?.method).toBe('POST');
        expect((options?.headers as Record<string,string>).authorization).toContain('Bearer header.payload.');
        return json(serverState);
      }
      throw new Error('Unexpected endpoint '+String(input));
    });
    const source=new SupabasePreviewRepository(config,request as unknown as typeof fetch,memoryStorage());
    expect(source.readOnly).toBe(true);
    expect(await source.accessState()).toEqual(serverState);
    source.setVerifiedWriteMode(true);
    expect(source.readOnly).toBe(false);
    expect(source.canDraft).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('sends an authorized patch only through a token-bound Supabase RPC',async()=>{
    const row=createDemoItems(1)[0];
    const state={userId:'11111111-1111-4111-8111-111111111111',isAdmin:true,
      aclRevision:1,rights:{columns:{note:true},rows:{},cells:{}},
      controlRevision:1,mode:'OPEN',guestEditingLocked:true,epoch:0,deadline:null};
    const token='22222222-2222-4222-8222-222222222222';
    const methods:string[]=[];
    const fetcher=vi.fn(async(input:RequestInfo|URL,options?:RequestInit)=>{
      const endpoint=String(input);methods.push(endpoint);
      if(endpoint.includes('/signup'))return json(authResponse(3600,'authorized'));
      if(endpoint.endsWith('/hdnd_access_state'))return json(state);
      if(endpoint.endsWith('/hdnd_acquire_cell')){
        const args=JSON.parse(String(options?.body)) as {p_session:string};
        return json({token,session:args.p_session,expiresAt:new Date(Date.now()+45000).toISOString()});
      }
      if(endpoint.endsWith('/hdnd_save_cell_changes')){
        const args=JSON.parse(String(options?.body));
        expect(args.p_tokens).toEqual({note:token});
        expect(args.p_changes).toEqual({note:'Đã kiểm tra'});
        return json({ok:true,item:{...row,note:'Đã kiểm tra',revision:row.revision+1}});
      }
      if(endpoint.endsWith('/hdnd_release_cell'))return json(true);
      throw new Error('Unexpected network: '+endpoint);
    }) as unknown as typeof fetch;
    const source=new SupabasePreviewRepository(config,fetcher,memoryStorage());
    await source.accessState();
    source.setVerifiedWriteMode(true);
    expect(await source.leaseManager.acquire(row.recordId,'note','short')).toBe(true);
    const patch:Patch={recordId:row.recordId,baseRevision:row.revision,
      operationId:'33333333-3333-4333-8333-333333333333',
      changes:{note:'Đã kiểm tra'},baseValues:{note:row.note}};
    const result=await source.save([patch]);
    expect(result).toMatchObject([{ok:true,item:{note:'Đã kiểm tra'}}]);
    await source.leaseManager.finish(row.recordId,'note');
    expect(methods.some(x=>x.includes('/rest/v1/rpc/hdnd_save_cell_changes'))).toBe(true);
    expect(methods.every(x=>x.startsWith(config.url))).toBe(true);
    expect(methods.some(x=>x.includes('firebase'))).toBe(false);
  });
  it('rejects admin permission writes until server confirms Google admin identity',async()=>{
    const request=vi.fn(async(input:RequestInfo|URL)=>{
      if(String(input).includes('/auth/v1/signup'))return json(authResponse(3600,'guest'));
      if(String(input).endsWith('/hdnd_access_state'))
        return json({userId:'11111111-1111-4111-8111-111111111111',
          isAdmin:false,aclRevision:1,rights:{columns:{},rows:{},cells:{}},
          controlRevision:1,mode:'OPEN',guestEditingLocked:true,epoch:0,deadline:null});
      throw new Error('WRITE_ATTEMPTED');
    });
    const source=new SupabasePreviewRepository(config,request as unknown as typeof fetch,memoryStorage());
    await source.accessState();
    await expect(source.savePermissions({columns:{note:true}},1)).rejects.toThrow('quản trị');
    expect(request.mock.calls.some(([u])=>String(u).includes('set_permissions'))).toBe(false);
  });

});
