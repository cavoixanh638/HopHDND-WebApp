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
    <div className="item-summary-buckets">
      {stage.buckets.map(bucket=><div className={'item-summary-bucket item-summary-bucket-'+bucket.stage}
        key={bucket.stage}><span>{bucket.label}</span><strong>{bucket.count}</strong></div>)}
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
      <h3>Tổng số nội dung</h3>
      <strong className="item-summary-total-count">{value.total.total}</strong>
      <p className="item-summary-subcounts">
        <span>Nghị quyết <strong>{value.total.nq}</strong></span>
        <span>Báo cáo <strong>{value.total.bc}</strong></span>
      </p>
      <p className="item-summary-unmatched">
        Chưa phân loại: <strong>{value.total.unclassified}</strong>
      </p>
    </article>
    {value.stages.map(stage=><StageCard key={stage.id} stage={stage}/>)}
  </section>;
}
