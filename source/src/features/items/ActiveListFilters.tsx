import type {ActiveListCondition} from './pr95-v6-l4-active-filters';

export function ActiveListFilters({conditions,visibleCount,sourceCount,onRemove,onClearAll}:{
  conditions:readonly ActiveListCondition[];
  visibleCount:number;
  sourceCount:number;
  onRemove:(condition:ActiveListCondition)=>void;
  onClearAll:()=>void;
}){
  const count=conditions.length;
  // The red dot pulses only while conditions exist. Motion-sensitive users
  // receive an always-visible static red dot via prefers-reduced-motion.
  const signalKey=conditions.map(c=>c.id+':'+c.value).join('|');
  return <section className={'list-active-filters'+(count?' has-active-filters':'')}
    data-active-filter-count={count}
    aria-label="Điều kiện lọc Danh sách đang áp dụng">
    <div className="list-active-filter-heading">
      <div className={'list-active-filter-summary'+(count?' is-active':' is-idle')}>
        {count>0&&<span key={signalKey} className="list-active-filter-signal"
          aria-hidden="true"/>}
        <strong>
          <span className={count>0?'list-active-filter-emphasis':'list-active-filter-idle-text'}>
            {count>0?'Đang lọc ':'Hiển thị '}
            <span className="list-active-filter-results" role="status" aria-live="polite">
              {visibleCount}/{sourceCount}
            </span>
          </span>
          <span className="list-active-filter-noun"> nội dung</span>
        </strong>
      </div>
      {count>0&&<button type="button" className="list-active-filter-clear-all"
        aria-label={'Xóa tất cả '+count+' điều kiện lọc'}
        onClick={onClearAll}>Xóa tất cả</button>}
    </div>
    {count>0&&<div className="list-active-filter-chips" role="group"
      aria-label={'Các điều kiện đang áp dụng: '+count}>
      {conditions.map(condition=><div key={condition.id} className="list-active-filter-chip"
        data-active-filter-id={condition.id} data-active-filter-category={condition.category}
        role="group" aria-label={condition.label+': '+condition.value}
        title={condition.label+': '+condition.value}>
        <span className="list-active-filter-chip-value">{condition.value}</span>
        <button type="button" className="list-active-filter-remove"
          aria-label={'Bỏ điều kiện '+condition.label+': '+condition.value}
          title={'Chỉ bỏ '+condition.label}
          onKeyDown={event=>{
            if(event.key!=='Enter'&&event.key!==' ')return;
            event.preventDefault();
            if(!event.repeat)onRemove(condition);
          }}
          onClick={()=>onRemove(condition)}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 12 12" width="12" height="12">
            <path d="m3 3 6 6m0-6-6 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>
      </div>)}
    </div>}
    {count>0&&visibleCount===0&&<p className="list-active-filter-empty" role="status">
      Không có kết quả phù hợp với {count} điều kiện đang lọc. Bỏ từng chip hoặc chọn
      <button type="button" onClick={onClearAll}>Xóa tất cả</button>
      để trở lại danh sách ban đầu.
    </p>}
  </section>;
}
