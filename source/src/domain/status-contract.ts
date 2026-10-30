import type {StatusField} from '../../shared/types';
import {PARTY_LEVEL_OPTIONS,STATUS_OPTIONS} from '../../shared/field-definitions';
import {normalizeSearch} from './search';

/** Read-only interpretation. NEVER mutate Item, Patch, source Excel, history or
 * the Firebase profile. Every alias is field-scoped and unambiguous.
 */
export type StatusCatalogField=StatusField|'partyLevel';
export const PARTY_LEVEL_ALIASES:Readonly<Record<string,string>>={
  'Ban Chấp hành':'BCH',
  'BTV':'BTV TU',
  'BTVTU':'BTV TU',
  'Không phải xin ý kiến':'Không phải trình',
  'Không xin ý kiến':'Không phải trình',
  'Không':'Không phải trình',
};
export const PARTY_STATUS_ALIASES:Readonly<Record<string,string>>={
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
  return field!=='progressCouncil'&&canonicalStatus(field,raw)==='Không phải trình';
}
