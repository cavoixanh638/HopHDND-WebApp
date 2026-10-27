import type { Item, ReportConfig } from '../../../shared/types';
import { aggregateReport, normalizeReportStatus, reportItems } from '../../domain/reporting';
import { reportStage, type ReportStage } from '../../domain/report-workflow';

export type ExecutiveStage = Extract<ReportStage, 'source' | 'office' | 'next' | 'completed'>;
export type ExecutiveFilter = { reportId: string; stage: ExecutiveStage } | null;
export type ExecutiveCardSummary = {
  id: string; title: string; total: number; completed: number; percent: number;
  config: ReportConfig; counts: Record<ExecutiveStage, number>;
  buckets: Record<ExecutiveStage, Item[]>; unclassified: number;
};

export const EXECUTIVE_STAGES: readonly ExecutiveStage[] = ['source', 'office', 'next', 'completed'];
export const EXECUTIVE_TITLES: Readonly<Record<string, string>> = {
  party: 'Tiến độ xin ý kiến Thành ủy',
  build: 'Tiến độ trình xây dựng NQ',
  council: 'Tiến độ trình ban hành NQ',
  nq: 'Tiến độ trình ban hành NQ',
};
export const executiveStageLabel = (id: string, stage: ExecutiveStage): string => {
  if (stage === 'source') return 'Sở chưa trình';
  if (stage === 'office') return 'VP đang thực hiện';
  if (stage === 'next') return id === 'build' ? 'Đã trình, chưa có QĐ' : 'Bước tiếp theo';
  return id === 'party' ? 'Đã có TBKL' : id === 'build' ? 'Đã có QĐ chấp thuận' : 'Đã trình HĐND TP';
};

/** Same reportItems scope, aliases and completion rules as the main report table.
 * Only intermediate statuses between office processing and completion count as "next".
 * Unknown status remains in the denominator but is NEVER presented as completed.
 */
export function buildExecutiveSummary(items: Item[], config: ReportConfig): ExecutiveCardSummary {
  const report = aggregateReport(items, config, 'department');
  const buckets: Record<ExecutiveStage, Item[]> = { source: [], office: [], next: [], completed: [] };
  let unclassified = 0;
  for (const item of report.items) {
    const stage = reportStage(normalizeReportStatus(item[config.statusField], config), config);
    if (stage in buckets) buckets[stage as ExecutiveStage].push(item);
    else unclassified++;
  }
  const counts = Object.fromEntries(EXECUTIVE_STAGES.map(stage => [stage, buckets[stage].length]))
    as Record<ExecutiveStage, number>;
  return {
    id: config.id, title: EXECUTIVE_TITLES[config.id] ?? config.title,
    total: report.total, completed: report.completedCount,
    percent: report.percent ?? 0, config, counts, buckets, unclassified,
  };
}

export function getExecutiveCards(items: Item[], configs: readonly ReportConfig[]): ExecutiveCardSummary[] {
  const names = ['party', 'build', 'council'] as const;
  return names.flatMap(id => {
    const config = configs.find(candidate => candidate.id === id)
      ?? (id === 'council' ? configs.find(candidate => candidate.id === 'nq') : undefined);
    return config ? [buildExecutiveSummary(items, config)] : [];
  });
}

export function filterByExecutiveStage(items: Item[], cards: readonly ExecutiveCardSummary[], selection: ExecutiveFilter): Item[] {
  if (!selection) return items;
  const card = cards.find(entry => entry.id === selection.reportId);
  if (!card) return items;
  // Membership is by immutable recordId. Filtering never affects report totals.
  const ids = new Set(card.buckets[selection.stage].map(item => item.recordId));
  return items.filter(item => ids.has(item.recordId));
}

/** Summaries deliberately receive authoritative report items, not a locally filtered
 * table subset. Numbers must match the existing Báo cáo tổng hợp for the same config.
 */
export function ExecutiveProgressCards({ items, configs, selected, onSelect }: {
  items: Item[]; configs: readonly ReportConfig[];
  selected: ExecutiveFilter;
  onSelect: (selection: ExecutiveFilter) => void;
}) {
  const cards = getExecutiveCards(items, configs);
  if (!cards.length) return null;
  return <section className="executive-report-cards" aria-label="Tổng hợp tiến độ phía trên danh sách chi tiết">
    {cards.map((card, index) => <article className={'executive-report-card executive-report-card-' + index} key={card.id}>
      <div className="executive-report-header">
        <h3>{card.title}</h3>
        <div className="executive-report-completion">
          <strong>{card.percent}%</strong>
          <span>{card.completed}/{card.total} hoàn thành</span>
        </div>
      </div>
      <div className="executive-progress-track" role="img"
        aria-label={card.title + ': ' + EXECUTIVE_STAGES.map(stage =>
          executiveStageLabel(card.id, stage) + ' ' + card.counts[stage]).join(', ')}>
        {EXECUTIVE_STAGES.map(stage => card.counts[stage] > 0 &&
          <span key={stage} className={'executive-progress-segment executive-progress-' + stage}
            style={{flexGrow:card.counts[stage],flexBasis:0}} title={executiveStageLabel(card.id, stage) + ': ' + card.counts[stage]} />)}
        {card.unclassified > 0 && <span className="executive-progress-unclassified"
          style={{flexGrow:card.unclassified,flexBasis:0}} title={'Trạng thái không thuộc bốn nhóm: ' + card.unclassified}/>}
      </div>
      <div className={'executive-status-grid' + (card.id === 'council' || card.id === 'nq' ? ' executive-status-grid-three' : '')}>
        {EXECUTIVE_STAGES.filter(stage => !(stage === 'next' && ['council','nq'].includes(card.id))).map(stage =>
          <button type="button" key={stage} className={'executive-status executive-status-' + stage}
            aria-pressed={selected?.reportId === card.id && selected.stage === stage}
            aria-label={card.title + ' · ' + executiveStageLabel(card.id,stage) + ': ' + card.counts[stage] + ' hồ sơ. Bấm để lọc danh sách.'}
            onClick={() => onSelect(selected?.reportId === card.id && selected.stage === stage ? null : { reportId:card.id, stage })}>
            <span>{executiveStageLabel(card.id,stage)}</span><strong>{card.counts[stage]}</strong>
          </button>)}
      </div>
      {card.unclassified > 0 && <p className="executive-unclassified-note">
        {card.unclassified} hồ sơ có trạng thái khác/không áp dụng; vẫn tính trong tổng, không tự coi là hoàn thành.
      </p>}
    </article>)}
    {selected && <div className="executive-filter-clear" role="status">
      Đang lọc theo: {cards.find(card => card.id === selected.reportId)?.title} · {executiveStageLabel(selected.reportId,selected.stage)}
      <button type="button" className="button ghost" onClick={() => onSelect(null)}>Xóa lọc báo cáo</button>
    </div>}
  </section>;
}
