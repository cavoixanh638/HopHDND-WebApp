export const AUTOSAVE_MS = 10000;
export interface Checkpoint<T> { schemaVersion: 1; base: T; draft: T; savedAt: string }
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
