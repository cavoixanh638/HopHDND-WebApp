import {afterEach,it,expect,vi} from 'vitest';
import type {Database} from 'firebase/database';
const state=vi.hoisted(()=>({emulatorConfig:{host:'127.0.0.1',port:9099} as object|null}));
vi.mock('firebase/auth',()=>({getAuth:()=>state}));
import {armSparkCellCallerAckLoss,maybeLoseSparkCellCallerAck} from '../src/data/spark-cell-ack-test';
const db=(projectId='demo-hdnd')=>({app:{options:{projectId}}} as unknown as Database);
afterEach(()=>{vi.unstubAllEnvs();state.emulatorConfig={host:'127.0.0.1',port:9099};});
it('cannot arm the caller fault in a production build mode',()=>{
  vi.stubEnv('MODE','pages');expect(()=>armSparkCellCallerAckLoss(db())).toThrow(/LOCAL_AUTH_EMULATOR/);
});
it('cannot arm against a real Firebase project even while Auth Emulator is configured',()=>{
  expect(()=>armSparkCellCallerAckLoss(db('hophdnd-8b7b2'))).toThrow(/LOCAL_AUTH_EMULATOR/);
});
it('cannot arm without a connected Auth Emulator',()=>{
  state.emulatorConfig=null;expect(()=>armSparkCellCallerAckLoss(db())).toThrow(/LOCAL_AUTH_EMULATOR/);
});
it('only loses the confirmed save callback once and only for the armed database',()=>{
  const first=db(),other=db();armSparkCellCallerAckLoss(first);
  expect(()=>maybeLoseSparkCellCallerAck(first,'acquire','acquired')).not.toThrow();
  expect(()=>maybeLoseSparkCellCallerAck(first,'save','unknown')).not.toThrow();
  expect(()=>maybeLoseSparkCellCallerAck(other,'save','committed')).not.toThrow();
  expect(()=>maybeLoseSparkCellCallerAck(first,'save','committed')).toThrow(/AFTER_SERVER_READBACK/);
  expect(()=>maybeLoseSparkCellCallerAck(first,'save','committed')).not.toThrow();
});
