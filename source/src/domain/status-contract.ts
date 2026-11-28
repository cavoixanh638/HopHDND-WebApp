import type {StatusField} from '../../shared/types';
import {PARTY_LEVEL_OPTIONS,STATUS_OPTIONS} from '../../shared/field-definitions';
import {normalizeSearch} from './search';

/** Read-only interpretation. NEVER mutate Item, Patch, source Excel, history or
 * the Firebase profile. Every alias is field-scoped and unambiguous.
 */
export type StatusCatalogField=StatusField|'partyLevel';
export const PARTY_LEVEL_ALIASES:Readonly<Record<string,string>>={
  'Ban Chấp hành':'BCH',
  'Ban Chấp hành Thành ủy':'BCH',
  'Ban Thường vụ Thành ủy':'BTV',
  'Thường trực Thành ủy':'TTTU',
  'BTV':'BTV',
  'BTVTU':'BTV',
  'BTV TU':'BTV',
  'Không phải trình':'Không',
  'Không phải xin ý kiến':'Không',
  'Không xin ý kiến':'Không',
  'Không':'Không',
};
export const PARTY_STATUS_ALIASES:Readonly<Record<string,string>>={
  // Exact labels from the owner's Excel Droplist C2:C8, 28/11/2026.
  'UB đã gửi ĐU':'Đã gửi ĐU',
  'Đã họp/gửi phiếu, chờ TBKL':'Đã xin ý kiến, chờ TBKL',
  'VP đang thực hiện':'VP đang xử lý',
  'Văn phòng đang thực hiện':'VP đang xử lý',
  'ĐU đã gửi TU, chưa họp':'ĐU gửi TU, chưa họp',
  'ĐU đã gửi TU chưa họp':'ĐU gửi TU, chưa họp',
  'Đã họp/xin phiếu, chưa có TBKL':'Đã xin ý kiến, chờ TBKL',
  'Đã họp/xin phiếu chưa có TBKL':'Đã xin ý kiến, chờ TBKL',
  'Đã họp, chưa có TBKL':'Đã xin ý kiến, chờ TBKL',
  'Đã họp chưa có TBKL':'Đã xin ý kiến, chờ TBKL',
  'Không phải xin ý kiến':'Không phải trình',
  'Không xin ý kiến':'Không phải trình',
  'Không phải trình xin ý kiến Thành ủy':'Không phải trình',
  'Không phải trình Thành ủy':'Không phải trình',
};
export const BUILD_STATUS_ALIASES:Readonly<Record<string,string>>={
  'VP đang thực hiện':'VP đang xử lý',
  'Văn phòng đang thực hiện':'VP đang xử lý',
  'Không phải trình xây dựng NQ':'Không phải trình',
  'Đã trình HĐND, chưa có QĐ':'Đã trình, chờ QĐ',
  'Đã trình, chưa có QĐ':'Đã trình, chờ QĐ',
  'Đã có QĐ chấp thuận':'Đã có QĐ',
};
export const COUNCIL_STATUS_ALIASES:Readonly<Record<string,string>>={
  'VP đang thực hiện':'VP đang xử lý',
  'Văn phòng đang thực hiện':'VP đang xử lý',
  // These were the explicitly recognized terminal values in the old
  // issuance report. Do not generalize to arbitrary "Đã trình ..." strings.
  'Đã trình HĐND thành phố':'Hoàn thành',
  'Đã trình HĐND TP':'Hoàn thành',
  'Đã trình HĐND':'Hoàn thành',
};
export const STATUS_ALIASES:Readonly<Record<StatusCatalogField,Readonly<Record<string,string>>>>={
  partyLevel:PARTY_LEVEL_ALIASES,progressParty:PARTY_STATUS_ALIASES,
  progressBuild:BUILD_STATUS_ALIASES,progressCouncil:COUNCIL_STATUS_ALIASES
};
export const OFFICIAL_STATUS_CHOICES:Readonly<Record<StatusCatalogField,readonly string[]>>={
  partyLevel:PARTY_LEVEL_OPTIONS,
  progressParty:STATUS_OPTIONS.progressParty,
  progressBuild:STATUS_OPTIONS.progressBuild,
  progressCouncil:STATUS_OPTIONS.progressCouncil,
};
const key=(value:string)=>normalizeSearch(value).replace(/\s+/gu,' ').trim();
const lookup=Object.fromEntries((Object.keys(OFFICIAL_STATUS_CHOICES) as StatusCatalogField[]).map(field=>{
  const map=new Map<string,string>();
  for(const label of OFFICIAL_STATUS_CHOICES[field])map.set(key(label),label);
  for(const [old,label] of Object.entries(STATUS_ALIASES[field]))map.set(key(old),label);
  return [field,map];
})) as Record<StatusCatalogField,Map<string,string>>;

/** Only known aliases become canonical at READ time. Blank, unfamiliar and
 * ambiguous old values (e.g. "TU đã cho ý kiến", "Đã báo cáo TU") survive
 * verbatim and are NEVER inferred as completed.
 */
export function canonicalStatus(field:StatusCatalogField,raw:unknown):string{
  if(typeof raw!=='string')return '';
  const value=raw.trim();
  return lookup[field].get(key(value))??value;
}
export function isRecognizedStatus(field:StatusCatalogField,raw:unknown):boolean{
  return OFFICIAL_STATUS_CHOICES[field].includes(canonicalStatus(field,raw));
}
export function isNotRequiredStatus(field:StatusCatalogField,raw:unknown):boolean{
  return field!=='progressCouncil'&&(field==='partyLevel'?canonicalStatus(field,raw)==='Không':canonicalStatus(field,raw)==='Không phải trình');
}

/** Excel Droplist is the authoritative user-facing default, including order.
 * Retain deployed canonical keys for Firebase Rules, report identities,
 * layout preferences and history. Reading a label never rewrites a record. */
export const EXCEL_STATUS_CHOICES:Readonly<Record<StatusCatalogField,readonly string[]>>={
  partyLevel:['TTTU','BTV TU','BCH','Không'],
  progressParty:['Không phải trình','Sở chưa trình','VP đang xử lý','UB đã gửi ĐU',
    'ĐU đã gửi TU, chưa họp','Đã họp/gửi phiếu, chờ TBKL','Đã có TBKL'],
  progressBuild:['Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'],
  progressCouncil:['Sở chưa trình','VP đang xử lý','Hoàn thành']
};
const excelKeys=(field:StatusCatalogField):readonly string[]=>
  EXCEL_STATUS_CHOICES[field].map(label=>canonicalStatus(field,label));
export const DEFAULT_STATUS_CHOICE_KEYS:Readonly<Record<StatusCatalogField,readonly string[]>>={
  partyLevel:excelKeys('partyLevel'),
  progressParty:excelKeys('progressParty'),
  progressBuild:excelKeys('progressBuild'),
  progressCouncil:excelKeys('progressCouncil')
};
export function excelStatusLabel(field:string,raw:string):string{
  if(!Object.prototype.hasOwnProperty.call(EXCEL_STATUS_CHOICES,field))return raw;
  const key=field as StatusCatalogField;
  const index=DEFAULT_STATUS_CHOICE_KEYS[key].indexOf(canonicalStatus(key,raw));
  return index<0?raw:EXCEL_STATUS_CHOICES[key][index];
}
