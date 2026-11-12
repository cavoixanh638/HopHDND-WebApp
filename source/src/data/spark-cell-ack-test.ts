/** Local Auth Emulator QA only: lose a caller callback after real save readback.
 * This is not a physical WebSocket fault and never changes any RTDB payload. */
import {getAuth} from 'firebase/auth';
import type {Database} from 'firebase/database';
const armed=new WeakSet<Database>();
function requireLocalEmulator(database:Database){
  if(!['pages-test','test'].includes(import.meta.env.MODE)||
    !database.app.options.projectId?.startsWith('demo-hdnd')||
    !getAuth(database.app).emulatorConfig||
    (typeof location!=='undefined'&&!['127.0.0.1','localhost'].includes(location.hostname)))
    throw Error('SPARK_CALLER_ACK_TEST_REQUIRES_LOCAL_AUTH_EMULATOR');
}
export function armSparkCellCallerAckLoss(database:Database){
  requireLocalEmulator(database);armed.add(database);
}
export function maybeLoseSparkCellCallerAck(database:Database,action:string,status:string){
  if(action!=='save'||status!=='committed'||!armed.has(database))return;
  requireLocalEmulator(database);armed.delete(database);
  throw Error('SPARK_TEST_CALLER_ACK_LOST_AFTER_SERVER_READBACK');
}
