/**
 * The App's only V2 parent write path. Selection, preview, staging, private
 * backup and read-only operation resolution stay on their existing modules.
 * Direct old SDK parent transactions remain confined to old DEMO test fixtures
 * and are NOT exported by this production-facing adapter.
 */
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {ActiveDatasetPointer} from './dataset-replacement-integrity';
import {firebaseAdmin} from './firebase-repository';
import {requestParentDatasetCommit,type ParentCommitResult} from './parent-commit-api';
import type {ReplacementApproval,InitialActivationApproval} from './firebase-versioned-replacement';
export {DATASET_V2_PATH,stageDatasetReplacement,prepareInitialDatasetActivation,
  readStagedDataset,resolveDatasetOperation} from './firebase-versioned-replacement';
export type {ReplacementApproval,InitialActivationApproval,
  ReplacementOutcome,DatasetOperationStatus} from './firebase-versioned-replacement';

const guard=(user:User|null)=>{
  if(!firebaseAdmin(user))throw Error('Chỉ admin Google đã xác minh được commit V2.');
};
export async function commitInitialDatasetActivation(database:Database,user:User|null,
 approval:InitialActivationApproval,confirmation:string):Promise<ParentCommitResult>{
  guard(user);
  const op=approval.operationId;
  if(approval.manifest.operationId!==op||approval.manifest.generationId!=='gen_'+op||
    approval.preview.oldCount!==approval.legacyRowCount||
    approval.preview.newCount!==approval.manifest.rowCount||
    confirmation!=='KHOI TAO V2 '+op+' '+approval.legacyRowCount+' '+approval.preview.newCount)
    throw Error('Phê duyệt khởi tạo và xác nhận không trùng khớp.');
  return requestParentDatasetCommit(database,user,{action:'activate',operationId:op,confirmation});
}
export async function commitDatasetReplacement(database:Database,user:User|null,
 approval:ReplacementApproval,confirmation:string):Promise<ParentCommitResult>{
  guard(user);
  const op=approval.operationId;
  if(approval.manifest.operationId!==op||approval.manifest.generationId!=='gen_'+op||
    approval.preview.newCount!==approval.manifest.rowCount||
    confirmation!=='THAY '+op+' '+approval.preview.oldCount+' '+approval.preview.newCount)
    throw Error('Phê duyệt thay thế và xác nhận không trùng khớp.');
  return requestParentDatasetCommit(database,user,{action:'replace',operationId:op,
    confirmation,expected:approval.expected});
}
export async function restoreDatasetBackup(database:Database,user:User|null,
 backupOperationId:string,restoreOperationId:string,expected:ActiveDatasetPointer,
 confirmation:string):Promise<ParentCommitResult>{
  guard(user);
  if(!/^[A-Za-z0-9_-]{12,80}$/.test(restoreOperationId)||
     !/^[A-Za-z0-9_-]{12,80}$/.test(backupOperationId)||
     confirmation!=='KHOI PHUC '+restoreOperationId)
    throw Error('Mã khôi phục hoặc xác nhận riêng không hợp lệ.');
  return requestParentDatasetCommit(database,user,{action:'restore',
    operationId:restoreOperationId,confirmation,backupOperationId,expected});
}