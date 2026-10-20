/** A compact history icon shared by the list and detail popup. */
export function CellHistoryAction({label,onClick,tooltip='Xem lần sửa gần nhất'}:{
  label:string;onClick:()=>void;tooltip?:string;
}){
  return <button type="button" className="cell-history-action" data-quick-tooltip={tooltip}
    aria-label={tooltip+' · '+label}
    onClick={event=>{event.stopPropagation();onClick();}}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v5h5"/><path d="M4.7 12a8.3 8.3 0 1 0 2.6-5.8L3 12"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  </button>;
}
