import { validateCatalog, type CatalogConfig } from './catalogs';
import { validateReportLayout, type ReportLayout } from './report-preferences';
import { validateItemLayout, type ItemLayout } from './item-preferences';
import type { SheetConfig } from './sheet-config';
export const CONFIG_TAB = '_HDND_APP';
export interface SharedConfig {
  schemaVersion:1; spreadsheetId:string; gid:string; revision:number; updatedAt:string; editorUrl:string;
  catalogs:CatalogConfig; reports:ReportLayout[]; items:ItemLayout;
}
export type ConfigSection = 'catalogs'|'reports'|'items'|'all';
export function validateSharedConfig(value:unknown,source?:Pick<SheetConfig,'spreadsheetId'|'gid'>):SharedConfig {
  if(!value||typeof value!=='object')throw new Error('Cấu hình chung không hợp lệ.');
  const row=value as SharedConfig;
  if(row.schemaVersion!==1||typeof row.spreadsheetId!=='string'||!/^[-\w]{10,200}$/.test(row.spreadsheetId)||typeof row.gid!=='string'||!/^\d+$/.test(row.gid)||!Number.isSafeInteger(row.revision)||row.revision<1||typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt)))throw new Error('Phiên bản hoặc nguồn cấu hình không hợp lệ.');
  if(source&&(row.spreadsheetId!==source.spreadsheetId||row.gid!==source.gid))throw new Error('Cấu hình không thuộc nguồn đang xem.');
  if(typeof row.editorUrl!=='string'||(row.editorUrl!==''&&!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(row.editorUrl)))throw new Error('Link trình chỉnh chung không hợp lệ.');
  return {schemaVersion:1,spreadsheetId:row.spreadsheetId,gid:row.gid,revision:row.revision,updatedAt:row.updatedAt,editorUrl:row.editorUrl,catalogs:validateCatalog(row.catalogs),reports:validateReportLayout(row.reports),items:validateItemLayout(row.items)};
}
/** One committed revision, split into short text cells; incomplete writes stay invisible. */
export function configRows(config:SharedConfig,operationId:string):unknown[][] {
  const json=JSON.stringify(validateSharedConfig(config));
  if(json.length>200000)throw new Error('Cấu hình quá lớn (tối đa 200.000 ký tự).');
  if(!/^[\w-]{8,100}$/.test(operationId))throw new Error('Mã thao tác không hợp lệ.');
  const fragments:string[]=[];
  for(let start=0;start<json.length;){let end=Math.min(json.length,start+4000);const last=json.charCodeAt(end-1);if(end<json.length&&last>=0xD800&&last<=0xDBFF)end++;fragments.push(json.slice(start,end));start=end;}
  return fragments.map((fragment,index)=>[`${config.spreadsheetId}:${config.gid}`,config.revision,index,fragments.length,'j:'+fragment,config.updatedAt,operationId,false]);
}
export function configFromRows(rows:unknown[][],source:Pick<SheetConfig,'spreadsheetId'|'gid'>):SharedConfig|null {
  const sourceKey=`${source.spreadsheetId}:${source.gid}`;
  const candidates=rows.filter(row=>row[0]===sourceKey&&row[2]===0&&row[7]===true).sort((a,b)=>Number(b[1])-Number(a[1]));
  if(!candidates.length)return null;
  const head=candidates[0], count=Number(head[3]);
  if(!Number.isInteger(count)||count<1||count>50)throw new Error('Số phần cấu hình không hợp lệ.');
  const chunks=rows.filter(row=>row[0]===sourceKey&&row[1]===head[1]&&row[6]===head[6]).sort((a,b)=>Number(a[2])-Number(b[2]));
  if(chunks.length!==count||chunks.some((row,index)=>row[2]!==index||row[3]!==count||typeof row[4]!=='string'||!row[4].startsWith('j:')))throw new Error('Bản cấu hình chung chưa đầy đủ; không áp dụng một phần.');
  const result=validateSharedConfig(JSON.parse(chunks.map(row=>(row[4] as string).slice(2)).join('')),source);
  if(result.revision!==head[1]||result.updatedAt!==head[5])throw new Error('Metadata cấu hình không khớp.');
  return result;
}
export function applyConfigSection(base:SharedConfig,section:ConfigSection,value:unknown):SharedConfig {
  if(section==='all'){if(!value||typeof value!=='object')throw new Error('Bộ cấu hình không hợp lệ.');const next=value as SharedConfig;return validateSharedConfig({...base,catalogs:next.catalogs,reports:next.reports,items:next.items});}
  if(!['catalogs','reports','items'].includes(section))throw new Error('Phần cấu hình không hợp lệ.');
  return validateSharedConfig({...base,[section]:value});
}
