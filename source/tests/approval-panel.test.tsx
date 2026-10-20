import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {parseSheetConfig} from '../src/data/sheet-config';
const h=vi.hoisted(()=>{
  const slots:any[]=[];let index=0;
  return {reset:()=>{slots.length=0;index=0;},begin:()=>{index=0;},
    state:(initial:any)=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    memo:(fn:any)=>fn()
  };
});
const sheet=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('react',()=>({useState:h.state,useMemo:h.memo,useEffect:()=>{}}));
vi.mock('../src/data/sheets-repository',()=>({readSheet:sheet.read}));
import {ApprovalReviewPanel} from '../src/features/settings/ApprovalReviewPanel';
import type {FirebaseController} from '../src/state/use-firebase';
const source=parseSheetConfig('https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344');
const items=createDemoItems(2);
const nodes=(v:any):any[]=>Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];
const find=(tree:any,label:string)=>nodes(tree).find(n=>n.type==='button'&&n.props?.children===label);
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
let firebase:FirebaseController;
const render=()=>{h.begin();return ApprovalReviewPanel({source,items,loadedAt:'16/10/2026 10:00',hasDrafts:false,firebase,onClose:vi.fn()});};
beforeEach(()=>{
  h.reset();sheet.read.mockReset();
  firebase={isAdmin:true,connected:true,editingLocked:false,controlReady:true,
    readReview:vi.fn().mockResolvedValue(null),approveReview:vi.fn().mockResolvedValue({
      revision:1,source:source.spreadsheetId+':'+source.gid,approvedAt:new Date().toISOString(),
      approvedBy:'admin',changedCount:0,history:[],snapshot:{schemaVersion:1,source:source.spreadsheetId+':'+source.gid,rows:[]}
    }),saveEditingLock:vi.fn().mockResolvedValue(undefined)} as unknown as FirebaseController;
});
describe('admin approves only the latest verified Sheets snapshot',()=>{
  it('rejects approval when the source was changed after the current UI loaded',async()=>{
    sheet.read.mockResolvedValue({items:[{...items[0],note:'mới ngoài UI'},items[1]],warnings:[],ignoredRows:0});
    find(render(),'Đọc lại mốc đã duyệt').props.onClick();await flush();
    find(render(),'Tạo mốc phê duyệt ban đầu').props.onClick();
    find(render(),'Xác nhận phê duyệt').props.onClick();await flush();
    expect(firebase.approveReview).not.toHaveBeenCalled();
    expect(JSON.stringify(render())).toContain('Dữ liệu nguồn đã thay đổi');
  });
  it('saves a confirmed approval after verifying the same source rows',async()=>{
    sheet.read.mockResolvedValue({items,warnings:[],ignoredRows:0});
    find(render(),'Đọc lại mốc đã duyệt').props.onClick();await flush();
    find(render(),'Tạo mốc phê duyệt ban đầu').props.onClick();
    find(render(),'Xác nhận phê duyệt').props.onClick();await flush();
    expect(firebase.approveReview).toHaveBeenCalledOnce();
    expect(firebase.approveReview).toHaveBeenCalledWith(source,expect.objectContaining({source:source.spreadsheetId+':'+source.gid}),0,0);
  });
});
