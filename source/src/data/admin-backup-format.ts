/** Deterministic and inspectable backup format for explicitly enumerated
 * HopHDND application paths. This is NOT a backup of the Firebase Auth account
 * directory, Security Rules, or unknown root siblings; never label it as one.
 * All captured nodes must be read while writes are frozen and rechecked.
 */
export const BACKUP_PATHS=[
  'hdnd/items',
  'hdnd/permissions',
  'hdnd/profile',
  'hdnd/control',
  'hdnd/editLocks',
  'hdnd/freezeControl',
  'hdnd/freezeReceipts',
  'hdnd/editors',
  'hdnd/mirrors',
  'hdnd/datasetV2',
  'hdndReviews',
] as const;
export type BackupPath=typeof BACKUP_PATHS[number];
export type BackupNodes=Record<BackupPath,unknown>;
export interface BackupScope {
  projectId:string;
  databaseURL:string;
}
export interface BackupPayload extends BackupScope {
  format:'hophdnd-admin-archive';
  schemaVersion:1;
  createdAt:string;
  paths:BackupPath[];
  nodes:BackupNodes;
}
export interface BackupEnvelope {
  payload:BackupPayload;
  sha256:string;
}
export interface BackupInspection {
  envelope:BackupEnvelope;
  activeRows:number;
  legacyRows:number;
  mode:'v2'|'legacy'|'empty';
  freezeRevision:number;
  createdAt:string;
}
const shaPattern=/^[0-9a-f]{64}$/;
const requiredPaths=new Set<string>(BACKUP_PATHS);
const isRecord=(v:unknown):v is Record<string,unknown>=>
  !!v&&typeof v==='object'&&!Array.isArray(v);
export function stableBackupJson(value:unknown):string {
  const normalize=(v:unknown):unknown=>{
    if(Array.isArray(v))return v.map(normalize);
    if(isRecord(v))return Object.fromEntries(Object.entries(v)
      .filter(([_,val])=>val!==undefined)
      .sort(([a],[b])=>a.localeCompare(b,'en'))
      .map(([k,val])=>[k,normalize(val)]));
    if(typeof v==='number'&&!Number.isFinite(v))throw Error('Backup có giá trị số không hợp lệ.');
    return v===undefined?null:v;
  };
  return JSON.stringify(normalize(value));
}
export async function sha256String(value:string):Promise<string> {
  if(!globalThis.crypto?.subtle)throw Error('Trình duyệt không hỗ trợ SHA-256; không thể sao lưu.');
  const bytes=new TextEncoder().encode(value);
  const hash=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
  return Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
}
function checkPayload(input:unknown,expected?:BackupScope):BackupPayload {
  if(!isRecord(input)||input.format!=='hophdnd-admin-archive'||input.schemaVersion!==1)
    throw Error('File không phải bản backup HopHDND phiên bản 1.');
  const source=input as unknown as BackupPayload;
  if(typeof source.projectId!=='string'||!source.projectId||
    typeof source.databaseURL!=='string'||!source.databaseURL.startsWith('https://')||
    typeof source.createdAt!=='string'||!Number.isFinite(Date.parse(source.createdAt)))
    throw Error('Thiếu thông tin nguồn, ngày hoặc địa chỉ database trong backup.');
  if(expected&&(source.projectId!==expected.projectId||
    source.databaseURL!==expected.databaseURL))
    throw Error('Backup thuộc Firebase project/instance khác. Không được nhập nhầm.');
  if(!Array.isArray(source.paths)||source.paths.length!==BACKUP_PATHS.length||
    source.paths.some((p,i)=>p!==BACKUP_PATHS[i])||
    !isRecord(source.nodes)||Object.keys(source.nodes).length!==requiredPaths.size||
    Object.keys(source.nodes).some(p=>!requiredPaths.has(p)))
    throw Error('Phạm vi backup không khớp các nhánh WebApp đã kiểm duyệt.');
  for(const p of BACKUP_PATHS)if(!Object.prototype.hasOwnProperty.call(source.nodes,p))
    throw Error('Backup thiếu nhánh bắt buộc: '+p);
  const frozen=source.nodes['hdnd/freezeControl'];
  if(!isRecord(frozen)||frozen.mode!=='FROZEN'||
    !Number.isSafeInteger(frozen.revision)||Number(frozen.revision)<1)
    throw Error('Backup không có bằng chứng đóng băng hợp lệ; không dùng để khôi phục.');
  return source;
}
export async function makeBackupEnvelope(payload:BackupPayload):Promise<BackupEnvelope>{
  const checked=checkPayload(payload);
  const sha256=await sha256String(stableBackupJson(checked));
  return {payload:checked,sha256};
}
export async function inspectBackupJson(json:string,expected?:BackupScope):Promise<BackupInspection>{
  if(new TextEncoder().encode(json).length>30*1024*1024)
    throw Error('File backup vượt giới hạn xem trước 30 MB.');
  let raw:unknown;
  try{raw=JSON.parse(json);}catch{throw Error('File backup không phải JSON hợp lệ.');}
  if(!isRecord(raw)||Object.keys(raw).length!==2||
    !Object.prototype.hasOwnProperty.call(raw,'payload')||
    !Object.prototype.hasOwnProperty.call(raw,'sha256')||
    typeof raw.sha256!=='string'||!shaPattern.test(raw.sha256))
    throw Error('Thiếu chữ ký kiểm tra toàn vẹn SHA-256 của backup.');
  const payload=checkPayload(raw.payload,expected);
  const digest=await sha256String(stableBackupJson(payload));
  if(digest!==raw.sha256)
    throw Error('SHA-256 không khớp: file backup đã thay đổi hoặc bị hỏng. Không nạp.');
  const active=isRecord(payload.nodes['hdnd/datasetV2'])
    ?(payload.nodes['hdnd/datasetV2'] as Record<string,unknown>):null;
  const pointer=isRecord(active?.active)?active.active:null;
  const generations=isRecord(active?.generations)?active.generations:null;
  let activeRows=0;
  if(pointer){
    if(typeof pointer.generationId!=='string'||!/^gen_[A-Za-z0-9_-]{12,80}$/.test(pointer.generationId)||
      !Number.isSafeInteger(pointer.rowCount)||Number(pointer.rowCount)<1||Number(pointer.rowCount)>1000)
      throw Error('Con trỏ thế hệ trong backup không hợp lệ.');
    const generation=isRecord(generations?.[pointer.generationId])
      ?generations[pointer.generationId] as Record<string,unknown>:null;
    const rows=isRecord(generation?.items)?generation.items:null;
    if(!rows||Object.keys(rows).length!==pointer.rowCount)
      throw Error('Số hồ sơ V2 không khớp con trỏ. Không thể khôi phục.');
    activeRows=Object.keys(rows).length;
  }
  const legacy=payload.nodes['hdnd/items'];
  const legacyRows=isRecord(legacy)?Object.keys(legacy).length:0;
  if(!activeRows&&!legacyRows)throw Error('Backup không có hồ sơ đang quản lý; kiểm tra nguồn dữ liệu.');
  return {envelope:{payload,sha256:digest},
    activeRows,legacyRows,mode:activeRows?'v2':'legacy',
    freezeRevision:Number((payload.nodes['hdnd/freezeControl'] as Record<string,unknown>).revision),
    createdAt:payload.createdAt};
}
