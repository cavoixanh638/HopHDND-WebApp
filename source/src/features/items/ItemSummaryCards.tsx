import {useMemo} from 'react';
import type {Item} from '../../../shared/types';
import {summarizeListItems,type SummaryStage} from '../../domain/item-summary';

function StageCard({stage}: {stage:SummaryStage}){
  const pct=stage.percent??0;
  return <article className={'item-summary-card item-summary-'+stage.id}
    data-summary-card={stage.id}>
    <div className="item-summary-card-head"><h3>{stage.title}</h3>
      <strong className="item-summary-percent">{pct}%</strong></div>
    <p className="item-summary-fraction"><strong>{stage.complete}</strong> / {stage.total} hoàn thành</p>
    <div className="item-summary-progress" role="progressbar"
      aria-label={'Tỷ lệ hoàn thành '+stage.title} aria-valuemin={0}
      aria-valuemax={100} aria-valuenow={pct}>
      <span style={{width:pct+'%'}}/>
    </div>
    <div className="item-summary-buckets" role="list" aria-label={'Các công đoạn '+stage.title}>
      {stage.buckets.map(bucket=><div className={'item-summary-bucket item-summary-bucket-'+bucket.stage}
        key={bucket.stage} role="listitem"><span>{bucket.label}</span><strong>{bucket.count}</strong></div>)}
    </div>
    <p className="item-summary-unmatched" role="note">
      Chưa chuẩn hóa / ngoài nhóm: <strong>{stage.unmatched}</strong> (thuộc tổng {stage.total})
    </p>
  </article>;
}
/** Rendered immediately above the MAIN ItemList table; never in report popups. */
export function ItemSummaryCards({items}:{items:Item[]}){
  const value=useMemo(()=>summarizeListItems(items),[items]);
  return <section className="item-summary-grid" aria-label="Bốn thẻ tổng hợp Danh sách nội dung">
    <article className="item-summary-card item-summary-total" data-summary-card="total">
      <div className="item-summary-total-lead">
        <h3>Tổng số nội dung</h3>
        <strong className="item-summary-total-count">{value.total.total}</strong>
      </div>
      <p className="item-summary-subcounts">
        <span data-summary-kind="qppl">NQ QPPL <strong>{value.total.qppl}</strong></span>
        <span data-summary-kind="hc">NQ HC <strong>{value.total.hc}</strong></span>
        <span data-summary-kind="bc">Báo cáo <strong>{value.total.bc}</strong></span>
        {value.total.nqUnclassified>0&&<span data-summary-kind="nq-unknown">
          NQ chưa rõ loại <strong>{value.total.nqUnclassified}</strong>
        </span>}
      </p>
      {value.total.unclassified>0&&<p className="item-summary-unmatched" data-summary-kind="unclassified">
        Chưa phân loại: <strong>{value.total.unclassified}</strong>
      </p>}
    </article>
    {value.stages.map(stage=><StageCard key={stage.id} stage={stage}/>)}
  </section>;
}
