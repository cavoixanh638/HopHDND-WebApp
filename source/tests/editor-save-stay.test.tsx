import {beforeEach,describe,expect,it,vi} from 'vitest';
const hook=vi.hoisted(()=>({markSaved:vi.fn()}));
vi.mock('react',()=>({memo:(component:any)=>component,
  useState:(initial:any)=>[typeof initial==='function'?initial():initial,vi.fn()],
  useRef:(initial:any)=>({current:initial}),useEffect:vi.fn(),
}));
vi.mock('../src/state/use-recoverable-draft',()=>({
  useRecoverableDraft:(_key:string,initial:any)=>({
    draft:initial,setDraft:vi.fn(),dirty:true,markSaved:hook.markSaved,clearCheckpoint:vi.fn(),
    recoveryMessage:'',checkpointMessage:'',unmatchedCheckpoint:null,
    restoreOldDraft:vi.fn(),discardOldDraft:vi.fn()
  })
}));
import {ReportSettings} from '../src/features/settings/ReportSettings';
import {CatalogSettings} from '../src/features/catalogs/CatalogSettings';
import {defaultReportLayout} from '../src/data/report-preferences';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
const nodes=(v:any):any[]=>Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];
const labels=(tree:any)=>nodes(tree).filter(n=>n.type==='button').map(n=>n.props.children).filter((x:any)=>typeof x==='string');
beforeEach(()=>hook.markSaved.mockReset());
describe('editor saves are separate from common View mode navigation',()=>{
  it('saves reports in-place and keeps the editing page open',async()=>{
    const onSave=vi.fn().mockResolvedValue(undefined),onClose=vi.fn(),layout=defaultReportLayout(),items=createDemoItems(2);
    const view=ReportSettings({initial:layout,onSave,onClose,items,group:'vpLeader',
      sourceKey:'report-test',sourceLabel:'Google Sheets',groupOrder:[],storageLabel:'Firebase'});
    expect(labels(view)).toContain('Lưu Bảng báo cáo');
    expect(labels(view)).not.toContain('Lưu bố trí và về chế độ xem');
    const save=nodes(view).find(n=>n.type==='button'&&n.props.children==='Lưu Bảng báo cáo');
    await save.props.onClick();
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledWith(layout);
    expect(hook.markSaved).toHaveBeenCalledWith(layout);
    expect(onClose).not.toHaveBeenCalled();
  });
  it('saves catalogs in-place, does not navigate, and resets the saved draft baseline',async()=>{
    const items=createDemoItems(2),config=catalogFromItems(items),onSave=vi.fn().mockResolvedValue(undefined),onClose=vi.fn();
    const view=CatalogSettings({sourceKey:'catalog-test',items,config,onSave,onClose,storageLabel:'Firebase'});
    expect(labels(view)).toContain('Lưu giá trị lựa chọn');
    expect(labels(view)).not.toContain('Lưu danh mục và thoát');
    const save=nodes(view).find(n=>n.type==='button'&&n.props.children==='Lưu giá trị lựa chọn');
    await save.props.onClick();
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledWith(config);
    expect(hook.markSaved).toHaveBeenCalledWith(config);
    expect(onClose).not.toHaveBeenCalled();
  });
});
