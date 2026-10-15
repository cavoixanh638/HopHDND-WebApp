import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { AUTOSAVE_MS, clearCheckpoint as removeCheckpoint, readCheckpoint, writeCheckpoint } from '../data/draft-checkpoints';

export function useRecoverableDraft<T>(key: string, initial: T, validate: (value: unknown) => T = value => value as T, isDirty?: (draft:T,initial:T)=>boolean, active=true) {
  const [start] = useState(() => {
    const saved = readCheckpoint(key, validate);
    const matches = saved && JSON.stringify(saved.base) === JSON.stringify(initial);
    return { draft: matches ? saved.draft : structuredClone(initial), unmatched: saved&&!matches?saved:null, message: matches ? 'Đã khôi phục phần bạn sửa trên trình duyệt. Kiểm tra trước khi áp dụng hoặc lưu.' : saved ? 'Phần sửa đang giữ trên máy không khớp bản gốc hiện tại; chưa tự áp dụng.' : '' };
  });
  const [draft, update] = useState<T>(start.draft);
  const [unmatchedCheckpoint,setUnmatchedCheckpoint]=useState(start.unmatched);
  const protectedCheckpoint=useRef(!!start.unmatched);protectedCheckpoint.current=!!unmatchedCheckpoint;
  const [checkpointMessage, setCheckpointMessage] = useState('Tự động giữ phần đang sửa trên trình duyệt mỗi 10 giây.');
  const dirty = isDirty ? isDirty(draft,initial) : JSON.stringify(draft) !== JSON.stringify(initial);
  const latest = useRef({ draft, initial, dirty }); latest.current = { draft, initial, dirty };
  const cleared = useRef(false);
  const flush = () => {
    if (!active||cleared.current||protectedCheckpoint.current) return;
    if (!latest.current.dirty) { removeCheckpoint(key); return; }
    const saved = writeCheckpoint(key, latest.current.initial, latest.current.draft);
    setCheckpointMessage(saved ? `Đã giữ phần đang sửa trên máy: ${new Date().toLocaleTimeString('vi-VN')}. Chưa bấm Áp dụng hoặc Lưu.` : 'Không giữ được phần đang sửa trên trình duyệt. Đừng đóng trang; hãy sao chép nội dung để tránh mất.');
  };
  const flushRef = useRef(flush); flushRef.current = flush;
  const setDraft = (next: SetStateAction<T>) => { cleared.current = false; update(next); };
  const clearCheckpoint = () => { cleared.current = true; removeCheckpoint(key); setCheckpointMessage('Không còn thay đổi chưa xử lý trong phần này.'); };
  const restoreOldDraft=()=>{if(!unmatchedCheckpoint)return;protectedCheckpoint.current=false;setUnmatchedCheckpoint(null);setDraft(structuredClone(unmatchedCheckpoint.draft));};
  const discardOldDraft=()=>{protectedCheckpoint.current=false;setUnmatchedCheckpoint(null);removeCheckpoint(key);};
  useEffect(() => {
    if(!active)return;
    const interval = window.setInterval(() => flushRef.current(), AUTOSAVE_MS);
    const pagehide = () => flushRef.current();
    const visibility = () => { if (document.hidden) pagehide(); };
    const unload = (event: BeforeUnloadEvent) => { if (latest.current.dirty && !cleared.current) { pagehide(); event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('pagehide', pagehide); window.addEventListener('beforeunload', unload); document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); window.removeEventListener('pagehide', pagehide); window.removeEventListener('beforeunload', unload); document.removeEventListener('visibilitychange', visibility); if(protectedCheckpoint.current)return;if (!cleared.current && latest.current.dirty) writeCheckpoint(key, latest.current.initial, latest.current.draft); else removeCheckpoint(key); };
  }, [key,active]);
  useEffect(() => { if(!active)return;const timer = window.setTimeout(() => flushRef.current(), 800); return () => clearTimeout(timer); }, [draft,active]);
  return { draft, setDraft, dirty, recoveryMessage: start.message, checkpointMessage, clearCheckpoint,unmatchedCheckpoint,restoreOldDraft,discardOldDraft };
}
