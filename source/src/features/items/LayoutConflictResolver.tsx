import type {LayoutConflictChoices,LayoutFieldConflict,LayoutConflictChoice} from '../../data/item-layout-merge';

export function LayoutConflictResolver({conflicts,choices,onChoose,onConfirm,onCancel,busy}:{
  conflicts:LayoutFieldConflict[];
  choices:LayoutConflictChoices;
  onChoose:(field:string,choice:LayoutConflictChoice)=>void;
  onConfirm:()=>void;
  onCancel:()=>void;
  busy:boolean;
}){
  const remaining=conflicts.filter(c=>!choices[c.id]).length;
  return <section className="layout-conflict-resolver" role="region" aria-label="Giải quyết xung đột bố trí">
    <strong>Chọn bố trí cần giữ ({conflicts.length} thông số)</strong>
    <p>Firebase chỉ có một bản bố trí chung. Các thông số dưới đây khác nhau giữa bản bạn đang chỉnh và bản dùng chung mới nhất. Những thông số khác sẽ tự hợp nhất. Chưa có gì bị ghi đè.</p>
    {conflicts.map(c=><fieldset key={c.id} className="layout-conflict-field">
      <legend>{c.label}</legend>
      <small>Trước khi chỉnh: {c.original}</small>
      <div className="layout-conflict-options">
        <label><input type="radio" name={'conflict-'+c.id} value="remote"
          checked={choices[c.id]==='remote'} disabled={busy}
          onChange={()=>onChoose(c.id,'remote')}/>
          <span><strong>Dùng bố trí chung (Firebase)</strong><span>{c.remote}</span></span>
        </label>
        <label><input type="radio" name={'conflict-'+c.id} value="local"
          checked={choices[c.id]==='local'} disabled={busy}
          onChange={()=>onChoose(c.id,'local')}/>
          <span><strong>Giữ giá trị tôi vừa chỉnh</strong><span>{c.local}</span></span>
        </label>
      </div>
    </fieldset>)}
    <div className="layout-conflict-actions">
      <span role="status">{remaining? `Còn ${remaining} thông số chưa chọn.`:'Đã chọn tất cả thông số.'}</span>
      <button type="button" className="button ghost" disabled={busy} onClick={onCancel}>Tiếp tục chỉnh, chưa lưu</button>
      <button type="button" className="button primary" disabled={busy||remaining>0} onClick={onConfirm}>
        {busy?'Đang kiểm tra và lưu…':'Xác nhận lựa chọn và lưu'}
      </button>
    </div>
  </section>;
}
