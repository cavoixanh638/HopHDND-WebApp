/**
 * Authenticated Supabase Postgres Changes, protocol v1 (JSON/Phoenix).
 * This receives INVALIDATION signals only: data still comes from secured REST
 * readback. 15-second polling stays as a safety fallback while connected.
 * Never publishes business rows, tokens, or lock records over public channels.
 */
import type {SupabasePublicConfig} from './supabase-preview-source';

type Invalidate=()=>void;
type Fail=(error:Error)=>void;
type SocketFactory=(url:string)=>WebSocket;
const TOPIC='realtime:hdnd-items-view';
const POLL_MS=15000;
export class SupabasePostgresRealtime {
  private stopped=false;
  private socket:WebSocket|null=null;
  private pollTimer:ReturnType<typeof setInterval>|null=null;
  private heartbeatTimer:ReturnType<typeof setInterval>|null=null;
  private retryTimer:ReturnType<typeof setTimeout>|null=null;
  private retryDelay=1000;
  private seq=0;
  private lastToken='';
  private joined=false;
  constructor(private readonly cfg:SupabasePublicConfig,
    private readonly getToken:()=>Promise<string>,
    private readonly invalidate:Invalidate,
    private readonly fail:Fail,
    private readonly socketFactory:SocketFactory=(url)=>new WebSocket(url)){}
  start():()=>void{
    this.pollTimer=setInterval(()=>{
      if(typeof document==='undefined'||!document.hidden)this.invalidate();
    },POLL_MS);
    if(typeof WebSocket!=='undefined')void this.connect();
    return()=>this.stop();
  }
  private send(topic:string,event:string,payload:unknown):void{
    const socket=this.socket;
    if(!socket||socket.readyState!==WebSocket.OPEN)return;
    socket.send(JSON.stringify({
      topic,event,payload,ref:String(++this.seq),join_ref:topic===TOPIC?'1':null
    }));
  }
  private async connect():Promise<void>{
    if(this.stopped)return;
    const url=new URL(this.cfg.url.replace(/^https:/,'wss:')+'/realtime/v1/websocket');
    url.searchParams.set('apikey',this.cfg.publishableKey);
    url.searchParams.set('vsn','1.0.0');
    let socket:WebSocket;
    try{socket=this.socketFactory(url.toString());}
    catch(e){this.report(e);this.reconnect();return;}
    this.socket=socket;
    this.seq=0;this.joined=false;this.lastToken='';
    socket.onopen=()=>{
      void this.getToken().then(jwt=>{
        if(this.stopped||this.socket!==socket||socket.readyState!==WebSocket.OPEN)return;
        this.lastToken=jwt;
        this.send(TOPIC,'phx_join',{
          config:{broadcast:{ack:false,self:false},presence:{enabled:false},
            private:false,postgres_changes:[{event:'*',schema:'public',table:'hdnd_items'}]},
          access_token:jwt
        });
        this.heartbeatTimer=setInterval(()=>{void this.heartbeat();},25000);
      }).catch(error=>{this.report(error);socket.close();});
    };
    socket.onmessage=event=>{
      if(this.stopped||this.socket!==socket)return;
      let raw:unknown;
      try{raw=JSON.parse(String(event.data));}catch{return;}
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
      const msg=raw as {topic?:unknown;event?:unknown;payload?:unknown;ref?:unknown};
      if(msg.topic!==TOPIC)return;
      if(msg.event==='phx_reply'){
        const p=msg.payload&&typeof msg.payload==='object'?msg.payload as Record<string,unknown>:{};
        if(p.status==='error'){this.report(new Error('Realtime Supabase từ chối kênh; tiếp tục kiểm tra REST mỗi 15 giây.'));socket.close();return;}
        if(p.status==='ok'&&msg.ref==='1'){this.joined=true;this.retryDelay=1000;}
      }
      if(msg.event==='postgres_changes'&&this.joined)this.invalidate();
      if(msg.event==='phx_error'||msg.event==='phx_close'){
        this.report(new Error('Kênh realtime Supabase tạm gián đoạn; nguồn vẫn có polling.'));
        socket.close();
      }
    };
    socket.onerror=()=>{if(!this.stopped)this.report(new Error('Realtime Supabase lỗi kết nối, tiếp tục kiểm tra bằng REST.'));};
    socket.onclose=()=>{
      if(this.heartbeatTimer){clearInterval(this.heartbeatTimer);this.heartbeatTimer=null;}
      if(this.socket===socket){this.socket=null;this.joined=false;}
      this.reconnect();
    };
  }
  private async heartbeat():Promise<void>{
    const socket=this.socket;
    if(this.stopped||!socket||socket.readyState!==WebSocket.OPEN)return;
    this.send('phoenix','heartbeat',{});
    try {
      const token=await this.getToken();
      if(!this.stopped&&this.socket===socket&&token!==this.lastToken){
        this.lastToken=token;
        this.send(TOPIC,'access_token',{access_token:token});
      }
    }catch(e){this.report(e);socket.close();}
  }
  private reconnect():void{
    if(this.stopped||this.retryTimer)return;
    this.retryTimer=setTimeout(()=>{
      this.retryTimer=null;
      void this.connect();
    },this.retryDelay);
    this.retryDelay=Math.min(30000,this.retryDelay*2);
  }
  private report(error:unknown):void{
    if(!this.stopped)this.fail(error instanceof Error?error:new Error('Realtime Supabase tạm gián đoạn.'));
  }
  stop():void{
    this.stopped=true;
    if(this.pollTimer)clearInterval(this.pollTimer);
    if(this.heartbeatTimer)clearInterval(this.heartbeatTimer);
    if(this.retryTimer)clearTimeout(this.retryTimer);
    const socket=this.socket;this.socket=null;
    if(socket){
      socket.onopen=null;socket.onmessage=null;socket.onclose=null;socket.onerror=null;
      socket.close();
    }
  }
}
