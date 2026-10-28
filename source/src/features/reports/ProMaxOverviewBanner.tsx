import { useMemo, useState } from 'react';
import type { GroupField, Item, ReportConfig } from '../../../shared/types';
import { GROUP_OPTIONS } from '../../../shared/field-definitions';
import { aggregateReport, DEFAULT_REPORTS, isActive, normalizeReportStatus } from '../../domain/reporting';
import { reportStage } from '../../domain/report-workflow';
import { compareCatalogValues } from '../../domain/catalog-order';
import { displayId } from '../../domain/display-id';
import { MemoReportTable } from './ReportTable';

interface ProMaxOverviewBannerProps {
  items: Item[];
  group: GroupField;
  onChangeGroup?: (next: GroupField) => void;
  groupOrder?: string[];
  reports?: ReportConfig[];
  sourceLabel?: string;
  onSelect: (title: string, items: Item[]) => void;
  onOpenItemsTab?: () => void;
}

type MatrixViewMode = 'unified' | 'party' | 'build' | 'council' | 'nq' | 'bc' | 'all';

interface UnifiedGroupRow {
  label: string;
  all: Item[];
  nq: Item[];
  bc: Item[];
  noted: Item[];
  partyRequired: Item[];
  partySource: Item[];
  partyOffice: Item[];
  partyDone: Item[];
  buildRequired: Item[];
  buildSource: Item[];
  buildOffice: Item[];
  buildDone: Item[];
  councilSource: Item[];
  councilOffice: Item[];
  councilDone: Item[];
  percent: number;
}

