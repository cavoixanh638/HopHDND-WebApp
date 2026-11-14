import {describe,expect,it} from 'vitest';
import type {Changes,Patch} from '../shared/types';
import {firebaseAutosaveDelay,FIREBASE_TEXT_DEBOUNCE_MS} from '../src/data/firebase-autosave-policy';

function row(changes:Changes):Patch{
  return {recordId:'demo',sourceCode:'NQ01',baseRevision:1,baseValues:{},
    changes,operationId:crypto.randomUUID()};
}
describe('Firebase Sheets-like autosave without false acknowledgement',()=>{
  it('commits final status selections on the next event-loop turn, without 800ms typing debounce',()=>{
    for(const field of ['partyLevel','progressParty','progressBuild','progressCouncil'] as const){
      expect(firebaseAutosaveDelay({demo:row({[field]:'VP đang xử lý'})})).toBe(0);
    }
    expect(firebaseAutosaveDelay({demo:row({isDropped:true})})).toBe(0);
  });
  it('keeps the original debounce for typing, assignment and mixed text/status batches',()=>{
    expect(firebaseAutosaveDelay({demo:row({note:'Người dùng còn đang gõ'})})).toBe(FIREBASE_TEXT_DEBOUNCE_MS);
    expect(firebaseAutosaveDelay({demo:row({specificProgress:'Báo cáo'})})).toBe(800);
    expect(firebaseAutosaveDelay({demo:row({specialist:'Chuyên viên'})})).toBe(800);
    expect(firebaseAutosaveDelay({demo:row({progressParty:'VP đang xử lý',note:'ghi chú'})})).toBe(800);
    expect(firebaseAutosaveDelay({status:row({partyLevel:'BCH'}),text:row({note:'n'})})).toBe(800);
  });
  it('does not infer an authorized save from an empty or invalid draft',()=>{
    expect(firebaseAutosaveDelay({})).toBe(800);
    expect(firebaseAutosaveDelay({demo:row({})})).toBe(800);
  });
});
