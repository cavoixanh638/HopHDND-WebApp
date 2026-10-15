import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import type {SharedConfig} from '../src/data/shared-config';
import {parseSheetConfig,DEFAULT_SHEET_URL} from '../src/data/sheet-config';
import {catalogFromItems} from '../src/data/catalogs';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {defaultReportLayout} from '../src/data/report-preferences';
import {writeCheckpoint,readCheckpoint} from '../src/data/draft-checkpoints';

// A small hook scheduler: tests the real hook with delayed repository promises,
// without adding a browser DOM dependency to this single-HTML project.
const h=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];
  const read=vi.fn(),save=vi.fn(),host=vi.fn(()=>true);
  const state=(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
  const ref=(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});};
  const memo=(fn:()=>any,deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))slots[i]={deps,value:fn()};return slots[i].value;};
  const effect=(fn:()=>void|(()=>void),deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j]))){effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
  return{read,save,host,state,ref,effect,memo,begin:()=>{cursor=0;},flush:()=>{const work=effects;effects=[];work.forEach(fn=>fn());},reset:()=>{slots.length=0;cursor=0;effects=[];},dispose:()=>{slots.forEach(slot=>slot?.cleanup?.());}};
});
vi.mock('react',()=>({useState:h.state,useRef:h.ref,useEffect:h.effect,useMemo:h.memo,useCallback:(fn:any,deps:any[])=>h.memo(()=>fn,deps)}));
vi.mock('../src/data/shared-config-repository',()=>({readSharedConfig:h.read,saveSharedSection:h.save}));
vi.mock('../src/data/google-bridge',()=>({isGoogleHost:h.host}));
import {useSharedConfig} from '../src/state/use-shared-config';
import {useWorkspace} from '../src/state/use-workspace';
import {useRecoverableDraft} from '../src/state/use-recoverable-draft';
const source=parseSheetConfig(DEFAULT_SHEET_URL);
function profile(revision=6):SharedConfig{return{schemaVersion:1,spreadsheetId:source.spreadsheetId,gid:source.gid,revision,updatedAt:'2026-10-14T03:00:00.000Z',editorUrl:'',catalogs:catalogFromItems(createDemoItems(3)),reports:defaultReportLayout(),items:defaultItemLayout()};}
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(e:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function render(editing=false,activeSource=source){h.begin();const result=useSharedConfig(activeSource,true,editing);h.flush();return result;}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
beforeEach(()=>{
  h.reset();h.read.mockReset();h.save.mockReset();h.host.mockReturnValue(true);vi.useFakeTimers();
  vi.stubGlobal('window',{setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});
});
afterEach(()=>{h.dispose();vi.useRealTimers();vi.unstubAllGlobals();});
describe('shared config load/save regressions',()=>{
  it('accepts the first delayed read even if a settings screen opened meanwhile, then saves its revision',async()=>{
    const request=deferred<SharedConfig>();h.read.mockReturnValue(request.promise);render();expect(render(true).config).toBeNull();request.resolve(profile());await settle();const state=render(true);expect(state.config?.revision).toBe(6);h.save.mockResolvedValue(profile(7));await state.save('items',profile().items);expect(h.save.mock.calls[0][1]).toBe(6);expect(render(true).config?.revision).toBe(7);
  });
  it('distinguishes a failed load from an empty store and can retry without initializing',async()=>{
    h.read.mockRejectedValue(new Error('RPC timeout'));render();await settle();let state=render();expect(state.status).toBe('error');expect(state.message).toContain('RPC timeout');await expect(state.save('items',profile().items)).rejects.toThrow(/Chưa tải được/);await expect(state.save('all',profile())).rejects.toThrow(/Chưa xác nhận kho trống/);expect(h.save).not.toHaveBeenCalled();h.read.mockResolvedValue(profile());await state.refresh();state=render();expect(state.config?.revision).toBe(6);
  });
  it('keeps the edit baseline when another revision arrives and propagates a stale-save rejection',async()=>{
    h.read.mockResolvedValue(profile());render();await settle();let state=render(true);h.read.mockResolvedValue(profile(7));await state.refresh();state=render(true);expect(state.config?.revision).toBe(6);h.save.mockRejectedValue(new Error('Cấu hình đã được người khác sửa'));await expect(state.save('items',profile().items)).rejects.toThrow(/người khác sửa/);expect(h.save.mock.calls[0][1]).toBe(6);expect(render(true).config?.revision).toBe(6);
  });
  it('does not let an older in-flight read replace a successful save',async()=>{
    h.read.mockResolvedValue(profile());render();await settle();const state=render();const late=deferred<SharedConfig>();h.read.mockReturnValue(late.promise);const refresh=state.refresh();h.save.mockResolvedValue(profile(7));await state.save('items',profile().items);late.resolve(profile());await refresh;expect(render().config?.revision).toBe(7);
  });
  it('locks concurrent saves before React can rerender',async()=>{
    h.read.mockResolvedValue(profile());render();await settle();const state=render(true),request=deferred<SharedConfig>();h.save.mockReturnValue(request.promise);const first=state.save('items',profile().items);await expect(state.save('items',profile().items)).rejects.toThrow(/Đang lưu/);expect(h.save).toHaveBeenCalledTimes(1);request.resolve(profile(7));await first;
  });
  it('ignores a response for a source that was replaced',async()=>{
    const old=deferred<SharedConfig>();h.read.mockReturnValueOnce(old.promise).mockResolvedValue(null);render();const next={...source,gid:'42',url:source.url.replace('60961344','42')};render(false,next);await settle();old.resolve(profile());await settle();expect(render(false,next).config).toBeNull();expect(render(false,next).status).toBe('empty');
  });
  it('permits initialization only after a confirmed empty read',async()=>{
    h.read.mockResolvedValue(null);render();await settle();const state=render();expect(state.status).toBe('empty');h.save.mockResolvedValue(profile(1));await state.save('all',profile());expect(h.save.mock.calls[0][1]).toBe(0);
  });
  it('tells a standalone HTML user to open the Google editor without attempting a write',async()=>{
    h.host.mockReturnValue(false);h.read.mockResolvedValue(profile());render();await settle();await expect(render().save('items',profile().items)).rejects.toThrow(/File HTML/);expect(h.save).not.toHaveBeenCalled();
  });
});
describe('checkpoint preservation at the table view/editor boundary',()=>{
  const scope='items:test-source';const validate=(value:unknown)=>value as {width:number};
  function draft(base={width:1500},active=true){h.begin();const result=useRecoverableDraft(scope,base,validate,undefined,active);h.flush();return result;}
  it('does not remove or autosave an existing draft while only viewing the table',()=>{
    writeCheckpoint(scope,{width:1400},{width:2000});draft({width:1500},false);vi.advanceTimersByTime(11000);h.dispose();expect(readCheckpoint(scope,validate)?.draft.width).toBe(2000);
  });
  it('preserves a mismatched draft on timers and exit until an explicit decision',()=>{
    writeCheckpoint(scope,{width:1400},{width:2000});expect(draft().unmatchedCheckpoint?.draft.width).toBe(2000);vi.advanceTimersByTime(11000);h.dispose();expect(readCheckpoint(scope,validate)?.base.width).toBe(1400);
  });
  it('loads an old draft for review without writing it to the server, then checkpoints against the new baseline',()=>{
    writeCheckpoint(scope,{width:1400},{width:2000});draft().restoreOldDraft();const result=draft();expect(result.draft.width).toBe(2000);expect(result.dirty).toBe(true);vi.advanceTimersByTime(11000);expect(readCheckpoint(scope,validate)?.base.width).toBe(1500);expect(h.save).not.toHaveBeenCalled();
  });
  it('discards the old checkpoint only after the user chooses to discard',()=>{
    writeCheckpoint(scope,{width:1400},{width:2000});draft().discardOldDraft();expect(draft().unmatchedCheckpoint).toBeNull();expect(readCheckpoint(scope,validate)).toBeNull();
  });
  it('clears the pending autosave label after a confirmed layout save',()=>{draft().setDraft({width:800});draft();vi.advanceTimersByTime(11000);expect(draft().checkpointMessage).toContain('Chưa bấm Áp dụng hoặc Lưu');draft().clearCheckpoint();expect(draft().checkpointMessage).not.toContain('Chưa bấm Áp dụng hoặc Lưu');expect(readCheckpoint(scope,validate)).toBeNull();});
});

describe('real-source drafts and honest synchronization',()=>{
  const rows=createDemoItems(2);
  function workspace(repo:any){h.begin();const result=useWorkspace(repo,'test-real');h.flush();return result;}
  it('allows local edits on a read-only source, checkpoints and retains drafts when commit fails',async()=>{
    const repo={readOnly:true,canDraft:true,list:vi.fn().mockResolvedValue(rows),save:vi.fn().mockRejectedValue(new Error('Excel writer not ready')),history:vi.fn()};workspace(repo);await settle();let state=workspace(repo);state.update(rows[0].recordId,{note:'new note'});state=workspace(repo);expect(state.workingItems[0].note).toBe('new note');vi.advanceTimersByTime(11000);expect(readCheckpoint('data:test-real',value=>value as any)?.draft.drafts[rows[0].recordId].changes.note).toBe('new note');await expect(state.save()).resolves.toBe(false);state=workspace(repo);expect(state.message).toContain('not ready');expect(state.drafts[rows[0].recordId]).toBeDefined();const calls=repo.list.mock.calls.length;await state.refresh();expect(repo.list).toHaveBeenCalledTimes(calls);
  });
  it('does not mark an empty response as a successful save or erase pending work',async()=>{
    const repo={readOnly:false,list:vi.fn().mockResolvedValue(rows),save:vi.fn().mockResolvedValue([]),history:vi.fn()};workspace(repo);await settle();let state=workspace(repo);state.update(rows[0].recordId,{note:'pending'});state=workspace(repo);await expect(state.save()).resolves.toBe(false);expect(workspace(repo).drafts[rows[0].recordId]).toBeDefined();
  });
  it('accepts only acknowledged values and keeps a missing result as a draft',async()=>{
    const repo={readOnly:false,list:vi.fn().mockResolvedValue(rows),save:vi.fn().mockResolvedValue([{recordId:rows[0].recordId,ok:true,item:{...rows[0],note:'one',revision:1}}]),history:vi.fn()};workspace(repo);await settle();let state=workspace(repo);state.update(rows[0].recordId,{note:'one'});state.update(rows[1].recordId,{note:'two'});state=workspace(repo);await expect(state.save()).resolves.toBe(false);state=workspace(repo);expect(state.drafts[rows[0].recordId]).toBeUndefined();expect(state.drafts[rows[1].recordId]).toBeDefined();expect(state.items[0].note).toBe('one');
  });
  it('refreshes a writable Google source every 60 seconds when no edits are pending',async()=>{
    const repo={sourceKind:'google',readOnly:false,canDraft:true,list:vi.fn().mockResolvedValue(rows),save:vi.fn(),history:vi.fn()};
    workspace(repo);await settle();expect(repo.list).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000);await settle();
    expect(repo.list).toHaveBeenCalledTimes(2);
  });
  it('trims Google edits, keeps checkpoint until the saved value is confirmed, and reports Excel destination',async()=>{
    const repo={sourceKind:'google',readOnly:false,canDraft:true,list:vi.fn().mockResolvedValue(rows),save:vi.fn(),history:vi.fn()};
    repo.save.mockResolvedValueOnce([{recordId:rows[0].recordId,ok:true,item:{...rows[0],note:'mismatch',revision:rows[0].revision+1}}]);
    repo.save.mockImplementationOnce(async(patches:any[])=>patches.map(patch=>({recordId:patch.recordId,ok:true,item:{...rows[0],...patch.changes,revision:rows[0].revision+1}})));
    workspace(repo);await settle();let state=workspace(repo);state.update(rows[0].recordId,{note:'  ghi chú mới  '});state=workspace(repo);
    expect(state.workingItems[0].note).toBe('ghi chú mới');
    vi.advanceTimersByTime(800);const checkpoint=()=>readCheckpoint('data:test-real',value=>value as any);expect(checkpoint()?.draft.drafts[rows[0].recordId].changes.note).toBe('ghi chú mới');
    await expect(state.save()).resolves.toBe(false);expect(checkpoint()).not.toBeNull();
    state=workspace(repo);await expect(state.save()).resolves.toBe(true);state=workspace(repo);
    expect(repo.save).toHaveBeenCalledTimes(2);expect(state.drafts[rows[0].recordId]).toBeUndefined();expect(state.message).toContain('vào Excel');expect(state.message).not.toContain('phiên thử');expect(checkpoint()).toBeNull();
  });
  it('retains a Google operation ID and draft after a lost writer reply',async()=>{
    const repo={sourceKind:'google',readOnly:false,canDraft:true,list:vi.fn().mockResolvedValue(rows),save:vi.fn(),history:vi.fn()};
    repo.save.mockRejectedValueOnce(new Error('writer reply lost'));
    repo.save.mockImplementationOnce(async(patches:any[])=>patches.map(patch=>({recordId:patch.recordId,ok:true,item:{...rows[0],...patch.changes,revision:rows[0].revision+1}})));
    workspace(repo);await settle();let state=workspace(repo);state.update(rows[0].recordId,{note:'new Google note'});state=workspace(repo);
    const operationId=state.drafts[rows[0].recordId].operationId;await expect(state.save()).resolves.toBe(false);
    state=workspace(repo);expect(state.drafts[rows[0].recordId].operationId).toBe(operationId);
    await expect(state.save()).resolves.toBe(true);expect(repo.save.mock.calls[1][0][0].operationId).toBe(operationId);
  });
  it('keeps demo edit text unchanged and reports the session destination',async()=>{
    const repo={sourceKind:'demo',readOnly:false,canDraft:true,list:vi.fn().mockResolvedValue(rows),save:vi.fn(),history:vi.fn()};
    repo.save.mockImplementation(async(patches:any[])=>patches.map(patch=>({recordId:patch.recordId,ok:true,item:{...rows[0],...patch.changes,revision:rows[0].revision+1}})));
    workspace(repo);await settle();let state=workspace(repo);state.update(rows[0].recordId,{note:'  ghi chú mới  '});state=workspace(repo);
    expect(state.workingItems[0].note).toBe('  ghi chú mới  ');await expect(state.save()).resolves.toBe(true);state=workspace(repo);
    expect(state.message).toContain('trong phiên thử');expect(state.message).not.toContain('vào Excel');
  });
});