export function ProMaxOverviewBanner({
  items,
  group,
  onChangeGroup,
  groupOrder = [],
  reports = DEFAULT_REPORTS,
  sourceLabel = 'Dữ liệu mẫu',
  onSelect,
  onOpenItemsTab,
}: ProMaxOverviewBannerProps) {
  const [matrixMode, setMatrixMode] = useState<MatrixViewMode>('unified');
  const [sortByBottleneck, setSortByBottleneck] = useState<boolean>(true);

  const analytics = useMemo(() => {
    const active = items.filter(isActive);
    const partyCfg = DEFAULT_REPORTS[0];
    const buildCfg = DEFAULT_REPORTS[1];
    const councilCfg = DEFAULT_REPORTS[2];

    const gates = ([0, 1, 2] as const).map(idx => {
      const cfg = DEFAULT_REPORTS[idx];
      const agg = aggregateReport(items, cfg, group);
      const sourceItems: Item[] = [];
      const inFlightItems: Item[] = [];
      const doneItems: Item[] = [];

      for (const item of agg.items) {
        const st = reportStage(normalizeReportStatus(item[cfg.statusField], cfg), cfg);
        if (st === 'source') sourceItems.push(item);
        else if (st === 'completed') doneItems.push(item);
        else if (st === 'office' || st === 'next') inFlightItems.push(item);
      }

      return {
        id: cfg.id as 'party' | 'build' | 'council',
        stepNumber: idx + 1,
        kicker:
          idx === 0
            ? 'THẨM TRA & XIN Ý KIẾN THÀNH ỦY'
            : idx === 1
              ? 'ĐĂNG KÝ VỚI THƯỜNG TRỰC HĐND'
              : 'KỲ HỌP HĐND THÀNH PHỐ',
        title:
          idx === 0
            ? 'Tiến độ xin ý kiến Thành ủy'
            : idx === 1
              ? 'Tiến độ trình xây dựng NQ'
              : 'Tiến độ trình ban hành NQ',
        doneLabel:
          idx === 0 ? 'Đã có TBKL' : idx === 1 ? 'Đã có QĐ chấp thuận' : 'Đã trình HĐND TP',
        total: agg.total,
        percent: agg.percent ?? 0,
        sourceItems,
        inFlightItems,
        doneItems,
        allItems: agg.items,
      };
    });

    // Bottleneck ranking by department & executive notes
    const deptPendingMap = new Map<string, Item[]>();
    const notedItems: Item[] = [];
    const rowMap = new Map<string, UnifiedGroupRow>();

    const ensureGroupRow = (label: string): UnifiedGroupRow => {
      let existing = rowMap.get(label);
      if (!existing) {
        existing = {
          label,
          all: [],
          nq: [],
          bc: [],
          noted: [],
          partyRequired: [],
          partySource: [],
          partyOffice: [],
          partyDone: [],
          buildRequired: [],
          buildSource: [],
          buildOffice: [],
          buildDone: [],
          councilSource: [],
          councilOffice: [],
          councilDone: [],
          percent: 0,
        };
        rowMap.set(label, existing);
      }
      return existing;
    };

    for (const item of active) {
      if (item.note.trim()) notedItems.push(item);

      const dept = item.department.trim() || 'Chưa phân công';
      const councilNorm = normalizeReportStatus(item.progressCouncil, councilCfg);
      const councilSt = reportStage(councilNorm, councilCfg);
      if (councilSt === 'source') {
        const list = deptPendingMap.get(dept) ?? [];
        list.push(item);
        deptPendingMap.set(dept, list);
      }

      const grpLabel = item[group].trim() || 'Chưa phân công';
      const row = ensureGroupRow(grpLabel);
      row.all.push(item);
      if (item.documentKind === 'NQ') row.nq.push(item);
      else if (item.documentKind === 'BC') row.bc.push(item);
      if (item.note.trim()) row.noted.push(item);

      // Gate 1: Party
      const partyNorm = normalizeReportStatus(item.progressParty, partyCfg);
      const partySt = reportStage(partyNorm, partyCfg);
      if (partySt !== 'excluded') {
        row.partyRequired.push(item);
        if (partySt === 'source') row.partySource.push(item);
        else if (partySt === 'completed') row.partyDone.push(item);
        else row.partyOffice.push(item);
      }

      // Gate 2: Build NQ
      if (item.documentKind === 'NQ') {
        const buildNorm = normalizeReportStatus(item.progressBuild, buildCfg);
        const buildSt = reportStage(buildNorm, buildCfg);
        if (buildSt !== 'excluded') {
          row.buildRequired.push(item);
          if (buildSt === 'source') row.buildSource.push(item);
          else if (buildSt === 'completed') row.buildDone.push(item);
          else row.buildOffice.push(item);
        }
      }

      // Gate 3: Council
      if (councilSt === 'source') row.councilSource.push(item);
      else if (councilSt === 'completed') row.councilDone.push(item);
      else row.councilOffice.push(item);
    }

    const unifiedRows = [...rowMap.values()].map(r => ({
      ...r,
      percent: r.all.length ? Math.round((r.councilDone.length / r.all.length) * 100) : 0,
    }));

    unifiedRows.sort((a, b) => {
      if (sortByBottleneck) {
        if (b.councilSource.length !== a.councilSource.length) {
          return b.councilSource.length - a.councilSource.length;
        }
        const bTotalPending = b.partySource.length + b.buildSource.length;
        const aTotalPending = a.partySource.length + a.buildSource.length;
        if (bTotalPending !== aTotalPending) {
          return bTotalPending - aTotalPending;
        }
      }
      return compareCatalogValues(a.label, b.label, groupOrder);
    });

    const topBottleneckDepts = [...deptPendingMap.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);

    const totals = unifiedRows.reduce(
      (acc, r) => {
        acc.all.push(...r.all);
        acc.nq.push(...r.nq);
        acc.bc.push(...r.bc);
        acc.partySource.push(...r.partySource);
        acc.partyOffice.push(...r.partyOffice);
        acc.partyDone.push(...r.partyDone);
        acc.buildSource.push(...r.buildSource);
        acc.buildOffice.push(...r.buildOffice);
        acc.buildDone.push(...r.buildDone);
        acc.councilSource.push(...r.councilSource);
        acc.councilOffice.push(...r.councilOffice);
        acc.councilDone.push(...r.councilDone);
        return acc;
      },
      {
        all: [] as Item[],
        nq: [] as Item[],
        bc: [] as Item[],
        partySource: [] as Item[],
        partyOffice: [] as Item[],
        partyDone: [] as Item[],
        buildSource: [] as Item[],
        buildOffice: [] as Item[],
        buildDone: [] as Item[],
        councilSource: [] as Item[],
        councilOffice: [] as Item[],
        councilDone: [] as Item[],
      }
    );

    const totalPercent = totals.all.length
      ? Math.round((totals.councilDone.length / totals.all.length) * 100)
      : 0;

    return {
      gates,
      topBottleneckDepts,
      notedItems,
      droppedItems: items.filter(i => i.isDropped),
      unifiedRows,
      totals,
      totalPercent,
    };
  }, [items, group, groupOrder, sortByBottleneck]);

  const groupTitle = GROUP_OPTIONS.find(g => g.key === group)?.label ?? 'Đơn vị chủ trì';
  const visibleDetailedReports = useMemo(() => {
    if (matrixMode === 'unified') return [];
    if (matrixMode === 'all') return reports;
    return reports.filter(r => r.id === matrixMode);
  }, [matrixMode, reports]);

  return (
    <div className="pm-executive-overview-suite">
      {/* 1. 3-GATE GOVERNANCE PIPELINE */}
      <section className="pm-pipeline-section" aria-label="Chuỗi tiến độ 3 khâu trọng tâm">
        <div className="pm-section-title-row">
          <div>
            <span className="pm-eyebrow">CHUỖI QUY TRÌNH 3 CỬA ẢI THẨM TRA & TRÌNH KỲ HỌP</span>
            <h2 className="pm-section-heading">Bức tranh tiến độ tổng thể theo 3 khâu công việc</h2>
          </div>
          {onOpenItemsTab && (
            <button type="button" className="button primary pm-jump-items-btn" onClick={onOpenItemsTab}>
              ✨ Mở Bảng Hồ Sơ Chắt Lọc 4 Cụm →
            </button>
          )}
        </div>

        <div className="pm-gate-cards-grid">
          {analytics.gates.map(gate => {
            const safeTotal = Math.max(1, gate.total);
            const sourcePct = Math.round((gate.sourceItems.length / safeTotal) * 100);
            const flightPct = Math.round((gate.inFlightItems.length / safeTotal) * 100);
            const donePct = Math.round((gate.doneItems.length / safeTotal) * 100);

            return (
              <article key={gate.id} className="pm-gate-overview-card" data-gate-id={gate.id}>
                <div className="pm-gate-card-head">
                  <div>
                    <span className="pm-gate-kicker">{gate.kicker}</span>
                    <h3>
                      <button
                        type="button"
                        className="pm-gate-anchor-btn"
                        onClick={() => setMatrixMode(gate.id)}
                      >
                        {gate.title}
                      </button>
                    </h3>
                  </div>
                  <div className="pm-gate-percent-badge" data-complete={gate.percent === 100 ? 'true' : undefined}>
                    <strong>{gate.percent}%</strong>
                    <small>{gate.doneItems.length}/{gate.total} hoàn thành</small>
                  </div>
                </div>

                <div className="pm-gate-progress-track" aria-hidden="true">
                  {gate.doneItems.length > 0 && (
                    <span className="pm-track-seg seg-done" style={{ width: `${Math.max(4, donePct)}%` }} />
                  )}
                  {gate.inFlightItems.length > 0 && (
                    <span className="pm-track-seg seg-office" style={{ width: `${Math.max(4, flightPct)}%` }} />
                  )}
                  {gate.sourceItems.length > 0 && (
                    <span className="pm-track-seg seg-source" style={{ width: `${Math.max(4, sourcePct)}%` }} />
                  )}
                </div>

                <div className="pm-gate-Mini-metrics">
                  <button
                    type="button"
                    className="pm-gate-metric metric-source"
                    disabled={gate.sourceItems.length === 0}
                    onClick={() => onSelect(`${gate.title} · Sở chưa trình`, gate.sourceItems)}
                  >
                    <span className="pm-metric-label">Sở chưa trình</span>
                    <strong>{gate.sourceItems.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="pm-gate-metric metric-office"
                    disabled={gate.inFlightItems.length === 0}
                    onClick={() => onSelect(`${gate.title} · Đang xử lý`, gate.inFlightItems)}
                  >
                    <span className="pm-metric-label">Đang xử lý</span>
                    <strong>{gate.inFlightItems.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="pm-gate-metric metric-done"
                    disabled={gate.doneItems.length === 0}
                    onClick={() => onSelect(`${gate.title} · ${gate.doneLabel}`, gate.doneItems)}
                  >
                    <span className="pm-metric-label">{gate.doneLabel}</span>
                    <strong>{gate.doneItems.length}</strong>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 2. DUAL EXECUTIVE SPOTLIGHT: BOTTLENECK RADAR + EXECUTIVE NOTES */}
      {(analytics.topBottleneckDepts.length > 0 || analytics.notedItems.length > 0) && (
        <section className="pm-dual-spotlight-grid" aria-label="Tâm điểm đôn đốc và lưu ý chỉ đạo">
          {/* Left: Bottleneck Radar */}
          <article className="pm-spotlight-card spotlight-bottleneck">
            <div className="pm-spotlight-head">
              <div className="pm-spotlight-title-wrap">
                <span className="pm-radar-pulse-dot" aria-hidden="true" />
                <div>
                  <span className="pm-spotlight-kicker">CẢNH BÁO ĐIỂM NGHẼN</span>
                  <h3>Đơn vị còn nợ hồ sơ trình HĐND (Sở chưa trình)</h3>
                </div>
              </div>
              {analytics.totals.councilSource.length > 0 && (
                <button
                  type="button"
                  className="pm-spotlight-action-btn tone-danger"
                  onClick={() => onSelect('Tất cả hồ sơ Sở chưa trình HĐND', analytics.totals.councilSource)}
                >
                  Xem {analytics.totals.councilSource.length} hồ sơ chậm →
                </button>
              )}
            </div>

            {analytics.topBottleneckDepts.length > 0 ? (
              <div className="pm-bottleneck-bars">
                {analytics.topBottleneckDepts.map(([dept, deptItems]) => {
                  const maxCount = Math.max(1, analytics.topBottleneckDepts[0][1].length);
                  const barWidth = Math.max(12, Math.round((deptItems.length / maxCount) * 100));
                  return (
                    <button
                      type="button"
                      key={dept}
                      className="pm-bottleneck-bar-row"
                      onClick={() => onSelect(`Đôn đốc Sở chưa trình · ${dept}`, deptItems)}
                    >
                      <div className="pm-bottleneck-row-top">
                        <strong className="pm-bottleneck-dept-name">{dept}</strong>
                        <span className="pm-bottleneck-count-pill">{deptItems.length} chưa trình</span>
                      </div>
                      <div className="pm-bottleneck-bar-track" aria-hidden="true">
                        <span className="pm-bottleneck-bar-fill" style={{ width: `${barWidth}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="pm-spotlight-empty">Tất cả các Sở, ngành đã trình đầy đủ hồ sơ.</p>
            )}
          </article>

          {/* Right: Executive Notes & Special Instructions Spotlight */}
          <article className="pm-spotlight-card spotlight-notes">
            <div className="pm-spotlight-head">
              <div className="pm-spotlight-title-wrap">
                <span className="pm-note-spotlight-icon" aria-hidden="true">!</span>
                <div>
                  <span className="pm-spotlight-kicker">TÂM ĐIỂM LƯU Ý & CHỈ ĐẠO</span>
                  <h3>Hồ sơ có ghi chú quan trọng / vướng mắc cần xử lý</h3>
                </div>
              </div>
              {analytics.notedItems.length > 0 && (
                <button
                  type="button"
                  className="pm-spotlight-action-btn tone-amber"
                  onClick={() => onSelect('Hồ sơ có ghi chú / lưu ý chỉ đạo', analytics.notedItems)}
                >
                  Tất cả ({analytics.notedItems.length}) →
                </button>
              )}
            </div>

            {analytics.notedItems.length > 0 ? (
              <div className="pm-noted-Feed">
                {analytics.notedItems.slice(0, 3).map(item => (
                  <button
                    type="button"
                    key={item.recordId}
                    className="pm-noted-feed-item"
                    onClick={() => onSelect(`Chi tiết lưu ý · ${displayId(item)}`, [item])}
                  >
                    <div className="pm-noted-item-meta">
                      <span className="pm-noted-code" data-kind={item.documentKind}>
                        {displayId(item)}
                      </span>
                      <span className="pm-noted-dept">{item.department || 'Chưa phân công'}</span>
                      <span className="pm-noted-status">{item.progressCouncil || 'Sở chưa trình'}</span>
                    </div>
                    <p className="pm-noted-content-preview">{item.content}</p>
                    <div className="pm-noted-callout-pill">
                      <strong>Lưu ý:</strong> {item.note}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="pm-spotlight-empty">Hiện chưa có hồ sơ nào gắn ghi chú chỉ đạo đặc biệt.</p>
            )}
          </article>
        </section>
      )}

      {/* 3. UNIFIED CROSS-STAGE GOVERNANCE MATRIX & VIEW SWITCHER */}
      <section className="pm-matrix-command-section" aria-label="Bảng ma trận điều hành tiến độ">
        <div className="pm-matrix-control-bar">
          <div className="pm-matrix-mode-tabs" role="tablist" aria-label="Chọn chế độ bảng tổng hợp">
            <button
              type="button"
              className={'pm-matrix-tab-btn' + (matrixMode === 'unified' ? ' active' : '')}
              onClick={() => setMatrixMode('unified')}
            >
              ✨ Ma trận Hợp nhất 3 Khâu
            </button>
            <button
              type="button"
              className={'pm-matrix-tab-btn' + (matrixMode === 'party' ? ' active' : '')}
              onClick={() => setMatrixMode('party')}
            >
              1. Tiến độ xin ý kiến Thành ủy
            </button>
            <button
              type="button"
              className={'pm-matrix-tab-btn' + (matrixMode === 'build' ? ' active' : '')}
              onClick={() => setMatrixMode('build')}
            >
              2. Xây dựng NQ
            </button>
            <button
              type="button"
              className={'pm-matrix-tab-btn' + (matrixMode === 'council' ? ' active' : '')}
              onClick={() => setMatrixMode('council')}
            >
              3. Trình HĐND (NQ & BC)
            </button>
            <button
              type="button"
              className={'pm-matrix-tab-btn' + (matrixMode === 'all' ? ' active' : '')}
              onClick={() => setMatrixMode('all')}
            >
              📑 Tất cả 5 bảng ({reports.length})
            </button>
          </div>

          <div className="pm-matrix-right-controls">
            {onChangeGroup && (
              <label className="pm-group-selector-label">
                <span>Nhóm theo:</span>
                <select
                  className="pm-group-select"
                  value={group}
                  onChange={e => onChangeGroup(e.target.value as GroupField)}
                >
                  {GROUP_OPTIONS.map(option => (
                    <option value={option.key} key={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {matrixMode === 'unified' && (
              <button
                type="button"
                className={'pm-sort-bottleneck-btn' + (sortByBottleneck ? ' active' : '')}
                onClick={() => setSortByBottleneck(v => !v)}
                title="Đưa các đơn vị còn nợ hồ sơ Sở chưa trình lên đầu bảng"
              >
                {sortByBottleneck ? '🔴 Đang ưu tiên Điểm nghẽn' : '📋 Thứ tự danh mục'}
              </button>
            )}
          </div>
        </div>

        {matrixMode === 'unified' ? (
          <div className="pm-unified-matrix-card">
            <div className="pm-unified-matrix-header">
              <div>
                <span className="pm-eyebrow">MA TRẬN ĐIỀU HÀNH CHẮT LỌC · GỘP 3 KHÂU TRONG 1 BẢNG</span>
                <h3>
                  Tiến độ xuyên suốt theo {groupTitle} ({analytics.unifiedRows.length} nhóm ·{' '}
                  {analytics.totals.all.length} hồ sơ)
                </h3>
              </div>
              <div className="pm-unified-legend">
                <span className="pm-legend-pill tone-source">🔴 Sở chưa trình (Điểm nghẽn)</span>
                <span className="pm-legend-pill tone-office">🟡 Đang thẩm tra / Chờ kết quả</span>
                <span className="pm-legend-pill tone-done">🟢 Đã hoàn thành khâu</span>
              </div>
            </div>

            <div className="table-wrap pm-unified-table-wrap">
              <table className="pm-unified-table">
                <thead>
                  <tr className="pm-unified-cluster-head">
                    <th rowSpan={2} className="col-unit">
                      {groupTitle}
                    </th>
                    <th rowSpan={2} className="col-structure">
                      Quy mô & Loại
                    </th>
                    <th colSpan={2} className="col-cluster-pre">
                      Tiến độ 2 Khâu Tiền kỳ họp (Tóm tắt)
                    </th>
                    <th colSpan={3} className="col-cluster-final">
                      Khâu 3 · Đích Trình HĐND Thành phố
                    </th>
                    <th rowSpan={2} className="col-rate">
                      Tỷ lệ hoàn thành
                    </th>
                  </tr>
                  <tr className="pm-unified-sub-head">
                    <th className="col-pre-gate">Khâu 1 · Tiến độ xin ý kiến Thành ủy</th>
                    <th className="col-pre-gate">Khâu 2 · Xây dựng Nghị quyết</th>
                    <th className="col-final-source">🔴 Sở chưa trình</th>
                    <th className="col-final-office">🟡 VP đang thực hiện</th>
                    <th className="col-final-done">🟢 Đã trình HĐND</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.unifiedRows.map(row => {
                    const hasBottleneck = row.councilSource.length > 0;
                    const isAllDone = row.all.length > 0 && row.councilDone.length === row.all.length;
                    return (
                      <tr
                        key={row.label}
                        data-row-bottleneck={hasBottleneck ? 'true' : undefined}
                        data-row-complete={isAllDone ? 'true' : undefined}
                      >
                        {/* Unit name + alerts */}
                        <th scope="row" className="pm-unit-cell">
                          <div className="pm-unit-name-wrap">
                            <span className="pm-unit-title">{row.label}</span>
                            {hasBottleneck && (
                              <span className="pm-unit-alert-tag" title="Còn hồ sơ Sở chưa trình HĐND">
                                Cần đôn đốc
                              </span>
                            )}
                            {row.noted.length > 0 && (
                              <button
                                type="button"
                                className="pm-unit-note-tag"
                                onClick={() => onSelect(`${row.label} · Có ghi chú lưu ý`, row.noted)}
                                title="Xem các hồ sơ có ghi chú chỉ đạo"
                              >
                                ! {row.noted.length} lưu ý
                              </button>
                            )}
                          </div>
                        </th>

                        {/* Total + NQ/BC breakdown */}
                        <td className="pm-structure-cell">
                          <div className="pm-structure-stack">
                            <button
                              type="button"
                              className="pm-total-count-btn"
                              onClick={() => onSelect(`${row.label} · Tất cả hồ sơ`, row.all)}
                            >
                              <strong>{row.all.length}</strong> hồ sơ
                            </button>
                            <div className="pm-nq-bc-mini">
                              {row.nq.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-mini-kind-pill kind-nq"
                                  onClick={() => onSelect(`${row.label} · Nghị quyết (NQ)`, row.nq)}
                                >
                                  {row.nq.length} NQ
                                </button>
                              )}
                              {row.bc.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-mini-kind-pill kind-bc"
                                  onClick={() => onSelect(`${row.label} · Báo cáo (BC)`, row.bc)}
                                >
                                  {row.bc.length} BC
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Gate 1: Party Summary */}
                        <td className="pm-pre-gate-cell">
                          {row.partyRequired.length === 0 ? (
                            <span className="pm-exempt-inline">Không phải trình</span>
                          ) : (
                            <div className="pm-stage-pill-group">
                              {row.partySource.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-stage-micro-pill tone-source"
                                  onClick={() =>
                                    onSelect(`${row.label} · Khâu Thành ủy: Sở chưa trình`, row.partySource)
                                  }
                                  title="Sở chưa trình xin ý kiến Thành ủy"
                                >
                                  🔴 {row.partySource.length} chưa trình
                                </button>
                              )}
                              {row.partyOffice.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-stage-micro-pill tone-office"
                                  onClick={() =>
                                    onSelect(`${row.label} · Khâu Thành ủy: Đang xử lý`, row.partyOffice)
                                  }
                                  title="Đang xử lý tại VP / Đảng ủy / Thành ủy"
                                >
                                  🟡 {row.partyOffice.length} đang trình
                                </button>
                              )}
                              {row.partyDone.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-stage-micro-pill tone-done"
                                  onClick={() =>
                                    onSelect(`${row.label} · Khâu Thành ủy: Đã có TBKL`, row.partyDone)
                                  }
                                  title="Đã có Thông báo kết luận của Thành ủy"
                                >
                                  🟢 {row.partyDone.length} có TBKL
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Gate 2: Build NQ Summary */}
                        <td className="pm-pre-gate-cell">
                          {row.buildRequired.length === 0 ? (
                            <span className="pm-exempt-inline">Không phải trình</span>
                          ) : (
                            <div className="pm-stage-pill-group">
                              {row.buildSource.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-stage-micro-pill tone-source"
                                  onClick={() =>
                                    onSelect(`${row.label} · Khâu Xây dựng NQ: Sở chưa trình`, row.buildSource)
                                  }
                                  title="Sở chưa trình đăng ký xây dựng NQ"
                                >
                                  🔴 {row.buildSource.length} chưa trình
                                </button>
                              )}
                              {row.buildOffice.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-stage-micro-pill tone-office"
                                  onClick={() =>
                                    onSelect(`${row.label} · Khâu Xây dựng NQ: Đang xử lý`, row.buildOffice)
                                  }
                                  title="VP đang thẩm tra hoặc chờ QĐ chấp thuận"
                                >
                                  🟡 {row.buildOffice.length} đang trình
                                </button>
                              )}
                              {row.buildDone.length > 0 && (
                                <button
                                  type="button"
                                  className="pm-stage-micro-pill tone-done"
                                  onClick={() =>
                                    onSelect(`${row.label} · Khâu Xây dựng NQ: Đã có QĐ`, row.buildDone)
                                  }
                                  title="Đã có Quyết định chấp thuận xây dựng NQ"
                                >
                                  🟢 {row.buildDone.length} có QĐ
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Gate 3 Column A: Sở chưa trình */}
                        <td className="pm-final-cell cell-source">
                          {row.councilSource.length > 0 ? (
                            <button
                              type="button"
                              className="pm-count-badge badge-source"
                              onClick={() =>
                                onSelect(`${row.label} · Sở chưa trình HĐND`, row.councilSource)
                              }
                            >
                              {row.councilSource.length}
                            </button>
                          ) : (
                            <span className="pm-zero-dash">—</span>
                          )}
                        </td>

                        {/* Gate 3 Column B: VP đang thực hiện */}
                        <td className="pm-final-cell cell-office">
                          {row.councilOffice.length > 0 ? (
                            <button
                              type="button"
                              className="pm-count-badge badge-office"
                              onClick={() =>
                                onSelect(`${row.label} · VP đang thực hiện`, row.councilOffice)
                              }
                            >
                              {row.councilOffice.length}
                            </button>
                          ) : (
                            <span className="pm-zero-dash">—</span>
                          )}
                        </td>

                        {/* Gate 3 Column C: Đã trình HĐND */}
                        <td className="pm-final-cell cell-done">
                          {row.councilDone.length > 0 ? (
                            <button
                              type="button"
                              className="pm-count-badge badge-done"
                              onClick={() =>
                                onSelect(`${row.label} · Đã trình HĐND thành phố`, row.councilDone)
                              }
                            >
                              {row.councilDone.length}
                            </button>
                          ) : (
                            <span className="pm-zero-dash">—</span>
                          )}
                        </td>

                        {/* Completion Rate */}
                        <td className="pm-rate-cell">
                          <div className="pm-rate-box" data-complete={row.percent === 100 ? 'true' : undefined}>
                            <div className="pm-rate-bar-track" aria-hidden="true">
                              <span className="pm-rate-bar-fill" style={{ width: `${row.percent}%` }} />
                            </div>
                            <strong className="pm-rate-text">{row.percent}%</strong>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">TỔNG CỘNG TOÀN THÀNH PHỐ</th>
                    <td className="pm-structure-cell">
                      <button
                        type="button"
                        className="pm-total-count-btn"
                        onClick={() => onSelect('Tổng cộng · Tất cả hồ sơ đang trình', analytics.totals.all)}
                      >
                        <strong>{analytics.totals.all.length}</strong> ({analytics.totals.nq.length} NQ ·{' '}
                        {analytics.totals.bc.length} BC)
                      </button>
                    </td>
                    <td className="pm-pre-gate-cell">
                      <div className="pm-stage-pill-group">
                        <span className="pm-stage-micro-pill tone-source">
                          🔴 {analytics.totals.partySource.length}
                        </span>
                        <span className="pm-stage-micro-pill tone-office">
                          🟡 {analytics.totals.partyOffice.length}
                        </span>
                        <span className="pm-stage-micro-pill tone-done">
                          🟢 {analytics.totals.partyDone.length}
                        </span>
                      </div>
                    </td>
                    <td className="pm-pre-gate-cell">
                      <div className="pm-stage-pill-group">
                        <span className="pm-stage-micro-pill tone-source">
                          🔴 {analytics.totals.buildSource.length}
                        </span>
                        <span className="pm-stage-micro-pill tone-office">
                          🟡 {analytics.totals.buildOffice.length}
                        </span>
                        <span className="pm-stage-micro-pill tone-done">
                          🟢 {analytics.totals.buildDone.length}
                        </span>
                      </div>
                    </td>
                    <td className="pm-final-cell cell-source">
                      <button
                        type="button"
                        className="pm-count-badge badge-source"
                        disabled={analytics.totals.councilSource.length === 0}
                        onClick={() =>
                          onSelect('Tổng cộng · Sở chưa trình HĐND', analytics.totals.councilSource)
                        }
                      >
                        {analytics.totals.councilSource.length}
                      </button>
                    </td>
                    <td className="pm-final-cell cell-office">
                      <button
                        type="button"
                        className="pm-count-badge badge-office"
                        disabled={analytics.totals.councilOffice.length === 0}
                        onClick={() =>
                          onSelect('Tổng cộng · VP đang thực hiện', analytics.totals.councilOffice)
                        }
                      >
                        {analytics.totals.councilOffice.length}
                      </button>
                    </td>
                    <td className="pm-final-cell cell-done">
                      <button
                        type="button"
                        className="pm-count-badge badge-done"
                        disabled={analytics.totals.councilDone.length === 0}
                        onClick={() =>
                          onSelect('Tổng cộng · Đã trình HĐND thành phố', analytics.totals.councilDone)
                        }
                      >
                        {analytics.totals.councilDone.length}
                      </button>
                    </td>
                    <td className="pm-rate-cell">
                      <div
                        className="pm-rate-box"
                        data-complete={analytics.totalPercent === 100 ? 'true' : undefined}
                      >
                        <div className="pm-rate-bar-track" aria-hidden="true">
                          <span
                            className="pm-rate-bar-fill"
                            style={{ width: `${analytics.totalPercent}%` }}
                          />
                        </div>
                        <strong className="pm-rate-text">{analytics.totalPercent}%</strong>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="pm-detailed-reports-stack">
            {visibleDetailedReports.map(config => (
              <MemoReportTable
                key={config.id}
                items={items}
                config={config}
                group={group}
                groupOrder={groupOrder}
                sourceLabel={sourceLabel}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
