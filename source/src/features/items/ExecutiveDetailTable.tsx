import { useState, useMemo, type ReactNode } from 'react';
import type { Item, TextField } from '../../../shared/types';
import { displayId, isMissingDisplayCode } from '../../domain/display-id';
import { compactTypeTone } from './compact-columns';

type Props = {
  items: Item[];
  visibleFields: ReadonlySet<string>;
  renderField: (item: Item, field: TextField) => ReactNode;
  hasDraft: (item: Item) => boolean;
  errorFor: (item: Item) => string | undefined;
  query: string;
  onQuery: (value: string) => void;
  onSwitchToSpreadsheet?: () => void;
};

type ViewMode = 'grouped' | 'kanban';
type QuickFilter = 'all' | 'bottleneck' | 'office' | 'done' | 'has-note';

/** Six presentation cells over fifteen unchanged Excel fields.
 * Source field permissions and leases are enforced by the parent's renderField.
 */
export function ExecutiveDetailTable({
  items,
  visibleFields,
  renderField,
  hasDraft,
  errorFor,
  query,
  onQuery,
  onSwitchToSpreadsheet,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedUbnd, setSelectedUbnd] = useState<string>('');
  const [selectedVp, setSelectedVp] = useState<string>('');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('');

  const canShow = (field: string) => visibleFields.has(field);
  const field = (item: Item, key: TextField) => canShow(key) ? renderField(item, key) : null;

  // Derive unique options for dropdown filters
  const departments = useMemo(() => {
    return Array.from(new Set(items.map(i => i.department).filter(Boolean))).sort();
  }, [items]);

  const ubndLeaders = useMemo(() => {
    return Array.from(new Set(items.map(i => i.ubndLeader).filter(Boolean))).sort();
  }, [items]);

  const vpLeaders = useMemo(() => {
    return Array.from(new Set(items.map(i => i.vpLeader).filter(Boolean))).sort();
  }, [items]);

  const specialists = useMemo(() => {
    return Array.from(new Set(items.map(i => i.specialist).filter(Boolean))).sort();
  }, [items]);

  // Quick filter counts
  const totalCount = items.length;
  const bottleneckCount = useMemo(() => {
    return items.filter(i =>
      (i.progressCouncil ?? '').includes('Sở chưa trình') ||
      (i.progressParty ?? '').includes('Sở chưa trình') ||
      (i.progressBuild ?? '').includes('Sở chưa trình')
    ).length;
  }, [items]);

  const officeCount = useMemo(() => {
    return items.filter(i =>
      (i.progressCouncil ?? '').includes('VP đang thực hiện') ||
      (i.progressParty ?? '').includes('VP đang thực hiện') ||
      (i.progressBuild ?? '').includes('VP đang thực hiện')
    ).length;
  }, [items]);

  const doneCount = useMemo(() => {
    return items.filter(i =>
      (i.progressCouncil ?? '').includes('Đã trình HĐND') ||
      (i.progressCouncil ?? '').includes('Hoàn thành') ||
      (i.progressCouncil ?? '').includes('Đã có TBKL')
    ).length;
  }, [items]);

  const notesCount = useMemo(() => {
    return items.filter(i => Boolean((i.note ?? '').trim() || (i.specificProgress ?? '').trim())).length;
  }, [items]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (quickFilter === 'bottleneck') {
        const isBottleneck =
          (item.progressCouncil ?? '').includes('Sở chưa trình') ||
          (item.progressParty ?? '').includes('Sở chưa trình') ||
          (item.progressBuild ?? '').includes('Sở chưa trình');
        if (!isBottleneck) return false;
      } else if (quickFilter === 'office') {
        const isOffice =
          (item.progressCouncil ?? '').includes('VP đang thực hiện') ||
          (item.progressParty ?? '').includes('VP đang thực hiện') ||
          (item.progressBuild ?? '').includes('VP đang thực hiện');
        if (!isOffice) return false;
      } else if (quickFilter === 'done') {
        const isDone =
          (item.progressCouncil ?? '').includes('Đã trình HĐND') ||
          (item.progressCouncil ?? '').includes('Hoàn thành') ||
          (item.progressCouncil ?? '').includes('Đã có TBKL');
        if (!isDone) return false;
      } else if (quickFilter === 'has-note') {
        if (!item.note?.trim() && !item.specificProgress?.trim()) return false;
      }

      if (selectedDept && item.department !== selectedDept) return false;
      if (selectedUbnd && item.ubndLeader !== selectedUbnd) return false;
      if (selectedVp && item.vpLeader !== selectedVp) return false;
      if (selectedSpecialist && item.specialist !== selectedSpecialist) return false;

      return true;
    });
  }, [items, quickFilter, selectedDept, selectedUbnd, selectedVp, selectedSpecialist]);

  // Kanban lanes
  const kanbanColumns = useMemo(() => {
    const notSubmitted = filteredItems.filter(item =>
      (item.progressCouncil ?? '').includes('Sở chưa trình') ||
      (item.progressParty ?? '').includes('Sở chưa trình') ||
      (item.progressBuild ?? '').includes('Sở chưa trình')
    );
    const office = filteredItems.filter(item =>
      !notSubmitted.includes(item) &&
      ((item.progressCouncil ?? '').includes('VP đang thực hiện') ||
       (item.progressParty ?? '').includes('VP đang thực hiện') ||
       (item.progressBuild ?? '').includes('VP đang thực hiện'))
    );
    const done = filteredItems.filter(item =>
      !notSubmitted.includes(item) && !office.includes(item) &&
      ((item.progressCouncil ?? '').includes('Đã trình HĐND') ||
       (item.progressCouncil ?? '').includes('Hoàn thành') ||
       (item.progressCouncil ?? '').includes('Đã có TBKL'))
    );
    const intermediate = filteredItems.filter(item =>
      !notSubmitted.includes(item) && !office.includes(item) && !done.includes(item)
    );
    return [
      { id: 'not-submitted', tone: 'not-submitted', title: 'Khâu 1: Sở ngành chuẩn bị', subtitle: 'Sở chưa trình UBND', items: notSubmitted },
      { id: 'office', tone: 'office', title: 'Khâu 2: VP UBND thẩm tra', subtitle: 'VP đang thực hiện / Thẩm tra', items: office },
      { id: 'done', tone: 'done', title: 'Khâu 3: HĐND thẩm tra & Ban hành', subtitle: 'Đã trình HĐND / Hoàn thành', items: [...intermediate, ...done] },
    ];
  }, [filteredItems]);

  const status = (item: Item, key: TextField, label: string) => {
    const raw = item[key] ?? '';
    const isBottleneck = raw.includes('Sở chưa trình');
    const isOffice = raw.includes('VP đang thực hiện');
    const isDone = raw.includes('Đã có TBKL') || raw.includes('Đã có QĐ chap thuan') || raw.includes('Đã có QĐ chấp thuận') || raw.includes('Đã trình HĐND') || raw.includes('Hoàn thành');
    const toneClass = isBottleneck ? ' flow-danger' : isOffice ? ' flow-warning' : isDone ? ' flow-success' : '';
    return (
      <div className={'executive-flow-row' + toneClass} key={key}>
        <span className="executive-flow-label">{label}</span>
        <div className={'executive-flow-value executive-flow-' + key}>
          {field(item, key) || <span className="executive-muted">—</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="executive-detail">
      {/* =========================================================================
          PRO MAX COMMAND STRIP (Global Search, View Switcher, Quick Pills, Dropdowns)
          ========================================================================= */}
      <div className="pm-command-strip">
        <div className="pm-command-top">
          <div className="pm-quick-search">
            <svg
              className="pm-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="pm-global-search-input"
              value={query}
              onChange={event => onQuery(event.currentTarget.value)}
              placeholder="Tìm nhanh theo mã tờ trình, đơn vị chủ trì, nội dung, cán bộ phụ trách, ghi chú…"
              aria-label="Tìm nhanh trong danh sách"
            />
            {query && (
              <button
                type="button"
                className="pm-search-clear"
                onClick={() => onQuery('')}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                ×
              </button>
            )}
          </div>
          <div className="pm-view-mode-switcher" role="group" aria-label="Chế độ xem danh sách">
            <button
              type="button"
              className={`pm-view-mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              aria-pressed={viewMode === 'grouped' ? true : undefined}
              onClick={() => setViewMode('grouped')}
            >
              Bảng Gọn 4 Cụm
            </button>
            <button
              type="button"
              className={`pm-view-mode-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              aria-pressed={viewMode === 'kanban' ? true : undefined}
              onClick={() => setViewMode('kanban')}
            >
              Kanban Tiến Độ
            </button>
            {onSwitchToSpreadsheet && (
              <button
                type="button"
                className="pm-view-mode-btn"
                onClick={onSwitchToSpreadsheet}
              >
                Bảng 15 Cột Excel
              </button>
            )}
          </div>
        </div>

        <div className="pm-command-middle">
          <div className="workflow-quick-pills" role="group" aria-label="Lọc nhanh trạng thái">
            <button
              type="button"
              className={`workflow-quick-pill ${quickFilter === 'all' ? 'active' : ''}`}
              aria-pressed={quickFilter === 'all' ? true : undefined}
              onClick={() => setQuickFilter('all')}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              className={`workflow-quick-pill ${quickFilter === 'bottleneck' ? 'active' : ''}`}
              aria-pressed={quickFilter === 'bottleneck' ? true : undefined}
              onClick={() => setQuickFilter(prev => prev === 'bottleneck' ? 'all' : 'bottleneck')}
            >
              <span className="pm-dot dot-danger" aria-hidden="true" />
              Sở chưa trình ({bottleneckCount})
            </button>
            <button
              type="button"
              className={`workflow-quick-pill ${quickFilter === 'office' ? 'active' : ''}`}
              aria-pressed={quickFilter === 'office' ? true : undefined}
              onClick={() => setQuickFilter(prev => prev === 'office' ? 'all' : 'office')}
            >
              <span className="pm-dot dot-warning" aria-hidden="true" />
              VP đang thực hiện ({officeCount})
            </button>
            <button
              type="button"
              className={`workflow-quick-pill ${quickFilter === 'done' ? 'active' : ''}`}
              aria-pressed={quickFilter === 'done' ? true : undefined}
              onClick={() => setQuickFilter(prev => prev === 'done' ? 'all' : 'done')}
            >
              <span className="pm-dot dot-success" aria-hidden="true" />
              Đã trình HĐND ({doneCount})
            </button>
            <button
              type="button"
              className={`workflow-quick-pill tone-note ${quickFilter === 'has-note' ? 'active' : ''}`}
              aria-pressed={quickFilter === 'has-note' ? true : undefined}
              onClick={() => setQuickFilter(prev => prev === 'has-note' ? 'all' : 'has-note')}
            >
              Có lưu ý chỉ đạo ({notesCount})
            </button>
          </div>

          <div className="pm-dimensional-filters" role="group" aria-label="Bộ lọc phân loại">
            <select
              className="pm-filter-select"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              aria-label="Lọc theo đơn vị chủ trì"
            >
              <option value="">Tất cả Đơn vị chủ trì</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              className="pm-filter-select"
              value={selectedUbnd}
              onChange={e => setSelectedUbnd(e.target.value)}
              aria-label="Lọc theo Lãnh đạo UBND"
            >
              <option value="">Tất cả LĐ UBND</option>
              {ubndLeaders.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              className="pm-filter-select"
              value={selectedVp}
              onChange={e => setSelectedVp(e.target.value)}
              aria-label="Lọc theo Lãnh đạo VP"
            >
              <option value="">Tất cả LĐ VP</option>
              {vpLeaders.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              className="pm-filter-select"
              value={selectedSpecialist}
              onChange={e => setSelectedSpecialist(e.target.value)}
              aria-label="Lọc theo cán bộ chuyên trách"
            >
              <option value="">Tất cả Chuyên viên</option>
              {specialists.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(selectedDept || selectedUbnd || selectedVp || selectedSpecialist || quickFilter !== 'all') && (
              <button
                type="button"
                className="button ghost"
                style={{ padding: '3px 8px', fontSize: '11.5px', minHeight: '30px' }}
                onClick={() => {
                  setQuickFilter('all');
                  setSelectedDept('');
                  setSelectedUbnd('');
                  setSelectedVp('');
                  setSelectedSpecialist('');
                }}
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        <div className="pm-command-bottom">
          <span className="pm-legend-caption">
            Màu trạng thái: <strong style={{ color: '#DC2626' }}>Đỏ</strong>: Sở chưa trình · <strong style={{ color: '#D97706' }}>Cam</strong>: VP đang thực hiện · <strong style={{ color: '#059669' }}>Xanh</strong>: Đã xong
          </span>
          <span className="pm-result-counter">
            Đang hiển thị <strong>{filteredItems.length}</strong> / <strong>{totalCount}</strong> hồ sơ
          </span>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: KANBAN TIẾN ĐỘ
          ========================================================================= */}
      {viewMode === 'kanban' && (
        <div className="pm-kanban-board" role="region" aria-label="Bảng Kanban tiến độ trình HĐND">
          {kanbanColumns.map(col => (
            <section key={col.id} className={`pm-kanban-col kanban-tone-${col.tone}`}>
              <header className="pm-kanban-col-header">
                <div>
                  <h4>{col.title}</h4>
                  <p>{col.subtitle}</p>
                </div>
                <span className="pm-kanban-count">{col.items.length}</span>
              </header>
              <div className="pm-kanban-cards">
                {col.items.map(item => (
                  <article key={item.recordId} className={`pm-kanban-card card-tone-${col.tone}`}>
                    <div className="pm-kanban-card-top">
                      <strong
                        className={`executive-code-badge ${item.documentKind === 'BC' ? 'kind-bc' : ''}`}
                        title={isMissingDisplayCode(item.displayCode) ? undefined : 'Mã gốc: ' + item.displayCode}
                      >
                        {canShow('displayCode') ? displayId(item) : '—'}
                      </strong>
                      {canShow('type') && item.type && (
                        <span className={`executive-type executive-type-${compactTypeTone(item.type)}`}>
                          {field(item, 'type') || item.type}
                        </span>
                      )}
                      {item.isDropped && <span className="badge danger">ĐÃ RÚT</span>}
                    </div>
                    <div className="pm-kanban-card-title">
                      {field(item, 'content') || item.content || <span className="executive-muted">—</span>}
                    </div>
                    <div className="pm-kanban-card-dept">
                      <span className="pm-dept-tag">{item.department || '—'}</span>
                      {item.specialist && (
                        <span className="pm-room-tag">
                          {item.specialist} {item.room ? `(${item.room})` : ''}
                        </span>
                      )}
                    </div>
                    <div className="pm-kanban-subgates">
                      <span className="pm-mini-gate" style={{ background: '#f1f5f9', fontSize: '11px' }}>
                        TU: {field(item, 'progressParty') || '—'}
                      </span>
                      <span className="pm-mini-gate" style={{ background: '#f1f5f9', fontSize: '11px' }}>
                        HĐND: {field(item, 'progressCouncil') || '—'}
                      </span>
                    </div>
                    {(item.note?.trim() || item.specificProgress?.trim()) && (
                      <div className="pm-note-callout">
                        <span className="pm-note-icon">!</span>
                        <span>{item.specificProgress?.trim() ? item.specificProgress : item.note}</span>
                      </div>
                    )}
                  </article>
                ))}
                {!col.items.length && (
                  <div className="pm-kanban-empty">Không có hồ sơ trong giai đoạn này.</div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: BẢNG GỌN 4 CỤM (Executive Detail Table)
          ========================================================================= */}
      {viewMode === 'grouped' && (
        <div
          className="table-wrap executive-table-scroll"
          role="region"
          tabIndex={0}
          aria-label="Danh sách chi tiết bố cục gọn, cuộn ngang khi cần"
        >
          <table className="data-table executive-table">
            <colgroup>
              <col className="executive-col-code" />
              <col className="executive-col-content" />
              <col className="executive-col-people" />
              <col className="executive-col-flow" />
              <col className="executive-col-update" />
              <col className="executive-col-note" />
            </colgroup>
            <thead>
              <tr className="executive-clusters">
                <th colSpan={2} scope="colgroup">CỤM 01 · ĐỊNH DANH & HỒ SƠ</th>
                <th scope="colgroup">CỤM 02 · TRÁCH NHIỆM</th>
                <th scope="colgroup">CỤM 03 · CHUỖI TIẾN ĐỘ 3 KHÂU</th>
                <th colSpan={2} scope="colgroup">CỤM 04 · THEO DÕI & CHỈ ĐẠO</th>
              </tr>
              <tr className="executive-column-headings">
                <th scope="col">MÃ</th>
                <th scope="col">TÊN TỜ TRÌNH & ĐƠN VỊ CHỦ TRÌ</th>
                <th scope="col">LÃNH ĐẠO & CHUYÊN VIÊN</th>
                <th scope="col">THÀNH ỦY · XÂY DỰNG NQ · BAN HÀNH NQ</th>
                <th scope="col">TIẾN ĐỘ HIỆN TẠI</th>
                <th scope="col">GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const isBottleneck =
                  (item.progressCouncil ?? '').includes('Sở chưa trình') ||
                  (item.progressParty ?? '').includes('Sở chưa trình');
                const isDone =
                  (item.progressCouncil ?? '').includes('Đã trình HĐND') ||
                  (item.progressCouncil ?? '').includes('Hoàn thành');
                const rowState = item.isDropped
                  ? 'dropped'
                  : isBottleneck
                  ? 'bottleneck'
                  : isDone
                  ? 'done'
                  : 'active';
                return (
                  <tr key={item.recordId} data-row-state={rowState}>
                    <td data-col-key="displayCode" className="executive-code-cell">
                      <strong
                        className={'executive-code-badge' + (item.documentKind === 'BC' ? ' kind-bc' : '')}
                        title={isMissingDisplayCode(item.displayCode) ? undefined : 'Mã gốc: ' + item.displayCode}
                      >
                        {canShow('displayCode') ? displayId(item) : '—'}
                      </strong>
                      {hasDraft(item) && <span className="executive-draft">Chưa lưu</span>}
                      {errorFor(item) && <span role="alert" className="error-text">{errorFor(item)}</span>}
                    </td>
                    <td className="executive-content-cell">
                      <div className="executive-content-meta">
                        {canShow('type') && (
                          <span className={'executive-type executive-type-' + compactTypeTone(item.type)}>
                            {field(item, 'type') || '—'}
                          </span>
                        )}
                        {canShow('department') && (
                          <span className="executive-department">{field(item, 'department') || '—'}</span>
                        )}
                      </div>
                      <div className="executive-content-title">
                        {field(item, 'content') || <span className="executive-muted">—</span>}
                      </div>
                    </td>
                    <td className="executive-people-cell">
                      {([['ubndLeader', 'UBND'], ['vpLeader', 'LĐVP'], ['specialist', 'CV']] as const).map(
                        ([key, label]) => (
                          <div className="executive-person-line" key={key}>
                            <span className={'executive-person-tag executive-person-tag-' + key}>{label}</span>
                            <span className="executive-person-value">
                              {field(item, key) || <span className="executive-muted">—</span>}
                              {key === 'specialist' && canShow('room') && item.room && (
                                <> <span className="executive-person-room">({field(item, 'room')})</span></>
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </td>
                    <td className="executive-flow-cell">
                      <div className="executive-flow-row">
                        <span className="executive-flow-label">
                          Thành ủy{canShow('partyLevel') && item.partyLevel?.trim() ? <> ({field(item, 'partyLevel')})</> : ''}
                        </span>
                        <div className="executive-flow-value">{field(item, 'progressParty') || '—'}</div>
                      </div>
                      {status(item, 'progressBuild', 'Xây dựng NQ')}
                      {status(item, 'progressCouncil', 'Ban hành NQ')}
                    </td>
                    <td className="executive-update-cell">
                      {field(item, 'specificProgress') || <span className="executive-muted">—</span>}
                    </td>
                    <td className="executive-note-cell">
                      {field(item, 'note') || <span className="executive-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
              {!filteredItems.length && (
                <tr>
                  <td colSpan={6} className="empty">
                    Không có hồ sơ phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
