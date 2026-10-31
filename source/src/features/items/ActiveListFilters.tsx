import type {ActiveListCondition} from './pr95-v6-l4-active-filters';

export function ActiveListFilters({conditions,visibleCount,sourceCount,onRemove,onClearAll}:{
  conditions:readonly ActiveListCondition[];
  visibleCount:number;
  sourceCount:number;
  onRemove:(condition:ActiveListCondition)=>void;
  onClearAll:()=>void;
}){
  const count=conditions.length;
  return <section className={'list-active-filters'+(count?' has-active-filters':'')}
    data-active-filter-count={count}
    aria-label="Điều kiện lọc Danh sách đang áp dụng">
    <div className="list-active-filter-heading">
      <strong>Đang lọc ({count})</strong>
      <span className="list-active-filter-results" role="status" aria-live="polite">
        <strong>{visibleCount}</strong> / {sourceCount} nội dung trong nguồn trước lọc
      </span>
      {count>0&&<button type="button" className="list-active-filter-clear-all"
        aria-label={'Xóa tất cả '+count+' điều kiện lọc'}
        onClick={onClearAll}>Xóa tất cả</button>}
    </div>
    {count>0?<div className="list-active-filter-chips" role="group"
      aria-label={'Các điều kiện đang áp dụng: '+count}>
      {conditions.map(condition=><div key={condition.id} className="list-active-filter-chip"
        data-active-filter-id={condition.id} data-active-filter-category={condition.category}>
        <span className="list-active-filter-chip-label">{condition.label}</span>
        <span className="list-active-filter-chip-value" title={condition.value}>{condition.value}</span>
        <button type="button" className="list-active-filter-remove"
          aria-label={'Bỏ điều kiện '+condition.label+': '+condition.value}
          title={'Chỉ bỏ '+condition.label}
          onClick={()=>onRemove(condition)}><span aria-hidden="true">×</span></button>
      </div>)}
    </div>:<p className="list-active-filter-idle">Chưa áp dụng điều kiện lọc nào.</p>}
    {count>0&&visibleCount===0&&<p className="list-active-filter-empty" role="status">
      Không có kết quả phù hợp với {count} điều kiện đang lọc. Bỏ từng chip hoặc chọn
      <button type="button" onClick={onClearAll}>Xóa tất cả</button>
      để trở lại danh sách ban đầu.
    </p>}
  </section>;
}
