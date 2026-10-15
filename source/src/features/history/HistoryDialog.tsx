import { useEffect, useState } from 'react';
import type { AuditEntry, Item } from '../../../shared/types';
import type { Repository } from '../../data/repository';
import { TEXT_FIELDS } from '../../../shared/field-definitions';
import { Modal } from '../../components/Modal';

export function HistoryDialog({ item, repository, onClose }: { item: Item; repository: Repository; onClose: () => void }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let cancelled = false; repository.history(item.recordId,item.displayCode).then(value => { if (!cancelled) setEntries(value.reverse()); }).catch(() => { if (!cancelled) setError('Không tải được lịch sử.'); }); return () => { cancelled = true; }; }, [item.recordId,item.displayCode, repository]);
  return <Modal title={`Lịch sử · ${item.displayCode}`} onClose={onClose}><div className="modal-body">{error && <p className="error-text" role="alert">{error}</p>}{entries === null && !error ? <p>Đang đọc lịch sử…</p> : entries?.length ? entries.map(entry => <article className="history-entry" key={entry.operationId}><strong>{new Date(entry.at).toLocaleString('vi-VN')}</strong>{Object.entries(entry.changes).map(([key, value]) => <p key={key}>{TEXT_FIELDS.find(f => f.key === key)?.label ?? key}: {String(entry.oldValues[key as keyof typeof entry.oldValues] ?? '—')} → <strong>{String(value)}</strong></p>)}</article>) : <p className="empty">Chưa có thay đổi đã lưu trong phiên thử.</p>}</div></Modal>;
}
