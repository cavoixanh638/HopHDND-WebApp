/** G05: pure draft operations. No SDK, persistence, row mutation or role escalation. */
import type {Item} from '../../../shared/types';
import {normalizeSearch} from '../../domain/search';
import {OFFICIAL_STATUS_CHOICES,type StatusCatalogField} from '../../domain/status-contract';
import {REPORT_GROUP_FIELDS,renameReportGroupIdentity,validateReportGroupIdentities} from '../../domain/report-reference-identity';
import {validateCatalog,type CatalogConfig,type CatalogKey} from '../../data/catalogs';

export type G05ChoiceAction=
  |{type:'add';value:string}
  |{type:'rename';previous:string;value:string}
  |{type:'remove';value:string}
  |{type:'move';value:string;to:number};

export const g05Identity=(value:string)=>normalizeSearch(value.normalize('NFC')).replace(/\s+/gu,' ').trim();
export const g05LockedCatalog=(key:CatalogKey):boolean=>
  Object.prototype.hasOwnProperty.call(OFFICIAL_STATUS_CHOICES,key);

/** Count source usage conservatively, including case/whitespace/accent variants. */
export function g05UsageCount(items:readonly Item[],key:CatalogKey,value:string):number{
  const expected=g05Identity(value);
  return items.reduce((sum,item)=>sum+(g05Identity(String(item[key]??''))===expected?1:0),0);
}
export function g05RemoveBlockReason(config:CatalogConfig,items:readonly Item[],key:CatalogKey,value:string):string|null{
  if(g05LockedCatalog(key))return 'Trạng thái chuẩn được khóa bởi mã nguồn.';
  const used=g05UsageCount(items,key,value);
  if(used)return 'Giá trị đang được sử dụng trong '+used+' nội dung; không thể xóa.';
  if(key==='room'&&Object.values(config.specialistRooms).some(rooms=>rooms.includes(value)))
    return 'Phòng này đang liên kết với chuyên viên; cần gỡ liên kết trước.';
  if(key==='specialist'&&(config.specialistRooms[value]?.length??0)>0)
    return 'Chuyên viên này đang liên kết với phòng; cần gỡ liên kết trước.';
  return null;
}
function validChoice(options:readonly string[],value:string,previous:string|undefined,maxLength:number):string{
  const clean=value.trim().normalize('NFC');
  if(!clean)throw Error('Tên lựa chọn không được để trống.');
  if(clean.length>maxLength)throw Error('Tên lựa chọn quá dài (tối đa '+maxLength+' ký tự).');
  if(options.some(option=>option!==previous&&g05Identity(option)===g05Identity(clean)))
    throw Error('Lựa chọn trùng sau chuẩn hóa chữ hoa, dấu hoặc khoảng trắng.');
  return clean;
}
function applyOptions(options:readonly string[],usedValues:readonly string[],action:G05ChoiceAction,maxCount:number,maxLength:number):string[]{
  const next=[...options];
  const used=(value:string)=>usedValues.filter(x=>g05Identity(x)===g05Identity(value)).length;
  if(action.type==='add'){
    if(next.length>=maxCount)throw Error('Đã đạt tối đa '+maxCount+' lựa chọn.');
    next.push(validChoice(next,action.value,undefined,maxLength));
  }else if(action.type==='rename'){
    const index=next.indexOf(action.previous);
    if(index<0)throw Error('Không tìm thấy lựa chọn cần đổi tên.');
    if(used(action.previous))throw Error('Lựa chọn đang có dữ liệu sử dụng; không được đổi tên.');
    next[index]=validChoice(next,action.value,action.previous,maxLength);
  }else if(action.type==='remove'){
    const index=next.indexOf(action.value);
    if(index<0)throw Error('Không tìm thấy lựa chọn cần xóa.');
    if(used(action.value))throw Error('Lựa chọn đang có dữ liệu sử dụng; không được xóa.');
    next.splice(index,1);
  }else{
    const index=next.indexOf(action.value);
    if(index<0||!Number.isInteger(action.to)||action.to<0||action.to>=next.length)
      throw Error('Vị trí sắp xếp không hợp lệ.');
    const [value]=next.splice(index,1);
    next.splice(action.to,0,value);
  }
  return next;
}
/** Custom fields remain in ItemLayout, independently of Excel and catalog writer. */
export function g05ApplyCustomChoices(options:readonly string[],usedValues:readonly string[],action:G05ChoiceAction):string[]{
  return applyOptions(options,usedValues,action,50,100);
}
export function g05ApplyCatalogAction(config:CatalogConfig,items:readonly Item[],key:CatalogKey,action:G05ChoiceAction):CatalogConfig{
  // These four menus are contractual, not user-editable string arrays.
  if(g05LockedCatalog(key))throw Error('Danh sách trạng thái chuẩn được khóa; không thể thay đổi.');
  if(action.type==='remove'){
    const reason=g05RemoveBlockReason(config,items,key,action.value);
    if(reason)throw Error(reason);
  }
  const optionsBefore=config.options[key]??[];
  const nextChoices=applyOptions(optionsBefore,items.map(item=>String(item[key]??'')),action,200,200);
  const options={...config.options,[key]:nextChoices};
  let specialistRooms=Object.fromEntries(Object.entries(config.specialistRooms)
    .map(([person,rooms])=>[person,[...rooms]])) as CatalogConfig['specialistRooms'];
  if(action.type==='rename'){
    if(key==='specialist'){
      const rooms=specialistRooms[action.previous];
      if(rooms){
        delete specialistRooms[action.previous];
        specialistRooms[action.value.trim().normalize('NFC')]=rooms;
      }
    }
    if(key==='room')specialistRooms=Object.fromEntries(Object.entries(specialistRooms)
      .map(([person,rooms])=>[person,rooms.map(room=>room===action.previous?action.value.trim().normalize('NFC'):room)]));
  }
  if(action.type==='remove'&&key==='specialist')delete specialistRooms[action.value];
  const groupField=REPORT_GROUP_FIELDS.find(field=>field===key);
  let groupIdentities=config.groupIdentities;
  if(action.type==='rename'&&groupField){
    groupIdentities=renameReportGroupIdentity(
      validateReportGroupIdentities(config.groupIdentities,config.options),groupField,
      action.previous,action.value.trim().normalize('NFC'));
  }
  return validateCatalog({...config,options,specialistRooms,
    groupIdentities:validateReportGroupIdentities(groupIdentities,options)});
}
