export interface SheetConfig {
  spreadsheetId: string;
  gid: string;
  url: string;
}

export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344';
const CANONICAL_SOURCE_ID = '1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp';
const CANONICAL_SOURCE_GID = '60961344';

const STORAGE_KEY = 'hdnd.sheet-config.v1';
const SHEET_PATH = /^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/(edit|view|htmlview))?\/?$/;
const VALID_GID = /^\d+$/;

function readGid(url: URL, spreadsheetId: string, gidOverride?: string): string {
  const override = gidOverride?.trim();
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  // Shared Excel edit links often omit gid. Do not silently switch the
  // known HopHDND source to an unrelated tab (gid=0) when pasted.
  const candidate = override || url.searchParams.get('gid')?.trim() ||
    new URLSearchParams(hash).get('gid')?.trim() ||
    (spreadsheetId===CANONICAL_SOURCE_ID?CANONICAL_SOURCE_GID:'0');
  if (!VALID_GID.test(candidate)) throw new Error('Mã trang tính (gid) chỉ gồm chữ số.');
  return candidate;
}

export function parseSheetConfig(url: string, gidOverride?: string): SheetConfig {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Hãy nhập link Google Sheets hợp lệ.');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'docs.google.com') {
    throw new Error('Chỉ chấp nhận link HTTPS của docs.google.com.');
  }
  if (parsed.username || parsed.password || parsed.port) {
    throw new Error('Link không được chứa thông tin đăng nhập hoặc cổng tùy chỉnh.');
  }

  const match = SHEET_PATH.exec(parsed.pathname);
  if (!match) throw new Error('Link chưa đúng dạng Google Sheets /spreadsheets/d/...');

  const spreadsheetId = match[1];
  const gid = readGid(parsed, spreadsheetId, gidOverride);
  return {
    spreadsheetId,
    gid,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}`,
  };
}

export function loadSheetConfig(): SheetConfig | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== 'object') return null;
    const value = stored as Partial<SheetConfig>;
    if (typeof value.url !== 'string' || typeof value.gid !== 'string' || typeof value.spreadsheetId !== 'string') return null;
    const config = parseSheetConfig(value.url, value.gid);
    if(config.spreadsheetId!==value.spreadsheetId)return null;
    // Repair source configurations previously pasted without ?gid: the old
    // parser silently stored gid=0, which refers to a different tab.
    if(config.spreadsheetId===CANONICAL_SOURCE_ID && config.gid==='0')
      return parseSheetConfig(DEFAULT_SHEET_URL);
    return config;
  } catch {
    return null;
  }
}

export function saveSheetConfig(config: SheetConfig): boolean {
  try {
    const canonical = parseSheetConfig(config.url, config.gid);
    if (canonical.spreadsheetId !== config.spreadsheetId || !globalThis.localStorage) return false;
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(canonical));
    return true;
  } catch {
    return false;
  }
}

export function clearSheetConfig(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}
