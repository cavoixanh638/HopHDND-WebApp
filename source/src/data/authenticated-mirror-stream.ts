import {onValue,ref,type Database} from 'firebase/database';

/**
 * An authenticated, one-connection-per-source RTDB stream.
 * On a cold visit, start its first read alongside profile/permissions.
 * NEVER render a speculative result until the live admin profile confirms
 * the selected source. Never share snapshots across Firebase user IDs.
 */
interface Watcher {
  onData:(value:unknown)=>void;
  onError:(error:Error)=>void;
}
interface Channel {
  latest:unknown;
  received:boolean;
  error:Error|null;
  watchers:Set<Watcher>;
  warmOwner:boolean;
  stop:()=>void;
}
const active=new WeakMap<Database,Map<string,Channel>>();
const channelKey=(uid:string,path:string)=>uid+'|'+path;
function getChannel(database:Database,uid:string,path:string):Channel{
  let map=active.get(database);
  if(!map){map=new Map();active.set(database,map);}
  const key=channelKey(uid,path);
  const existing=map.get(key);
  if(existing)return existing;
  const created:Channel={latest:null,received:false,error:null,watchers:new Set(),warmOwner:false,stop:()=>{}};
  map.set(key,created);
  created.stop=onValue(ref(database,path),snapshot=>{
    created.received=true;
    created.latest=snapshot.val();
    created.error=null;
    for(const watcher of [...created.watchers])watcher.onData(created.latest);
  },cause=>{
    created.error=cause;
    for(const watcher of [...created.watchers])watcher.onError(cause);
  });
  return created;
}
function clean(database:Database,uid:string,path:string,channel:Channel):void{
  if(channel.warmOwner||channel.watchers.size)return;
  const map=active.get(database);
  if(map?.get(channelKey(uid,path))!==channel)return;
  map.delete(channelKey(uid,path));
  channel.stop();
}
export function warmMirrorStream(database:Database,uid:string,path:string):()=>void{
  if(!uid)return()=>{};
  const channel=getChannel(database,uid,path);
  channel.warmOwner=true;
  return()=>{
    channel.warmOwner=false;
    clean(database,uid,path,channel);
  };
}
export function subscribeMirrorStream(
  database:Database,uid:string,path:string,onData:(value:unknown)=>void,onError:(error:Error)=>void
):()=>void{
  const channel=getChannel(database,uid,path);
  const watcher={onData,onError};
  channel.watchers.add(watcher);
  // Reuse a first snapshot already received while waiting for admin profile.
  if(channel.received)onData(channel.latest);
  else if(channel.error)onError(channel.error);
  return()=>{
    channel.watchers.delete(watcher);
    clean(database,uid,path,channel);
  };
}
