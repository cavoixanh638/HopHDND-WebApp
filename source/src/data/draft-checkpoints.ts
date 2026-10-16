export const AUTOSAVE_MS = 10000;
export interface Checkpoint<T> { schemaVersion: 1; base: T; draft: T; savedAt: string }
/** Production and independent Pages previews may share one browser origin.
 * Isolate layout recovery keys in previews so a stale test draft cannot replace
 * the Firebase canonical layout on the production website. */
export function layoutRecoveryScope(scope:string,pathname:string=typeof location==='undefined'?'/':location.pathname):string{
  const match=pathname.match(new RegExp('/preview/([A-Za-z0-9_-]+)(?:/|$)'));
  return match?`preview:${match[1]}:${scope}`:scope;
}
const key = (scope: string) => `hdnd.draft.v1:${scope}`;
export function readCheckpoint<T>(scope: string, validate: (value: unknown) => T): Checkpoint<T> | null {
  try {
    const raw = globalThis.localStorage?.getItem(key(scope));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== 1 || typeof saved.savedAt !== 'string') return null;
    return { schemaVersion: 1, savedAt: saved.savedAt, base: validate(saved.base), draft: validate(saved.draft) };
  } catch { return null; }
}
export function writeCheckpoint<T>(scope: string, base: T, draft: T): boolean {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key(scope), JSON.stringify({ schemaVersion: 1, base, draft, savedAt: new Date().toISOString() }));
    return true;
  } catch { return false; }
}
export function clearCheckpoint(scope: string): void { try { globalThis.localStorage?.removeItem(key(scope)); } catch { /* báo giới hạn khi lần lưu tiếp theo thất bại */ } }
