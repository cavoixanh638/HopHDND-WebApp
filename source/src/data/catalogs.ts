import type { Item, TextField } from '../../shared/types';
import { STATUS_OPTIONS } from '../../shared/field-definitions';
export type CatalogKey = Exclude<TextField, 'content' | 'note'>;
export const CATALOG_KEYS: CatalogKey[] = ['department','type','partyLevel','progressParty','progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress'];
export interface CatalogConfig { options: Record<CatalogKey, string[]>; specialistRooms: Record<string, string[]> }
/** Source values can contain whitespace-only cells, trailing spaces and very
 * long free text. These must not make the saved dropdown config invalid.
 * This normalization changes choices only, never the Sheets source rows. */
const observedChoice=(raw:unknown):string|null=>{
  if(typeof raw!=='string')return null;
  const value=raw.trim();
  return value&&value.length<=200?value:null;
};
const uniqueChoices=(values:Iterable<unknown>):string[]=>{
  const seen=new Set<string>();
  const result:string[]=[];
  for(const raw of values){
    const value=observedChoice(raw);
    if(!value)continue;
    const identity=value.toLocaleLowerCase('vi');
    if(seen.has(identity))continue;
    seen.add(identity);result.push(value);
  }
  return result;
};

export function catalogFromItems(items: Item[]): CatalogConfig {
  const options=Object.fromEntries(CATALOG_KEYS.map(key=>[key,uniqueChoices([
    ...(key in STATUS_OPTIONS ? STATUS_OPTIONS[key as keyof typeof STATUS_OPTIONS]:[]),
    ...items.map(item=>item[key])
  ])])) as CatalogConfig['options'];
  const specialistRooms:Record<string,string[]>=Object.create(null);
  const findCanonical=(choices:string[],value:string)=>choices.find(choice=>
    choice.toLocaleLowerCase('vi')===value.toLocaleLowerCase('vi'));
  for(const item of items){
    const rawPerson=observedChoice(item.specialist),rawRoom=observedChoice(item.room);
    if(!rawPerson||!rawRoom||rawPerson==='Chưa phân công'||rawRoom==='Chưa phân công')continue;
    const person=findCanonical(options.specialist,rawPerson),room=findCanonical(options.room,rawRoom);
    if(!person||!room)continue;
    specialistRooms[person]=uniqueChoices([...(specialistRooms[person]??[]),room]);
  }
  return {options,specialistRooms};
}

export function validateCatalog(value: unknown): CatalogConfig {
  if (!value || typeof value !== 'object') throw new Error('Danh mục không hợp lệ.');
  const input=value as CatalogConfig;
  const options=Object.create(null) as CatalogConfig['options'];
  for(const key of CATALOG_KEYS){
    const list=input.options?.[key];
    if(!Array.isArray(list))throw new Error(`Danh mục cột ${key} không phải danh sách lựa chọn.`);
    const seen=new Set<string>();
    options[key]=list.map((raw,index)=>{
      if(typeof raw!=='string'||!raw.trim())
        throw new Error(`Danh mục cột ${key}: giá trị thứ ${index+1} đang trống.`);
      const choice=raw.trim();
      if(choice.length>200)
        throw new Error(`Danh mục cột ${key}: giá trị thứ ${index+1} quá dài (tối đa 200 ký tự).`);
      const identity=choice.toLocaleLowerCase('vi');
      if(seen.has(identity))
        throw new Error(`Danh mục cột ${key}: giá trị “${choice.slice(0,55)}” bị trùng.`);
      seen.add(identity);
      return choice;
    });
  }
  const specialistRooms:Record<string,string[]>=Object.create(null);
  if(!input.specialistRooms||typeof input.specialistRooms!=='object'||Array.isArray(input.specialistRooms))
    throw new Error('Quan hệ chuyên viên – phòng không hợp lệ.');
  for(const [person,rooms] of Object.entries(input.specialistRooms)){
    if(!options.specialist.includes(person)||!Array.isArray(rooms)||rooms.some(room=>!options.room.includes(room)))
      throw new Error('Quan hệ có chuyên viên hoặc phòng ngoài danh mục.');
    specialistRooms[person]=[...new Set(rooms)];
  }
  return {options,specialistRooms};
}
const key = (source:string) => `hdnd.catalogs.v1:${source}`;
export function mergeCatalogItems(value:CatalogConfig,items:Item[]):CatalogConfig {
  const saved=validateCatalog(value),observed=catalogFromItems(items);
  // Include valid source values, but never reintroduce deleted status presets.
  // Comparing trimmed values avoids duplicate dropdowns after a Sheets refresh.
  for(const key of CATALOG_KEYS)
    saved.options[key]=uniqueChoices([...saved.options[key],...items.map(item=>item[key])]);
  const canonical=(choices:string[],value:string)=>choices.find(choice=>
    choice.toLocaleLowerCase('vi')===value.toLocaleLowerCase('vi'));
  for(const [observedPerson,observedRooms] of Object.entries(observed.specialistRooms)){
    const person=canonical(saved.options.specialist,observedPerson);
    if(!person||person in saved.specialistRooms)continue;
    saved.specialistRooms[person]=uniqueChoices(observedRooms
      .map(room=>canonical(saved.options.room,room))).filter(room=>saved.options.room.includes(room));
  }
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
