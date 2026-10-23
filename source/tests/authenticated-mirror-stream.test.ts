import {describe,it,expect,vi} from 'vitest';

const h=vi.hoisted(()=>({streams:[] as {path:string;next:(v:any)=>void;error:(e:Error)=>void;stop:ReturnType<typeof vi.fn>}[]}));
vi.mock('firebase/database',()=>({
  ref:(_db:any,path:string)=>path,
  onValue:(path:string,next:(snap:any)=>void,error:(cause:Error)=>void)=>{
    const s={path,next,error,stop:vi.fn()};
    h.streams.push(s);
    return s.stop;
  }
}));
import {warmMirrorStream,subscribeMirrorStream} from '../src/data/authenticated-mirror-stream';
const db={} as any;
describe('protected early RTDB read',()=>{
  it('starts with Auth and delivers the already-received payload when selected, without a second network listener',()=>{
    const path='hdnd/mirrors/sheet/123';
    const release=warmMirrorStream(db,'user-1',path);
    expect(h.streams).toHaveLength(1);
    const snapshot={rows:[{recordId:'row'}]};
    h.streams[0].next({val:()=>snapshot});
    const seen:any[]=[],errors:Error[]=[];
    const unsubscribe=subscribeMirrorStream(db,'user-1',path,raw=>seen.push(raw),e=>errors.push(e));
    expect(h.streams).toHaveLength(1);
    expect(seen).toEqual([snapshot]);
    release();
    expect(h.streams[0].stop).not.toHaveBeenCalled(); // active consumer keeps stream
    h.streams[0].next({val:()=>({rows:[{recordId:'new'}]})});
    expect(seen).toHaveLength(2);
    expect(errors).toHaveLength(0);
    unsubscribe();
    expect(h.streams[0].stop).toHaveBeenCalledTimes(1);
  });
  it('does not share data between distinct authenticated user identities',()=>{
    const path='hdnd/mirrors/sheet/999';
    const release=warmMirrorStream(db,'user-A',path);
    expect(h.streams).toHaveLength(2);
    h.streams[1].next({val:()=>({uid:'A'})});
    const events:any[]=[];
    const close=subscribeMirrorStream(db,'user-B',path,raw=>events.push(raw),()=>{});
    expect(h.streams).toHaveLength(3);
    expect(events).toEqual([]);
    h.streams[2].next({val:()=>({uid:'B'})});
    expect(events).toEqual([{uid:'B'}]);
    release();close();
    expect(h.streams[1].stop).toHaveBeenCalledTimes(1);
    expect(h.streams[2].stop).toHaveBeenCalledTimes(1);
  });
  it('reference-counts warmups and disconnects only when all owners release',()=>{
    const path='hdnd/mirrors/sheet/456';
    const a=warmMirrorStream(db,'visitor-3',path);
    const b=warmMirrorStream(db,'visitor-3',path);
    expect(h.streams).toHaveLength(4);
    a();a();
    expect(h.streams[3].stop).not.toHaveBeenCalled();
    b();
    expect(h.streams[3].stop).toHaveBeenCalledTimes(1);
  });
});
