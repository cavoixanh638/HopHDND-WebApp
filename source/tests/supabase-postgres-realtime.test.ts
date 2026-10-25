import {describe,it,expect,vi,afterEach} from 'vitest';
import {SupabasePostgresRealtime} from '../src/data/supabase-postgres-realtime';

type Packet={topic:string;event:string;payload:unknown;ref:string;join_ref:string|null};
class FakeWebSocket {
  static readonly OPEN=1;
  readyState=0;
  onopen:((ev:Event)=>void)|null=null;
  onclose:((ev:CloseEvent)=>void)|null=null;
  onmessage:((ev:MessageEvent)=>void)|null=null;
  onerror:((ev:Event)=>void)|null=null;
  readonly sent:Packet[]=[];
  closed=false;
  constructor(public readonly url:string){}
  send(body:string){this.sent.push(JSON.parse(body) as Packet);}
  open(){this.readyState=FakeWebSocket.OPEN;this.onopen?.({} as Event);}
  receive(packet:Packet){this.onmessage?.({data:JSON.stringify(packet)} as MessageEvent);}
  close(){this.closed=true;this.readyState=3;this.onclose?.({} as CloseEvent);}
}
afterEach(()=>{vi.unstubAllGlobals();});
describe('Native Supabase Realtime transport (mock only, cloud E2E is a release gate)',()=>{
  it('joins only hdnd_items with authenticated JWT, invalidates only after ACK, closes on source switch',async()=>{
    vi.stubGlobal('WebSocket',FakeWebSocket);
    let socket:FakeWebSocket|null=null;
    let changed=0;const errors:string[]=[];
    const tracker=new SupabasePostgresRealtime(
      {url:'https://staging.supabase.co',publishableKey:'sb_publishable_test'},
      async()=> 'jwt-for-supabase-only',
      ()=>{changed++;},
      error=>errors.push(error.message),
      url=>{socket=new FakeWebSocket(url);return socket as unknown as WebSocket;}
    );
    const stop=tracker.start();
    expect(socket).not.toBeNull();
    const sock=socket!;
    expect(sock.url).toContain('wss://staging.supabase.co/realtime/v1/websocket');
    expect(sock.url).toContain('vsn=1.0.0');
    sock.open();await Promise.resolve();await Promise.resolve();
    const join=sock.sent.find(p=>p.event==='phx_join');
    expect(join?.topic).toBe('realtime:hdnd-items-view');
    expect(join?.payload).toMatchObject({
      access_token:'jwt-for-supabase-only',
      config:{private:false,postgres_changes:[{event:'*',schema:'public',table:'hdnd_items'}]}
    });
    expect(join?.payload).not.toHaveProperty('record_id');
    const invalidation:Packet={
      topic:'realtime:hdnd-items-view',event:'postgres_changes',payload:{data:{table:'hdnd_items'}},
      ref:'0',join_ref:'1'
    };
    sock.receive(invalidation);
    expect(changed).toBe(0);
    sock.receive({topic:'realtime:hdnd-items-view',event:'phx_reply',
      payload:{status:'ok',response:{}},ref:'1',join_ref:'1'});
    sock.receive(invalidation);
    expect(changed).toBe(1);
    sock.receive({...invalidation,topic:'realtime:hdnd_cell_locks'});
    expect(changed).toBe(1);
    expect(errors).toEqual([]);
    stop();
    expect(sock.closed).toBe(true);
    sock.receive(invalidation);
    expect(changed).toBe(1);
  });
});