describe('Firebase autosave and in-flight edit preservation',()=>{
  const original={...createDemoItems(1)[0],revision:1,note:'A'};
  function workspace(repo:any){h.begin();const value=useWorkspace(repo,'firebase:demo-hdnd');h.flush();return value;}
  it('keeps C when an earlier A-to-B save is acknowledged, then saves C using B as baseline',async()=>{
    const first=deferred<any[]>();
    const repo={sourceKind:'firebase',readOnly:false,canDraft:true,list:vi.fn().mockResolvedValue([original]),save:vi.fn().mockReturnValueOnce(first.promise).mockImplementation(async(patches:any[])=>patches.map(patch=>({recordId:patch.recordId,ok:true,item:{...original,...patch.changes,revision:3}}))),history:vi.fn()};
    workspace(repo);await settle();let state=workspace(repo);state.update(original.recordId,{note:'B'});state=workspace(repo);const saving=state.save();state=workspace(repo);state.update(original.recordId,{note:'C'});state=workspace(repo);expect(state.workingItems[0].note).toBe('C');
    first.resolve([{recordId:original.recordId,ok:true,item:{...original,note:'B',revision:2}}]);await saving;state=workspace(repo);
    expect(state.items[0].note).toBe('B');expect(state.drafts[original.recordId].changes.note).toBe('C');expect(state.drafts[original.recordId].baseValues.note).toBe('B');
    await state.save();expect(workspace(repo).items[0].note).toBe('C');expect(workspace(repo).drafts).toEqual({});
  });
  it('debounces automatic saves and retains failed edits without an endless retry',async()=>{
    const repo={sourceKind:'firebase',readOnly:false,canDraft:true,list:vi.fn().mockResolvedValue([original]),save:vi.fn().mockRejectedValue(new Error('permission denied')),history:vi.fn()};
    workspace(repo);await settle();let state=workspace(repo);state.update(original.recordId,{note:'B'});state=workspace(repo);await vi.advanceTimersByTimeAsync(400);expect(repo.save).not.toHaveBeenCalled();
    state.update(original.recordId,{note:'C'});state=workspace(repo);await vi.advanceTimersByTimeAsync(800);await settle();state=workspace(repo);expect(repo.save).toHaveBeenCalledTimes(1);expect(state.drafts[original.recordId].changes.note).toBe('C');await vi.advanceTimersByTimeAsync(5000);workspace(repo);expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
