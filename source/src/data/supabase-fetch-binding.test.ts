import {afterEach,expect,it,vi} from 'vitest';
import {SupabasePreviewRepository,type SupabasePublicConfig} from './supabase-preview-source';

afterEach(()=>vi.unstubAllGlobals());

it('does not detach browser Window.fetch for Supabase signup, RPC and REST',async()=>{
  const cfg:SupabasePublicConfig={
    url:'https://uguhyunuzsdrkykqgdmq.supabase.co',
    publishableKey:'sb_publishable_test'};
  const urls:string[]=[];
  // Mimic Chrome's Illegal invocation guard. The previous code stored `fetch`
  // then called it as `this.fetcher()`, binding the wrong this.
  vi.stubGlobal('fetch',function(this:unknown,input:RequestInfo|URL,_init?:RequestInit){
    if(this!==globalThis)throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    const uri=String(input);urls.push(uri);
    if(uri.includes('/auth/v1/signup'))return Promise.resolve(new Response(JSON.stringify({
      access_token:'long_dummy_access_token_for_testing',
      refresh_token:'long_dummy_refresh_token_for_testing',expires_in:3600
    }),{status:200,headers:{'content-type':'application/json'}}));
    if(uri.includes('/rest/v1/rpc/hdnd_access_state'))return Promise.resolve(new Response(JSON.stringify({
      userId:'ua-1',isAdmin:false,aclRevision:1,rights:{columns:{}},
      controlRevision:1,mode:'OPEN',guestEditingLocked:true,epoch:0,deadline:null
    }),{status:200,headers:{'content-type':'application/json'}}));
    if(uri.includes('/rest/v1/hdnd_items?'))return Promise.resolve(new Response('[]',{
      status:200,headers:{'content-type':'application/json'}}));
    throw new Error('Unexpected URL '+uri);
  });
  const repo=new SupabasePreviewRepository(cfg,undefined,null);
  const access=await repo.accessState();
  expect(access.isAdmin).toBe(false);
  expect(await repo.list()).toEqual([]);
  expect(urls).toHaveLength(3);
  expect(urls[0]).toContain('/auth/v1/signup');
  expect(urls[1]).toContain('/rest/v1/rpc/hdnd_access_state');
  expect(urls[2]).toContain('/rest/v1/hdnd_items?');
});
