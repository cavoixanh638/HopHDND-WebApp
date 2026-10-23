import {validateItemLayout,type ItemLayout} from './item-preferences';

export type LayoutConflictChoice = 'local'|'remote';
export type LayoutConflictChoices = Record<string,LayoutConflictChoice>;
export interface LayoutFieldConflict {
  id: string; label: string; original: string; local: string; remote: string;
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const describe=(value:unknown)=>Array.isArray(value)
  ?value.map(v=>String(v)).join(' → ')
  :typeof value==='boolean'?(value?'Hiển thị':'Ẩn')
  :value==='auto'?'Tự động'
  :typeof value==='number'?String(value)+' px'
  :String(value??'—');

/** Conflicts are resolved by an explicit administrator choice for *each* field,
 * never by silently preferring the browser or the Firebase value. */
export class LayoutConflictError extends Error {
  readonly conflicts:LayoutFieldConflict[];
  constructor(conflicts:LayoutFieldConflict[]) {
    super('Có '+conflicts.length+' thông số bố trí được sửa khác nhau giữa bản nháp và Firebase: '+
      conflicts.map(c=>c.label).join(', ')+'. Chọn giá trị cần giữ ngay dưới nút Lưu; chưa có gì bị ghi đè.');
    this.name='LayoutConflictError';
    this.conflicts=conflicts;
  }
}

/** Compare the user's initial layout with their current draft and the latest
 * server state *inside* the RTDB transaction. Field choices are re-applied to
 * current server data on every retry; unrelated changes are always retained.
 */
export function mergeItemLayout(baseInput:ItemLayout,editedInput:ItemLayout,remoteInput:ItemLayout,
  choices:LayoutConflictChoices={}):ItemLayout {
  const base=validateItemLayout(baseInput),edited=validateItemLayout(editedInput),remote=validateItemLayout(remoteInput);
  const conflicts:LayoutFieldConflict[]=[];
  const merge=<T>(old:T,local:T,server:T,id:string,label:string):T=>{
    if(same(local,old))return server;
    if(same(server,old)||same(server,local))return local;
    const choice=choices[id];
    if(choice==='local')return local;
    if(choice==='remote')return server;
    conflicts.push({id,label,original:describe(old),local:describe(local),remote:describe(server)});
    return server; // not committed until all conflicts are resolved
  };
  const oldKeys=base.columns.map(c=>c.key);
  const localKeys=edited.columns.map(c=>c.key);
  const serverKeys=remote.columns.map(c=>c.key);
  const order=merge(oldKeys,localKeys,serverKeys,'columns.order','thứ tự cột');
  const oldByKey=new Map(base.columns.map(c=>[c.key,c]));
  const localByKey=new Map(edited.columns.map(c=>[c.key,c]));
  const remoteByKey=new Map(remote.columns.map(c=>[c.key,c]));
  // Custom columns may be added or deleted after the initial base revision.
  // Preserve unrelated server edits, and make any same-field conflict explicit.
  const columns=order.flatMap(key=>{
    const old=oldByKey.get(key),local=localByKey.get(key),server=remoteByKey.get(key);
    const chosen=old&&local&&server?server:merge(old,local,server,`columns.${key}.definition`,`định nghĩa cột ${key}`);
    if(!chosen)return [];
    if(!local||!server||!old)return [chosen];
    const label=server.label;
    const next={...server};
    for(const field of ['visible','width','label','renamed','removed','kind','options'] as const){
      // Optional fields may be absent in old saved layouts.
      (next as unknown as Record<string,unknown>)[field]=merge(
        old[field],local[field],server[field],
        `columns.${key}.${field}`,`${String(field)} · ${label}`);
    }
    if(server.origin==='custom'){
      const ids=new Set([...Object.keys(old.values??{}),...Object.keys(local.values??{}),...Object.keys(server.values??{})]);
      const values:Record<string,string>={};
      for(const id of ids){
        const value=merge(old.values?.[id],local.values?.[id],server.values?.[id],
          `columns.${key}.values.${id}`,`giá trị ${label} / ${id}`);
        if(value)values[id]=value;
      }
      next.values=values;
    }
    return [next];
  });
  const tableWidth=merge(base.tableWidth,edited.tableWidth,remote.tableWidth,'tableWidth','độ rộng tối thiểu các cột');
  const frameWidth=merge(base.frameWidth??'auto',edited.frameWidth??'auto',remote.frameWidth??'auto','frameWidth','độ rộng vùng danh sách');
  const cellHighlights=merge(base.cellHighlights??[],edited.cellHighlights??[],
    remote.cellHighlights??[],'cellHighlights','màu ô theo từ khóa');
  const compactDisplay=Object.fromEntries((Object.keys(base.compactDisplay??{}) as (keyof NonNullable<ItemLayout['compactDisplay']>)[]).map(key=>
    [key,merge(base.compactDisplay?.[key],edited.compactDisplay?.[key],remote.compactDisplay?.[key],
      `compactDisplay.${key}`,`gộp cột: ${key}`)])) as NonNullable<ItemLayout['compactDisplay']>;
  if(conflicts.length)throw new LayoutConflictError(conflicts);
  return validateItemLayout({columns,tableWidth,frameWidth,cellHighlights,compactDisplay});
}
