import type { ReactNode } from 'react';
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
};

/** Six presentation cells over fifteen unchanged Excel fields.
 * Source field permissions and leases are enforced by the parent's renderField.
 */
export function ExecutiveDetailTable({ items, visibleFields, renderField, hasDraft, errorFor, query, onQuery }: Props) {
  const canShow = (field: string) => visibleFields.has(field);
  const field = (item: Item, key: TextField) => canShow(key) ? renderField(item, key) : null;
  const status = (item: Item, key: TextField, label: string) =>
    <div className="executive-flow-row" key={key}>
      <span className="executive-flow-label">{label}</span>
      <div className={'executive-flow-value executive-flow-' + key}>
        {field(item,key) || <span className="executive-muted">—</span>}
      </div>
    </div>;
  return <div className="executive-detail">
    <div className="executive-detail-toolbar">
      <label className="executive-detail-search">
        <span>Tìm trong danh sách</span>
        <input type="search" value={query} onChange={event => onQuery(event.currentTarget.value)}
          placeholder="Mã, nội dung, sở, cán bộ, tiến độ, ghi chú…" />
      </label>
      <span className="executive-detail-total">{items.length} hồ sơ</span>
    </div>
    <div className="table-wrap executive-table-scroll" role="region" tabIndex={0}
      aria-label="Danh sách chi tiết bố cục gọn, cuộn ngang khi cần">
      <table className="data-table executive-table">
        <colgroup>
          <col className="executive-col-code"/>
          <col className="executive-col-content"/>
          <col className="executive-col-people"/>
          <col className="executive-col-flow"/>
          <col className="executive-col-update"/>
          <col className="executive-col-note"/>
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
        <tbody>{items.map(item => {
          const isBottleneck = (item.progressCouncil ?? '').includes('Sở chưa trình') || (item.progressParty ?? '').includes('Sở chưa trình');
          const isDone = (item.progressCouncil ?? '').includes('Đã trình HĐND') || (item.progressCouncil ?? '').includes('Hoàn thành');
          const rowState = item.isDropped ? 'dropped' : isBottleneck ? 'bottleneck' : isDone ? 'done' : 'active';
          return <tr key={item.recordId} data-row-state={rowState}>
          <td data-col-key="displayCode" className="executive-code-cell">
            <strong className={'executive-code-badge' + (item.documentKind === 'BC' ? ' kind-bc' : '')}
                    title={isMissingDisplayCode(item.displayCode)?undefined:'Mã gốc: '+item.displayCode}>
              {canShow('displayCode') ? displayId(item) : '—'}
            </strong>
            {hasDraft(item) && <span className="executive-draft">Chưa lưu</span>}
            {errorFor(item) && <span role="alert" className="error-text">{errorFor(item)}</span>}
          </td>
          <td className="executive-content-cell">
            <div className="executive-content-meta">
              {canShow('type') && <span className={'executive-type executive-type-' + compactTypeTone(item.type)}>
                {field(item,'type') || '—'}
              </span>}
              {canShow('department') && <span className="executive-department">{field(item,'department') || '—'}</span>}
            </div>
            <div className="executive-content-title">{field(item,'content') || <span className="executive-muted">—</span>}</div>
          </td>
          <td className="executive-people-cell">
            {([['ubndLeader','UBND'],['vpLeader','LĐVP'],['specialist','CV']] as const).map(([key,label]) =>
              <div className="executive-person-line" key={key}>
                <span className={'executive-person-tag executive-person-tag-' + key}>{label}</span>
                <span className="executive-person-value">
                  {field(item,key) || <span className="executive-muted">—</span>}
                  {key === 'specialist' && canShow('room') && item.room && <>
                    {' '}<span className="executive-person-room">({field(item,'room')})</span>
                  </>}
                </span>
              </div>)}
          </td>
          <td className="executive-flow-cell">
            <div className="executive-flow-row">
              <span className="executive-flow-label">
                Thành ủy{canShow('partyLevel') && item.partyLevel?.trim() ? <> ({field(item,'partyLevel')})</> : ''}
              </span>
              <div className="executive-flow-value">{field(item,'progressParty') || '—'}</div>
            </div>
            {status(item,'progressBuild','Xây dựng NQ')}
            {status(item,'progressCouncil','Ban hành NQ')}
          </td>
          <td className="executive-update-cell">{field(item,'specificProgress') || <span className="executive-muted">—</span>}</td>
          <td className="executive-note-cell">{field(item,'note') || <span className="executive-muted">—</span>}</td>
        </tr>;})} 
        {!items.length && <tr><td colSpan={6} className="empty">Không có hồ sơ phù hợp bộ lọc.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
