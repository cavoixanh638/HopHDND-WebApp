import {useState,type CSSProperties} from 'react';
import {Modal} from '../../components/Modal';
import {STATUS_PALETTE_GROUPS,MAX_STATUS_PALETTES,defaultStatusPalette,
  type StatusPaletteStore,type StatusPalette,type StatusPaletteGroup} from '../../data/status-palettes';

type Props={
  store:StatusPaletteStore;
  onStoreChange:(next:StatusPaletteStore)=>boolean;
  compact?:boolean;
};
const HEX=/^#[0-9a-f]{6}$/i;
export function StatusPaletteManager({store,onStoreChange,compact=false}:Props){
  const [open,setOpen]=useState(false);
  const [name,setName]=useState('');
  const [edits,setEdits]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');
  const [confirmDelete,setConfirmDelete]=useState(false);
  const current=store.active;
  const selected=store.presets.find(p=>p.id===store.activePresetId);
  const update=(next:StatusPaletteStore,success:string)=>{
    if(!onStoreChange(next)){setMessage('Không lưu được bảng màu trên trình duyệt. Kiểm tra dung lượng hoặc chế độ duyệt riêng tư.');return false;}
    setMessage(success);return true;
  };
  const edit=(group:StatusPaletteGroup,field:'text'|'background',hex:string)=>{
    const next:StatusPalette={...current,[group]:{...current[group],[field]:hex.toUpperCase()},
      otherEnabled:group==='other'?true:current.otherEnabled};
    update({...store,active:next},'Đã áp dụng màu và lưu trên trình duyệt. Bộ màu đặt tên chưa thay đổi.');
  };
  const colorChanged=(group:StatusPaletteGroup,field:'text'|'background',raw:string)=>{
    const id=group+'.'+field;
    setEdits(old=>({...old,[id]:raw}));
    if(HEX.test(raw)){
      if(update({...store,active:{...current,[group]:{...current[group],[field]:raw.toUpperCase()},
        otherEnabled:group==='other'?true:current.otherEnabled}},
        'Đã áp dụng màu và lưu trên trình duyệt.')){
        setEdits(old=>{const next={...old};delete next[id];return next;});
      }
    }else setMessage('Nhập mã màu đầy đủ gồm dấu # và 6 ký tự HEX (ví dụ: #D00025).');
  };
  const choose=(id:string)=>{
    setConfirmDelete(false);setEdits({});
    const palette=store.presets.find(p=>p.id===id);
    if(!palette){update({...store,active:defaultStatusPalette(),activePresetId:''},'Đã dùng màu mặc định V5.');return;}
    update({...store,active:palette.colors,activePresetId:id},'Đã mở bộ màu “'+palette.name+'”.');
  };
  const saveNew=()=>{
    const title=name.trim();
    if(!title){setMessage('Nhập tên bộ màu trước khi lưu.');return;}
    if(title.length>60){setMessage('Tên bộ màu không vượt quá 60 ký tự.');return;}
    if(store.presets.length>=MAX_STATUS_PALETTES){setMessage('Đã đạt tối đa 20 bộ màu đã lưu.');return;}
    if(store.presets.some(p=>p.name.toLocaleLowerCase('vi-VN')===title.toLocaleLowerCase('vi-VN'))){
      setMessage('Tên bộ màu đã tồn tại. Hãy chọn tên khác hoặc cập nhật bộ hiện có.');return;
    }
    const id='colors-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
    if(update({...store,presets:[...store.presets,{id,name:title,colors:current}],activePresetId:id},
      'Đã lưu bộ màu “'+title+'”.'))setName('');
  };
  const saveSelected=()=>{
    if(!selected)return;
    update({...store,presets:store.presets.map(p=>p.id===selected.id?{...p,colors:current}:p)},
      'Đã cập nhật bộ màu “'+selected.name+'”.');
  };
  const deleteSelected=()=>{
    if(!selected)return;
    if(!confirmDelete){setConfirmDelete(true);setMessage('Nhấn “Xác nhận xóa bộ màu” để xóa bộ đã lưu; màu đang dùng vẫn giữ nguyên.');return;}
    if(update({...store,activePresetId:'',presets:store.presets.filter(p=>p.id!==selected.id)},
      'Đã xóa bộ màu đã lưu. Màu đang hiển thị không đổi.'))setConfirmDelete(false);
  };
  return <>
    <button type="button" className="button ghost status-palette-trigger"
      aria-haspopup="dialog" onClick={()=>{setOpen(true);setMessage('');setConfirmDelete(false);}}>
      <span aria-hidden="true">🎨</span> {compact?'Bộ màu':'Bộ màu trạng thái'}
    </button>
    {open&&<Modal title="Bộ màu trạng thái · Bảng dữ liệu & popup" className="status-palette-modal"
      onClose={()=>{setOpen(false);setEdits({});}}>
      <div className="modal-body status-palette-body">
        <p className="muted">Chọn màu hoặc nhập mã HEX. Thay đổi áp dụng ngay cho Bảng dữ liệu và popup,
          tự lưu trên <strong>trình duyệt này</strong> theo nguồn dữ liệu đang xem; không ghi Excel/Firebase.
          Các bộ màu có tên được lưu riêng để sử dụng lại.</p>
        <div className="status-palette-savebar">
          <label>Bộ màu đã lưu
            <select value={store.activePresetId}
              onChange={event=>choose(event.currentTarget.value)} aria-label="Chọn bộ màu trạng thái đã lưu">
              <option value="">Màu mặc định / tùy chỉnh chưa đặt tên</option>
              {store.presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <button type="button" className="button ghost"
            onClick={()=>choose('')}>Khôi phục màu V5 mặc định</button>
        </div>
        <div className="status-palette-grid">
          {STATUS_PALETTE_GROUPS.map(({key,label,description})=><section className="status-palette-row" key={key}>
            <div className="status-palette-row-heading">
              <strong>{label}</strong>
              <small>{description}</small>
              {key==='other'&&<label className="status-palette-other-toggle">
                <input type="checkbox" checked={current.otherEnabled}
                  onChange={e=>update({...store,active:{...current,otherEnabled:e.currentTarget.checked}},
                    e.currentTarget.checked?'Đã bật màu cho các trạng thái khác.':'Đã tắt màu cho các trạng thái khác.')}/>
                Tô màu trạng thái khác
              </label>}
            </div>
            {(['text','background'] as const).map(field=>{
              const code=key+'.'+field,hex=current[key][field];
              return <label key={code} className="status-palette-color-field">
                <span>{field==='text'?'Màu chữ':'Màu nền'}</span>
                <div className="status-palette-color-controls">
                  <input type="color" value={hex} aria-label={(field==='text'?'Chọn màu chữ ':'Chọn màu nền ')+label}
                    onChange={event=>{setEdits(old=>{const next={...old};delete next[code];return next;});edit(key,field,event.currentTarget.value);}}/>
                  <input type="text" inputMode="text" spellCheck={false} maxLength={7}
                    aria-label={'Mã '+(field==='text'?'màu chữ ':'màu nền ')+label}
                    value={edits[code]??hex} onChange={e=>colorChanged(key,field,e.currentTarget.value)}
                    onBlur={()=>{if(edits[code]&&!HEX.test(edits[code])){setEdits(old=>{const next={...old};delete next[code];return next;});setMessage('Mã HEX không hợp lệ đã được hoàn lại.');}}}/>
                </div>
              </label>;
            })}
            <span className="status-palette-preview" style={{color:current[key].text,
              backgroundColor:current[key].background,
              opacity:key==='other'&&!current.otherEnabled?0.85:1} as CSSProperties}>
              {label}
            </span>
          </section>)}
        </div>
        <section className="status-palette-presets" aria-label="Lưu và quản lý bộ màu">
          <h3>Lưu bộ màu để dùng lại</h3>
          <div className="status-palette-presets-actions">
            <label>Tên bộ màu mới
              <input type="text" value={name} maxLength={60}
                placeholder="Ví dụ: Màu rõ nét - tháng 10"
                onChange={event=>setName(event.currentTarget.value)}/>
            </label>
            <button type="button" className="button primary" onClick={saveNew}
              disabled={!name.trim()||store.presets.length>=MAX_STATUS_PALETTES}>Lưu bộ mới</button>
            {selected&&<>
              <button type="button" className="button ghost" onClick={saveSelected}>Cập nhật bộ “{selected.name}”</button>
              <button type="button" className="button danger" onClick={deleteSelected}>
                {confirmDelete?'Xác nhận xóa bộ màu':'Xóa bộ đã chọn'}</button>
            </>}
          </div>
          <small>Đã lưu {store.presets.length}/{MAX_STATUS_PALETTES} bộ màu · Đổi màu đang dùng không tự sửa bộ đã đặt tên; bấm “Cập nhật bộ” nếu muốn ghi đè mẫu đó.</small>
        </section>
        {message&&<p className="notice" role="status">{message}</p>}
      </div>
      <div className="modal-footer">
        <button type="button" className="button primary"
          onClick={()=>{setOpen(false);setEdits({});}}>Xong</button>
      </div>
    </Modal>}
  </>;
}
