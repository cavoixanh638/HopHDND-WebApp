import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {dispatchCellEdit} from './core.js';

// Authentication of the Firebase ID token is performed by the Callable protocol.
// The HTTP body is never authoritative for uid/provider/verified Google claims.
export const cellEdit = onCall({
  region:'asia-southeast1',minInstances:0,maxInstances:10,
  memory:'256MiB',timeoutSeconds:30,cors:true
}, async request=>{
  if(!request.auth?.uid)throw new HttpsError('unauthenticated','Chưa xác thực Firebase.');
  try {return await dispatchCellEdit(request.auth,request.data);}
  catch(error){
    // Never echo a client's private session proof in errors/logs.
    if(error instanceof HttpsError)throw error;
    const tag=String(error?.code??'').toUpperCase();
    if(tag==='PERMISSION_DENIED')throw new HttpsError('permission-denied','Quyền, thế hệ hoặc trạng thái khóa đã thay đổi.');
    if(tag==='UNKNOWN')throw new HttpsError('unavailable','Chưa xác nhận thao tác; giữ bản nháp, kiểm tra lại mã thao tác.');
    throw new HttpsError('failed-precondition','Không hoàn tất thao tác sửa ô; giữ nguyên bản nháp.');
  }
});
