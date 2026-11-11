import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Changes, Item, Patch } from '../../shared/types';
import type { Repository } from '../data/repository';
import { updateDraft } from '../domain/items';
import type {CellEditSessionManager} from '../data/cell-edit-leases';
import { AUTOSAVE_MS, clearCheckpoint, writeCheckpoint } from '../data/draft-checkpoints';
import { readWorkspaceRecovery } from '../data/workspace-recovery';
import {markStartup} from '../data/startup-timings';

export function useWorkspace(repository: Repository, sourceKey = 'demo',canStartDatabase=true,leaseManager?:CellEditSessionManager) {
  const [items, setItems] = useState<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Patch>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadedAt, setLoadedAt] = useState('');
  const [cachePending,setCachePending]=useState(false);
  const [autosaveMessage, setAutosaveMessage] = useState('');
  const firebase=repository.sourceKind==='firebase';
  const autoFailed=useRef('');
  const canDraft=repository.canDraft??!repository.readOnly;
  const protectedRecovery=useRef(false);
  const saving=useRef(false);
  const recovered = useRef<Repository | null>(null);
  const skipCheckpoint = useRef(false);
  const latestDraft = useRef({items,drafts}); latestDraft.current = {items,drafts};
  const [dataSource, setDataSource] = useState(repository);
  const dataSourceRef=useRef(dataSource);dataSourceRef.current=dataSource;
  const sourceRef = useRef(repository);
  sourceRef.current = repository;
  const fetching = useRef<Repository | null>(null);
  const lastRowsSignature=useRef<string|null>(null);
  // Background refresh must never replace mounted content with a loading shell,
  // nor mark a no-change response as a new data revision.
  const refresh = useCallback(async (background=false) => {
    if (fetching.current === repository||saving.current) return;
    if(Object.keys(latestDraft.current.drafts).length){
      if(!background)setMessage('Có thay đổi trên máy chưa lưu vào file nguồn; dữ liệu đang sửa vẫn được giữ. Hãy lưu hoặc bỏ thay đổi trước khi đọc lại file nguồn.');
      return;
    }
    fetching.current = repository;
    if(!background)setBusy(true);
    try {
      const rows = await repository.list();
      if (sourceRef.current !== repository) return;
      if(Object.keys(latestDraft.current.drafts).length){setMessage('Dữ liệu vừa đọc từ file nguồn chưa áp dụng vì bạn đang sửa. Phần sửa trên máy vẫn được giữ.');return;}
      const signature=JSON.stringify(rows);
      const changed=lastRowsSignature.current!==signature||dataSourceRef.current!==repository;
      if(changed){
        lastRowsSignature.current=signature;
        setItems(rows);
        setDataSource(repository);
        setLoadedAt(new Date().toLocaleString('vi-VN'));
      }
      if(rows.length===0&&changed)setMessage('Nguồn đã phản hồi nhưng chưa có dòng nội dung. Kiểm tra link, GID, tiêu đề cột C/D và dữ liệu của tab đang chọn; không nhập dữ liệu sang Firebase để thay thế.');
      else if(changed)setMessage('');
      if (canDraft && recovered.current !== repository) {
        recovered.current = repository;
        const saved = readWorkspaceRecovery(sourceKey);
        if (saved && JSON.stringify(saved.items) === JSON.stringify(rows)) { setDrafts(saved.drafts); setMessage('Đã phục hồi phần sửa trên máy; file nguồn chưa thay đổi. Kiểm tra trước khi lưu vào file, khi chức năng ghi sẵn sàng.'); }
        else if (saved){protectedRecovery.current=true;setMessage('Nháp cũ không khớp nguồn hiện tại và vẫn được giữ. Chưa tự áp dụng hoặc ghi đè.');}
      }
    } catch (error) {
      if (sourceRef.current === repository) setMessage(`${error instanceof Error ? error.message : 'Không đọc được dữ liệu.'} Bản đọc trước được giữ nếu có.`);
    } finally {
      if (fetching.current === repository) fetching.current = null;
      if (sourceRef.current === repository&&!background) setBusy(false);
    }
  }, [repository, sourceKey,canDraft]);
  useEffect(() => {
    lastRowsSignature.current=null;setItems([]);setDrafts({});setErrors({});setCachePending(false);
    setLoadedAt('');setMessage('');setAutosaveMessage('');
    skipCheckpoint.current=false;latestDraft.current={items:[],drafts:{}};
    protectedRecovery.current=false;
    if(!canStartDatabase){setBusy(true);}
    else if(repository.subscribeInitial&&repository.subscribe){
      const cached=repository.cachedRows?.();
      if(cached?.length){
        lastRowsSignature.current=JSON.stringify(cached);
        setItems(cached);setDataSource(repository);
        setLoadedAt('Bản lưu phiên này · đang kiểm tra Firebase');
        setCachePending(true);
        setBusy(false);
      }else setBusy(true);
    }
    else void refresh();
    // A changed refresh callback is not a source switch; never clear the mounted table.
  }, [repository,sourceKey,canStartDatabase]);
  useEffect(()=>{
    if(!repository.subscribe||!canStartDatabase)return;
    return repository.subscribe(rows=>{
      if(sourceRef.current!==repository)return;
      const signature=JSON.stringify(rows);
      if(lastRowsSignature.current!==signature||dataSourceRef.current!==repository){
        lastRowsSignature.current=signature;
        setItems(rows);setDataSource(repository);setLoadedAt(new Date().toLocaleString('vi-VN'));
      }
      if(repository.subscribeInitial){
        setCachePending(false);
        setLoadedAt(new Date().toLocaleString('vi-VN'));
        setBusy(false);
      }
    },cause=>{if(repository.subscribeInitial)setBusy(false);setMessage(`Mất kết nối dữ liệu: ${cause.message}. Phần sửa được giữ trên máy.`);});
  },[repository,canStartDatabase]);
  const update = (recordId: string, changes: Changes) => {
    const item = items.find(i => i.recordId === recordId);
    if (!item || cachePending || (!firebase&&(busy||saving.current)) || !canDraft||protectedRecovery.current) return;
    skipCheckpoint.current = false;
    const canonicalChanges:Changes=repository.sourceKind==='google'?Object.fromEntries(Object.entries(changes).map(([field,value])=>[field,typeof value==='string'?value.trim():value])):changes;
    setDrafts(previous => {
      const next = { ...previous };
      const patch = updateDraft(item, previous[recordId], canonicalChanges);
      if (patch) next[recordId] = patch; else delete next[recordId];
      return next;
    });
    setErrors(previous => { const next = { ...previous }; delete next[recordId]; return next; });
    setMessage('');
  };
  const discard = () => { protectedRecovery.current=false;skipCheckpoint.current=true; clearCheckpoint(`data:${sourceKey}`); setAutosaveMessage(''); setDrafts({}); setErrors({}); setMessage('Đã bỏ phần sửa trên máy. File nguồn không thay đổi.'); };
  const save = async () => {
    if (busy || cachePending || saving.current||!canDraft) return false;
    if (!Object.keys(drafts).length) return true;
    saving.current=true;setBusy(true);
    const requestRepository=repository;
    try {
      const pending=Object.values(drafts);
      const results = await repository.save(pending);
      if(sourceRef.current!==requestRepository)return false;
      const expected=new Map(pending.map(patch=>[patch.recordId,patch]));
      const seen=new Set<string>();
      if(!Array.isArray(results)||results.some(r=>!expected.has(r.recordId)||seen.has(r.recordId)||!seen.add(r.recordId)))throw new Error('Phản hồi lưu không khớp yêu cầu; nháp được giữ.');
      const saved = results.filter(result => result.ok && result.item&&result.item.recordId===result.recordId&&Object.entries(expected.get(result.recordId)!.changes).every(([key,value])=>result.item![key as keyof Item]===value));
      const confirmed = new Map(saved.map(result => [result.recordId, result.item!]));
      if(leaseManager)for(const result of saved){
        const patch=expected.get(result.recordId);
        if(patch)for(const field of Object.keys(patch.changes))
          void leaseManager.finish(result.recordId,field as import('../../shared/types').EditableField);
      }
      setItems(previous => previous.map(item => {const next=confirmed.get(item.recordId);return next&&next.revision>=item.revision?next:item;}));
      setDrafts(previous => {
        const next={...previous};
        for(const [id,item] of confirmed){
          if(next[id]?.operationId===expected.get(id)?.operationId)delete next[id];
          else if(next[id]){const rebased=updateDraft(item,undefined,next[id].changes);if(rebased)next[id]=rebased;else delete next[id];}
        }
        return next;
      });
      setErrors(Object.fromEntries(results.filter(r => !r.ok).map(r => [r.recordId, r.message ?? 'Không lưu được.'])));
      setMessage(`Đã lưu ${saved.length} nội dung${firebase?' vào Firebase, máy chủ đã xác nhận':repository.sourceKind==='google'?' vào Excel và đọc lại xác nhận':repository.readOnly?' về nguồn':' trong phiên thử'}.${pending.length > saved.length ? ` ${pending.length - saved.length} nội dung chưa lưu; phần sửa trên máy vẫn được giữ.` : ''}`);
      if (saved.length === pending.length) { if(!firebase){skipCheckpoint.current=true; clearCheckpoint(`data:${sourceKey}`); setAutosaveMessage('');} return true; }
      return false;
    } catch(cause) { setMessage(cause instanceof Error?cause.message:'Chưa xác định kết quả lưu. Giữ bản nháp để kiểm tra; không tự gửi lại.'); return false; }
    finally {saving.current=false;if(sourceRef.current===requestRepository)setBusy(false); }
  };
  const autoSave=useRef(save);autoSave.current=save;
  useEffect(()=>{
    if(!firebase||busy||protectedRecovery.current||!Object.keys(drafts).length)return;
    const signature=Object.values(drafts).map(patch=>patch.operationId).sort().join(':');
    if(autoFailed.current===signature)return;
    const timer=window.setTimeout(()=>{void autoSave.current().then(ok=>{if(!ok)autoFailed.current=signature;});},800);
    return()=>clearTimeout(timer);
  },[firebase,drafts,busy]);
  const keepDraft=()=>{const current=latestDraft.current;if(!Object.keys(current.drafts).length)return true;const saved=writeCheckpoint(`data:${sourceKey}`,{items:current.items,drafts:{}},current);setAutosaveMessage(saved?'Đã giữ thay đổi trên trình duyệt này; chưa lưu vào file nguồn.':'Không giữ được thay đổi trên trình duyệt này. Đừng đóng trang; hãy sao chép nội dung để tránh mất.');return saved;};
  const visibleItems = dataSource === repository ? items : [];
  const workingItems = useMemo(() => visibleItems.map(item => drafts[item.recordId] ? { ...item, ...drafts[item.recordId].changes } : item), [visibleItems, drafts]);
  const checkpoint = useRef(() => {});
  checkpoint.current = () => {
    const current = latestDraft.current;
    if (!canDraft || protectedRecovery.current||skipCheckpoint.current || dataSource !== repository) return;
    if (!Object.keys(current.drafts).length) { clearCheckpoint(`data:${sourceKey}`); setAutosaveMessage(''); return; }
    const saved = writeCheckpoint(`data:${sourceKey}`,{items:current.items,drafts:{}},current);
    setAutosaveMessage(saved ? `Đã giữ thay đổi trên máy: ${new Date().toLocaleTimeString('vi-VN')}. Chưa lưu vào file nguồn.` : 'Không giữ được thay đổi trên trình duyệt này. Đừng đóng trang; hãy sao chép nội dung để tránh mất.');
  };
  useEffect(() => {
    if (!canDraft) return;
    const flush = () => checkpoint.current();
    const visibility = () => { if (document.hidden) flush(); };
    const unload = (event:BeforeUnloadEvent) => { if (Object.keys(latestDraft.current.drafts).length && !skipCheckpoint.current) { flush(); event.preventDefault(); event.returnValue=''; } };
    const interval = window.setInterval(flush,AUTOSAVE_MS);
    window.addEventListener('pagehide',flush); window.addEventListener('beforeunload',unload);
    document.addEventListener('visibilitychange',visibility);
    return () => { clearInterval(interval); window.removeEventListener('pagehide',flush); window.removeEventListener('beforeunload',unload); document.removeEventListener('visibilitychange',visibility); flush(); };
  },[repository,sourceKey,canDraft]);
  useEffect(()=>{const timer=window.setTimeout(()=>checkpoint.current(),800);return()=>clearTimeout(timer);},[drafts]);
  return { keepDraft,protectedRecovery:protectedRecovery.current,cachePending,items: visibleItems, workingItems, drafts, errors, busy, message, loadedAt, autosaveMessage, refresh, update, discard, save };
}
