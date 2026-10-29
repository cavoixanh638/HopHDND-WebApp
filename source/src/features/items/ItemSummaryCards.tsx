import {useMemo} from 'react';
import type {Item} from '../../../shared/types';
import {summarizeListItems,type SummaryStage,type SummarySelection} from '../../domain/item-summary';

function StageCard({stage,selection,onSelect}: {stage:SummaryStage;selection:SummarySelection|null;
  onSelect:(selection:SummarySelection)=>void}){
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
    <div className="item-summary-buckets" role="group" aria-label={'Lọc theo công đoạn '+stage.title}>
      {stage.buckets.map(bucket=><button type="button"
        className={'item-summary-bucket item-summary-bucket-'+bucket.stage}
        key={bucket.stage} data-summary-report={stage.id} data-summary-stage={bucket.stage}
        aria-label={'Lọc '+stage.title+': '+bucket.label+' ('+bucket.count+' nội dung)'}
        aria-pressed={selection?.report===stage.id&&selection?.stage===bucket.stage}
        onKeyDown={event=>{
          if(event.key!=='Enter'&&event.key!==' ')return;
          if(event.repeat){event.preventDefault();return;}
          // The explicit handler keeps keyboard activation deterministic in
          // embedded/offline browsers. Suppress the native synthetic click so
          // one key press never toggles the selection twice.
          event.preventDefault();
          onSelect({report:stage.id,stage:bucket.stage});
        }}
        onClick={()=>onSelect({report:stage.id,stage:bucket.stage})}>
        <span>{bucket.label}</span><strong>{bucket.count}</strong>
      </button>)}
    </div>
    <p className="item-summary-unmatched" role="note">
      Chưa chuẩn hóa / ngoài nhóm: <strong>{stage.unmatched}</strong> (thuộc tổng {stage.total})
    </p>
  </article>;
}
/** Rendered immediately above the MAIN ItemList table; never in report popups. */
export function ItemSummaryCards({items,selection,onSelect,onClear,visibleCount}:{
  items:Item[];selection:SummarySelection|null;onSelect:(selection:SummarySelection)=>void;
  onClear:()=>void;visibleCount:number;
}){
  const value=useMemo(()=>summarizeListItems(items),[items]);
  const activeStage=value.stages.find(stage=>stage.id===selection?.report);
  const activeBucket=activeStage?.buckets.find(bucket=>bucket.stage===selection?.stage);
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
    {value.stages.map(stage=><StageCard key={stage.id} stage={stage}
      selection={selection} onSelect={onSelect}/>)}
    {activeStage&&activeBucket&&<div className="item-summary-active-filter" role="status">
      <span>Đang lọc: <strong>{activeStage.title} — {activeBucket.label}</strong></span>
      <span>{visibleCount}/{value.total.total} nội dung</span>
      <button type="button" className="button ghost" onClick={onClear}>Bỏ lọc trạng thái</button>
    </div>}
  </section>;
}
