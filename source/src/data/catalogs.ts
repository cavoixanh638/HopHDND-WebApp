import type { Item, TextField } from '../../shared/types';
import { STATUS_OPTIONS } from '../../shared/field-definitions';
export type CatalogKey = Exclude<TextField, 'content' | 'note'>;
export const CATALOG_KEYS: CatalogKey[] = ['department','type','partyLevel','progressParty','progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress'];
export interface CatalogConfig { options: Record<CatalogKey, string[]>; specialistRooms: Record<string, string[]> }
export function catalogFromItems(items: Item[]): CatalogConfig {
  const options = Object.fromEntries(CATALOG_KEYS.map(key => [key, [...new Set([...(key in STATUS_OPTIONS ? STATUS_OPTIONS[key as keyof typeof STATUS_OPTIONS] : []), ...items.map(item => item[key]).filter(Boolean)])]])) as CatalogConfig['options'];
  const specialistRooms: Record<string,string[]> = Object.create(null);
  for (const item of items) if (item.specialist && item.room && item.specialist !== 'Chưa phân công' && item.room !== 'Chưa phân công') specialistRooms[item.specialist] = [...new Set([...(specialistRooms[item.specialist] ?? []), item.room])];
  return { options, specialistRooms };
}
export function validateCatalog(value: unknown): CatalogConfig {
  if (!value || typeof value !== 'object') throw new Error('Danh mục không hợp lệ.');
  const input = value as CatalogConfig;
  const options = Object.create(null) as CatalogConfig['options'];
  for (const key of CATALOG_KEYS) {
    const list = input.options?.[key];
    if (!Array.isArray(list) || list.some(text => typeof text !== 'string' || !text.trim() || text.length > 200) || new Set(list.map(text => text.trim())).size !== list.length) throw new Error('Danh mục có giá trị trống, trùng hoặc quá dài.');
    options[key] = list.map(text => text.trim());
  }
  const specialistRooms: Record<string,string[]> = Object.create(null);
  if (!input.specialistRooms || typeof input.specialistRooms !== 'object' || Array.isArray(input.specialistRooms)) throw new Error('Quan hệ chuyên viên – phòng không hợp lệ.');
  for (const [person, rooms] of Object.entries(input.specialistRooms)) {
    if (!options.specialist.includes(person) || !Array.isArray(rooms) || rooms.some(room => !options.room.includes(room))) throw new Error('Quan hệ có chuyên viên hoặc phòng ngoài danh mục.');
    specialistRooms[person] = [...new Set(rooms)];
  }
  return { options, specialistRooms };
}
const key = (source:string) => `hdnd.catalogs.v1:${source}`;
export function mergeCatalogItems(value:CatalogConfig,items:Item[]):CatalogConfig {
  const saved=validateCatalog(value),observed=catalogFromItems(items);
  for(const key of CATALOG_KEYS)saved.options[key]=[...new Set([...saved.options[key],...items.map(item=>item[key]).filter(Boolean)])];
  for(const [person,rooms] of Object.entries(observed.specialistRooms))if(!(person in saved.specialistRooms))saved.specialistRooms[person]=rooms;
  return saved;
}
export function loadCatalog(source: string, items: Item[]): CatalogConfig {
  const seed = catalogFromItems(items);
  try {
    const raw = globalThis.localStorage?.getItem(key(source));
    if (!raw) return seed;
    return mergeCatalogItems(validateCatalog(JSON.parse(raw)),items);
  } catch { return seed; }
}
export function saveCatalog(source:string, value:CatalogConfig):boolean { const config = validateCatalog(value); try { if (!globalThis.localStorage) return false; globalThis.localStorage.setItem(key(source),JSON.stringify(config)); return true; } catch { return false; } }
export function assignmentIssue(item: Item, config: CatalogConfig): string {
  const rooms = config.specialistRooms[item.specialist];
  return rooms?.length && !rooms.includes(item.room) ? `${item.specialist} chưa được gán vào phòng ${item.room}. Chọn lại chuyên viên hoặc chỉnh quan hệ.` : '';
}
