import {validateItemLayout,type ItemLayout} from './item-preferences';

export class LayoutConflictError extends Error {
  constructor(detail:string) {
    super(`Bố trí danh sách đã thay đổi ở nơi khác tại ${detail}. Phần sửa vẫn giữ trên máy. Hãy đọc lại cấu hình và đối chiếu trước khi lưu.`);
    this.name='LayoutConflictError';
  }
}
const equals=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/**
 * Merge only non-conflicting user edits into the latest server layout.
 * Base is the layout the user originally began editing (including a restored
 * checkpoint), not the latest value emitted by an RTDB listener.
 * Never replace a remote field which the user did not change.
 */
export function mergeItemLayout(baseInput:ItemLayout,editedInput:ItemLayout,remoteInput:ItemLayout):ItemLayout {
  const base=validateItemLayout(baseInput),edited=validateItemLayout(editedInput),remote=validateItemLayout(remoteInput);
  const merge=<T>(old:T,local:T,server:T,label:string):T=>{
    if(equals(local,old))return server;
    if(equals(server,old)||equals(server,local))return local;
    throw new LayoutConflictError(label);
  };
  const oldKeys=base.columns.map(c=>c.key);
  const localKeys=edited.columns.map(c=>c.key);
  const serverKeys=remote.columns.map(c=>c.key);
  const order=merge(oldKeys,localKeys,serverKeys,'thứ tự cột');
  const oldByKey=new Map(base.columns.map(c=>[c.key,c]));
  const localByKey=new Map(edited.columns.map(c=>[c.key,c]));
  const remoteByKey=new Map(remote.columns.map(c=>[c.key,c]));
  const columns=order.map(key=>{
    const old=oldByKey.get(key)!,local=localByKey.get(key)!,server=remoteByKey.get(key)!;
    return {...server,
      visible:merge(old.visible,local.visible,server.visible,`hiển thị cột ${server.label}`),
      width:merge(old.width,local.width,server.width,`độ rộng cột ${server.label}`)};
  });
  return validateItemLayout({
    columns,
    tableWidth:merge(base.tableWidth,edited.tableWidth,remote.tableWidth,'độ rộng tối thiểu các cột'),
    frameWidth:merge(base.frameWidth??'auto',edited.frameWidth??'auto',remote.frameWidth??'auto','độ rộng vùng danh sách'),
  });
}
