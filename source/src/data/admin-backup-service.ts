/** Read-only admin data export. Firebase Rules remain unchanged.
 * Deliberately no root get()/set()/update(), delete() or import action.
 * A full Firebase project backup (Auth/Rules/unknown branches) still needs a
 * privileged online service; this is an enumerated WebApp data archive.
 */
import {get,ref,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import {getIdToken} from 'firebase/auth';
import {firebaseAdmin} from './firebase-repository';
import {readFreeze,activeEditLeaseCount} from './freeze-control';
import {BACKUP_PATHS,makeBackupEnvelope,inspectBackupJson,stableBackupJson,
  type BackupNodes,type BackupScope,type BackupEnvelope,type BackupPayload} from './admin-backup-format';
import {firebaseConfig} from './firebase-config';
const LIMIT=30*1024*1024;
const online=async(database:Database):Promise<void>=>{
  const info=await get(ref(database,'.info/connected'));
  if(info.val()!==true)throw Error('Firebase đang ngoại tuyến. Không xuất bản cache thành backup.');
};
const freezeGate=async(database:Database):Promise<void>=>{
  const frozen=await readFreeze(database);
  if(frozen.mode!=='FROZEN')
    throw Error('Phải đóng băng chỉnh sửa trước khi tạo bản sao lưu đủ các nhánh.');
  if(await activeEditLeaseCount(database)!==0)
    throw Error('Vẫn còn ô đang được chỉnh sửa. Chưa thể xác nhận snapshot.');
};
export const activeBackupScope=(database:Database):BackupScope=>({
  projectId:database.app.options.projectId??'',
  databaseURL:database.app.options.databaseURL??firebaseConfig.databaseURL,
});
async function readPaths(database:Database):Promise<BackupNodes>{
  const entries:Record<string,unknown>={};
  for(const path of BACKUP_PATHS){
    const snapshot=await get(ref(database,path));
    entries[path]=snapshot.val();
    if(stableBackupJson(entries).length>LIMIT)
      throw Error('Bản sao lưu vượt 30 MB; cần dịch vụ sao lưu phía máy chủ.');
  }
  return entries as BackupNodes;
}
export async function buildAdminAppBackup(database:Database,user:User|null):Promise<BackupEnvelope>{
  if(!firebaseAdmin(user)||!user||user.isAnonymous)
    throw Error('Chỉ tài khoản Google quản trị đã xác minh được tải bản sao dữ liệu.');
  if(activeBackupScope(database).projectId!==firebaseConfig.projectId)
    throw Error('Project Firebase không khớp ứng dụng. Không xuất dữ liệu.');
  // Refresh the Auth claim rather than trusting a client-side cached admin flag.
  await getIdToken(user,true);
  await online(database);
  await freezeGate(database);
  const first=await readPaths(database);
  await online(database);
  await freezeGate(database);
  const second=await readPaths(database);
  if(stableBackupJson(first)!==stableBackupJson(second))
    throw Error('Dữ liệu thay đổi giữa hai lần đọc: không tạo bản backup không nhất quán.');
  await online(database);
  await freezeGate(database);
  const payload:BackupPayload={
    format:'hophdnd-admin-archive',
    schemaVersion:1,
    createdAt:new Date().toISOString(),
    ...activeBackupScope(database),
    paths:[...BACKUP_PATHS],
    nodes:second,
  };
  const envelope=await makeBackupEnvelope(payload);
  if(new TextEncoder().encode(JSON.stringify(envelope)).length>LIMIT)
    throw Error('Backup vượt 30 MB; không tạo file trên trình duyệt.');
  // Round-trip the exact downloaded payload before providing it to the admin.
  await inspectBackupJson(JSON.stringify(envelope),activeBackupScope(database));
  return envelope;
}
export function saveBackupFile(envelope:BackupEnvelope):string {
  const stamp=envelope.payload.createdAt.replace(/[:.]/g,'-');
  const filename='HopHDND-backup-'+stamp+'-'+envelope.sha256.slice(0,10)+'.json';
  const blob=new Blob([JSON.stringify(envelope,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return filename;
}
