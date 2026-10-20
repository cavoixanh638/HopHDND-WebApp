import type {DetailGridPreferences} from './report-detail-preferences';
import {validateDetailGridPreferences} from './report-detail-preferences';
import {validateColorRules,type ColorRule} from './list-views';
import {layoutRecoveryScope} from './draft-checkpoints';

export interface ReportDetailPreset {
  id:string;name:string;layout:DetailGridPreferences;filters:Record<string,string>;
  colors:ColorRule[];
}
const key=(source:string)=>'hdnd.report-detail-presets.v1:'+layoutRecoveryScope(source);
const colKeys=new Set(['displayCode','stt','content','department','type','partyLevel','progressParty',
  'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note']);
export function validateDetailPreset(value:unknown):ReportDetailPreset {
  if(!value||typeof value!=='object')throw Error('Mẫu hiển thị không hợp lệ.');
  const v=value as Partial<ReportDetailPreset>;
  if(typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(v.id)||
    typeof v.name!=='string'||!v.name.trim()||v.name.length>60||
    !v.filters||typeof v.filters!=='object'||Array.isArray(v.filters))
    throw Error('Tên hoặc bộ lọc mẫu hiển thị không hợp lệ.');
  const filters:Record<string,string>={};
  for(const [k,t] of Object.entries(v.filters)){
    if(!colKeys.has(k)||typeof t!=='string'||t.length>200)throw Error('Bộ lọc mẫu hiển thị có cột không hợp lệ.');
    if(t.trim())filters[k]=t;
  }
  return {id:v.id,name:v.name.trim(),layout:validateDetailGridPreferences(v.layout),
    filters,colors:validateColorRules(v.colors)};
}
export function loadDetailPresets(source:string):ReportDetailPreset[] {
  try{
    const data=JSON.parse(globalThis.localStorage?.getItem(key(source))??'[]');
    return Array.isArray(data)?data.slice(0,12).flatMap(x=>{try{return [validateDetailPreset(x)];}catch{return [];}}):[];
  }catch{return [];}
}
export function saveDetailPresets(source:string,views:ReportDetailPreset[]):boolean {
  if(views.length>12||new Set(views.map(v=>v.id)).size!==views.length)return false;
  const clean=views.map(validateDetailPreset);
  try{globalThis.localStorage?.setItem(key(source),JSON.stringify(clean));return !!globalThis.localStorage;}catch{return false;}
}

const colorKey=(source:string)=>'hdnd.report-detail-colors.v1:'+layoutRecoveryScope(source);
export function loadDetailColors(source:string):ColorRule[]{
  try{return validateColorRules(JSON.parse(globalThis.localStorage?.getItem(colorKey(source))??'[]'));}
  catch{return [];}
}
export function saveDetailColors(source:string,rules:ColorRule[]):boolean{
  try{globalThis.localStorage?.setItem(colorKey(source),JSON.stringify(validateColorRules(rules)));
    return !!globalThis.localStorage;}catch{return false;}
}
