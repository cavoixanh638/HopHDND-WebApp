import type {Patch} from '../../shared/types';

/** Dropdown selections are final values, not intermediate keystrokes.
 * React has already painted the local draft when the effect schedules save.
 * Keep the original 800ms debounce for typing, multiline notes and batches. */
const IMMEDIATE_FIELDS=new Set(['partyLevel','progressParty','progressBuild','progressCouncil','isDropped']);
export const FIREBASE_TEXT_DEBOUNCE_MS=800;
export function firebaseAutosaveDelay(drafts:Record<string,Patch>):number{
  const pending=Object.values(drafts);
  if(!pending.length)return FIREBASE_TEXT_DEBOUNCE_MS;
  return pending.every(patch=>{
    const keys=Object.keys(patch.changes);
    return keys.length>0&&keys.every(key=>IMMEDIATE_FIELDS.has(key));
  })?0:FIREBASE_TEXT_DEBOUNCE_MS;
}
