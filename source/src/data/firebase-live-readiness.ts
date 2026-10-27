import {get,ref,type Database} from 'firebase/database';

/** Read-only check of the exact RTDB used by the running browser session.
 * It never modifies Rules, profile, items, control or employee access.
 * A green Firebase SDK read is NOT evidence of published Rules correctness.
 */
export type LiveFirebaseReadiness={
  checkedAt:string;
  source:'excel'|'database'|'primary'|'unknown';
  primaryCount:number;
  profilePresent:boolean;
  permissionsPresent:boolean;
  editorAccounts:number;
  editingLocked:boolean;
  freezeMode:'OPEN'|'DRAINING'|'FROZEN'|'UNKNOWN';
  problems:string[];
};
export function summarizeLiveReadiness(raw:{
  profile:unknown;items:unknown;permissions:unknown;editors:unknown;
  control:unknown;freeze:unknown;
}):Omit<LiveFirebaseReadiness,'checkedAt'>{
  const val=(value:unknown):Record<string,unknown>|null=>
    value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
  const profile=val(raw.profile);
  let savedProfile:Record<string,unknown>|null=null;
  try {
    const payload=profile?.payload;
    savedProfile=val(typeof payload==='string'?JSON.parse(payload):payload);
  }catch {
    savedProfile=null;
  }
  const rawSource=savedProfile?.dataSource;
  const source=rawSource==='excel'||rawSource==='database'||rawSource==='primary'
    ?rawSource:'unknown';
  const items=val(raw.items);
  const control=val(raw.control);
  const freeze=val(raw.freeze);
  const mode=freeze?.mode;
  const freezeMode=mode==='OPEN'||mode==='DRAINING'||mode==='FROZEN'?mode:'UNKNOWN';
  const editors=val(raw.editors)??{};
  const problems:string[]=[];
  if(!profile)problems.push('Chưa có cấu hình profile Firebase.');
  if(profile&&!savedProfile)problems.push('Không đọc được cấu hình nguồn từ profile.');
  if(source!=='primary')problems.push('Nguồn đọc bảng chưa chọn Firebase chính.');
  if(!items||!Object.keys(items).length)problems.push('hdnd/items chưa có hồ sơ nghiệp vụ chính.');
  if(!val(raw.permissions))problems.push('Chưa đọc được danh sách phân quyền ô.');
  if(control?.editingLocked===true)problems.push('Quản trị đang khóa chỉnh sửa.');
  if(freezeMode==='FROZEN'||freezeMode==='DRAINING')problems.push('Hệ thống đang chốt dữ liệu ('+freezeMode+').');
  if(freezeMode==='UNKNOWN')problems.push('Chưa xác định được trạng thái chốt dữ liệu; cần xác minh trước khi ghi.');
  return {
    source,primaryCount:items?Object.keys(items).length:0,
    profilePresent:!!profile,permissionsPresent:!!val(raw.permissions),
    editorAccounts:Object.values(editors).filter(value=>value===true).length,
    editingLocked:control?.editingLocked===true,freezeMode,problems
  };
}
export async function checkLiveFirebaseReadiness(database:Database):Promise<LiveFirebaseReadiness>{
  const paths=['hdnd/profile','hdnd/items','hdnd/permissions','hdnd/editors','hdnd/control','hdnd/freezeControl'];
  // Authenticated SDK GET reads exactly the real project's paths, not the
  // local files or emulator. Never print or upload the underlying values.
  const snaps=await Promise.all(paths.map(path=>get(ref(database,path))));
  const [profile,items,permissions,editors,control,freeze]=snaps.map(snapshot=>snapshot.val() as unknown);
  return {checkedAt:new Date().toISOString(),...summarizeLiveReadiness({
    profile,items,permissions,editors,control,freeze
  })};
}
