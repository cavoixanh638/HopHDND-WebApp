import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDemoItems} from '../src/data/demo-items';
import {createReferenceListLayout,referenceListLayoutNeedsSync} from '../src/data/reference-list-layout';
import {defaultItemLayout} from '../src/data/item-preferences';
import {planBulkPaste} from '../src/features/items/bulk-paste';
import {stageLiveBulkPaste,MAX_LIVE_BULK_ROWS,MAX_LIVE_BULK_CELLS} from '../src/features/items/live-bulk-staging';
import type {Item,TextField,EditableField,Changes} from '../shared/types';

const fixtures=(n=3)=>{
  const items=createDemoItems(n);
  const leases=new Set<string>(),released:string[]=[];
  const manager={
    has:(id:string,field:EditableField)=>leases.has(id+'|'+field),
    acquire:vi.fn(async(id:string,field:EditableField)=>{
      leases.add(id+'|'+field);return true;
    }),
    cancel:vi.fn(async(id:string,field:EditableField)=>{
      leases.delete(id+'|'+field);released.push(id+'|'+field);
    })
  };
  const drafts:{id:string;changes:Changes}[]=[];
  const args={
    patches:planBulkPaste({rows:items,startRecordId:items[0].recordId,
      startField:'note',text:'Thêm ghi chú A\nThêm ghi chú B'}).patches,
    items,
    leaseManager:manager,
    canEdit:vi.fn((_id:string,_field:TextField)=>true),
    getLiveItems:vi.fn(async()=>items as readonly Item[]),
    stageDraft:(id:string,changes:Changes)=>drafts.push({id,changes}),
  };
  return {args,items,drafts,leases,released,manager};
};

describe('Live Spark Admin paste — lease and revision boundary',()=>{
  it('acquires all locks, checks live rows and stages drafts without writing RTDB',async()=>{
    const s=fixtures();
    const result=await stageLiveBulkPaste(s.args);
    expect(result).toEqual({rows:2,cells:2});
    expect(s.manager.acquire).toHaveBeenCalledTimes(2);
    expect(s.args.getLiveItems).toHaveBeenCalledTimes(1);
    expect(s.drafts.map(x=>x.id)).toEqual(s.items.slice(0,2).map(x=>x.recordId));
    expect(s.released).toEqual([]);
    expect(s.items[0].note).not.toBe('Thêm ghi chú A');
  });
  it('fails before taking any lease when unauthorized or source revision stale',async()=>{
    const s=fixtures();
    s.args.canEdit=vi.fn(()=>false);
    await expect(stageLiveBulkPaste(s.args)).rejects.toThrow('Không có quyền');
    expect(s.manager.acquire).not.toHaveBeenCalled();
    expect(s.drafts).toHaveLength(0);
    s.args.canEdit=vi.fn(()=>true);
    s.args.patches=[{...s.args.patches[0],baseRevision:999}];
    await expect(stageLiveBulkPaste(s.args)).rejects.toThrow('đã đổi');
    expect(s.manager.acquire).not.toHaveBeenCalled();
  });
  it('releases all newly acquired leases on a live Firebase revision conflict',async()=>{
    const s=fixtures();
    s.args.getLiveItems=vi.fn(async()=>s.items.map((x,i)=>i===1?{...x,revision:x.revision+1}:x));
    await expect(stageLiveBulkPaste(s.args)).rejects.toThrow('Firebase đã đổi');
    expect(s.drafts).toHaveLength(0);
    expect(s.released).toHaveLength(2);
    expect(s.leases.size).toBe(0);
  });
  it('releases previous locks if a later lock acquisition fails',async()=>{
    const s=fixtures();
    let index=0;
    s.manager.acquire=vi.fn(async(id:string,field:EditableField)=>{
      index++;
      if(index===2)throw Error('Đã bị khóa bởi người khác');
      s.leases.add(id+'|'+field);return true;
    });
    await expect(stageLiveBulkPaste(s.args)).rejects.toThrow('Đã bị khóa');
    expect(s.drafts).toHaveLength(0);
    expect(s.released).toHaveLength(1);
  });
  it('does not hijack an already open editor or update dependent status fields together',async()=>{
    const s=fixtures();
    s.leases.add(s.items[0].recordId+'|note');
    await expect(stageLiveBulkPaste(s.args)).rejects.toThrow('đang mở sửa');
    expect(s.drafts).toHaveLength(0);
    const t=fixtures();
    t.args.patches=[{recordId:t.items[0].recordId,baseRevision:t.items[0].revision,
      changes:{partyLevel:'BTV',progressParty:'VP đang xử lý'}}];
    await expect(stageLiveBulkPaste(t.args)).rejects.toThrow('Không dán đồng thời');
    expect(t.manager.acquire).not.toHaveBeenCalled();
  });
  it('caps batch size independently of full Firebase record count',async()=>{
    expect(MAX_LIVE_BULK_ROWS).toBe(20);
    expect(MAX_LIVE_BULK_CELLS).toBe(60);
    const s=fixtures(23);
    s.args.patches=Array.from({length:21},(_,i)=>({
      recordId:s.items[i].recordId,baseRevision:s.items[i].revision,
      changes:{note:'Thay đổi '+i}
    }));
    await expect(stageLiveBulkPaste(s.args)).rejects.toThrow('1 đến 20');
    expect(s.manager.acquire).not.toHaveBeenCalled();
  });
  it('detects an unsynchronized Firebase layout and recognizes exact demo alignment',()=>{
    const old=defaultItemLayout();
    expect(referenceListLayoutNeedsSync(old)).toBe(true);
    const approved=createReferenceListLayout(old);
    expect(referenceListLayoutNeedsSync(approved)).toBe(false);
    const oldShared={...approved,frameWidth:1500,
      compactDisplay:{...approved.compactDisplay,shortLeaders:false,
        shortSpecialist:false,contentDetails:false}};
    expect(referenceListLayoutNeedsSync(oldShared)).toBe(true);
    const realList=readFileSync('src/features/items/ItemList.tsx','utf8');
    expect(realList).toContain('referenceListLayoutNeedsSync(activeLayout)');
    expect(realList).toContain('setPreviewOptionsOpen(true);setReferencePresetConfirm(true);');
  });
  it('only verified Admin gets the action; print and search use the actual List',()=>{
    const app=readFileSync('src/app/App.tsx','utf8');
    const list=readFileSync('src/features/items/ItemList.tsx','utf8');
    expect(app).toContain("adminTools&&isFirebase&&selectedSource==='primary'&&firebase!.isAdmin?stageAdminBulkDraft:undefined");
    expect(app).toContain("live.freezeControl?.mode!=='OPEN'");
    expect(app).toContain("!leaseManager");
    expect(list).toContain('const table=printTableRef.current;');
    expect(list).toContain('<table ref={printTableRef} className="data-table item-data-table"');
    expect(list).toContain('{denseChrome&&<fieldset className="admin-search-scope">');
    expect(list).toContain('{denseChrome&&onBulkApply&&<div className="admin-bulk-paste-tools">');
    expect(list).toContain("denseChrome?selectedSearchColumns:undefined");
  });
});
