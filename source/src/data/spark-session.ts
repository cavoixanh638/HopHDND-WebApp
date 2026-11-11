import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,initializeAuth,inMemoryPersistence,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,set,serverTimestamp,type Database} from 'firebase/database';
import {firebaseAdmin} from './firebase-repository';

type Session={app?:FirebaseApp;database:Database;uid:string;ownerUid:string;expiresAt:number};
const sessions=new WeakMap<Database,Promise<Session>>();
const SESSION_MS=30*60*1000;

/** The Google user owns a binding. The independent RAM-only Auth principal
 * exercises leases. Knowing a public session UID never authenticates a tab. */
export async function sparkSession(database:Database):Promise<Session>{
  const auth=getAuth(database.app);
  await auth.authStateReady();
  const owner=auth.currentUser;
  if(!owner)throw Error('Chưa xác thực Firebase.');
  if(owner.isAnonymous)return {database,uid:owner.uid,ownerUid:owner.uid,expiresAt:Infinity};
  let pending=sessions.get(database);
  if(!pending){
    pending=(async()=>{
      const app=initializeApp(database.app.options,'spark-tab-'+crypto.randomUUID());
      try{
        const tabAuth=initializeAuth(app,{persistence:inMemoryPersistence});
        const tabDatabase=getDatabase(app);
        if(auth.emulatorConfig){
          if(!database.app.options.projectId?.startsWith('demo-'))throw Error('Emulator yêu cầu demo project.');
          connectAuthEmulator(tabAuth,`http://${auth.emulatorConfig.host}:${auth.emulatorConfig.port}`,{disableWarnings:true});
          connectDatabaseEmulator(tabDatabase,'127.0.0.1',9000);
        }
        const {user}=await signInAnonymously(tabAuth);
        return {app,database:tabDatabase,uid:user.uid,ownerUid:owner.uid,expiresAt:0};
      }catch(error){await deleteApp(app);throw error;}
    })();
    sessions.set(database,pending);
    pending.catch(()=>sessions.delete(database));
  }
  const session=await pending;
  if(auth.currentUser?.uid!==session.ownerUid)throw Error('Tài khoản đã thay đổi, hãy mở lại phiên sửa.');
  const binding=ref(database,'hdnd/sparkSessions/'+session.uid);
  const prior=(await get(binding)).val();
  if(prior?.expiresAt===0)throw Error('Phiên sửa đã bị thu hồi.');
  if(!prior||session.expiresAt<Date.now()+60000){
    const expiresAt=Date.now()+SESSION_MS;
    await set(binding,{ownerUid:owner.uid,admin:firebaseAdmin(owner),createdAt:prior?.createdAt??serverTimestamp(),expiresAt});
    session.expiresAt=expiresAt;
  }
  return session;
}

export async function closeSparkSession(database:Database):Promise<void>{
  const pending=sessions.get(database);
  sessions.delete(database);
  if(!pending)return;
  const session=await pending;
  try{
    const binding=ref(database,'hdnd/sparkSessions/'+session.uid);
    const prior=(await get(binding)).val();
    if(prior)await set(binding,{...prior,expiresAt:0});
  }finally{if(session.app)await deleteApp(session.app);}
}
