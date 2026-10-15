import { describe, expect, it } from 'vitest';
import source from '../server/probes/ExistingCopyWorkbookProbe.gs?raw';

const copyId = '19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7';
const expectedTitle = 'Dashboard HĐND - THỬ GHI EXCEL - không dùng nhập liệu';
const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Metadata = { id: string; title: string; mimeType: string; etag: string; labels?: { trashed?: boolean }; permissions?: { role: string; type: string }[] };
function runProbe(options: { metadata?: Partial<Metadata>; metadataStatus?: number; etags?: string[]; rejectScopes?: boolean } = {}) {
  const calls: { url: string; method: string; options: Record<string, unknown> }[] = [];
  let released = 0;
  let metadataCount = 0;
  let tokenCalls = 0;
  let lockCalls = 0;
  let tryLockCalls = 0;
  const requiredScopes: { mode: string; scopes: string[] }[] = [];
  const metadata: Metadata = {
    id: copyId,
    title: expectedTitle,
    mimeType: mime,
    etag: 'etag-1',
    labels: { trashed: false },
    permissions: [{ role: 'owner', type: 'user' }],
    ...options.metadata,
  };
  const response = (status: number, body = '', blob: unknown = { fake: 'blob' }) => ({
    getResponseCode: () => status,
    getContentText: () => body,
    getBlob: () => blob,
  });
  const api = new Function(
    'ScriptApp', 'LockService', 'UrlFetchApp', 'HDNDExcelWriteCore',
    `${source}\n;return testExistingCopyExcelRoundtrip;`,
  )(
    {
      AuthMode: { FULL: 'FULL' },
      requireScopes: (mode: string, scopes: string[]) => {
        requiredScopes.push({ mode, scopes });
        if (options.rejectScopes) throw new Error('Required scopes were denied.');
      },
      getOAuthToken: () => { tokenCalls++; return 'FAKE_TEST_TOKEN'; },
    },
    { getScriptLock: () => { lockCalls++; return { tryLock: () => { tryLockCalls++; return true; }, releaseLock: () => { released++; } }; } },
    { fetch: (url: string, requestOptions: Record<string, unknown>) => {
      const method = String(requestOptions.method ?? 'get').toLowerCase();
      calls.push({ url, method, options: requestOptions });
      if (url.includes('?alt=media')) return response(200, '', { dummy: 'copy blob' });
      metadataCount++;
      const etag = options.etags?.[metadataCount - 1] ?? metadata.etag;
      const body = JSON.stringify({ ...metadata, etag });
      return response(options.metadataStatus ?? 200, body);
    } },
    {},
  ) as () => unknown;
  return { invoke: api, calls, released: () => released, tokenCalls: () => tokenCalls, lockCalls: () => lockCalls, tryLockCalls: () => tryLockCalls, requiredScopes };
}

describe('existing-copy workbook probe guardrails (all Drive APIs mocked)', () => {
  const invalidMetadataCases: [string, Parameters<typeof runProbe>[0]][] = [
    ['metadata 404', { metadataStatus: 404 }],
    ['wrong title', { metadata: { title: 'Different workbook' } }],
    ['wrong MIME type', { metadata: { mimeType: 'application/vnd.google-apps.spreadsheet' } }],
    ['trashed copy', { metadata: { labels: { trashed: true } } }],
    ['missing trash status', { metadata: { labels: undefined } }],
    ['no permissions', { metadata: { permissions: [] } }],
    ['public permission', { metadata: { permissions: [{ type: 'anyone', role: 'reader' }] } }],
  ];

  it.each(invalidMetadataCases)('rejects %s before any write', (_label, settings) => {
    const test = runProbe(settings);
    expect(() => test.invoke()).toThrow();
    expect(test.calls.length).toBe(1);
    expect(test.calls[0].method).toBe('get');
    expect(test.calls[0].url).toBe(`https://www.googleapis.com/drive/v2/files/${copyId}?fields=id,title,etag,mimeType,labels(trashed),permissions(role,type)`);
    expect(test.calls.some(call => ['put', 'post'].includes(call.method))).toBe(false);
    expect(test.released()).toBe(1);
  });

  it('aborts on denied full-access scopes before requesting a token, lock, or HTTP call', () => {
    const test = runProbe({ rejectScopes: true });
    expect(() => test.invoke()).toThrow(/scopes were denied/);
    expect(test.requiredScopes).toEqual([{
      mode: 'FULL',
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/script.external_request'],
    }]);
    expect(test.tokenCalls()).toBe(0);
    expect(test.lockCalls()).toBe(0);
    expect(test.tryLockCalls()).toBe(0);
    expect(test.calls).toEqual([]);
    expect(test.released()).toBe(0);
  });

  it('rechecks metadata after reading the copy and rejects an ETag change before patching', () => {
    const test = runProbe({ etags: ['etag-before', 'etag-after'] });
    expect(() => test.invoke()).toThrow(/changed during read/);
    expect(test.calls.map(call => call.method)).toEqual(['get', 'get', 'get']);
    expect(test.calls.map(call => call.url)).toEqual([
      `https://www.googleapis.com/drive/v2/files/${copyId}?fields=id,title,etag,mimeType,labels(trashed),permissions(role,type)`,
      `https://www.googleapis.com/drive/v2/files/${copyId}?alt=media`,
      `https://www.googleapis.com/drive/v2/files/${copyId}?fields=id,title,etag,mimeType,labels(trashed),permissions(role,type)`,
    ]);
    expect(test.calls.some(call => ['put', 'post'].includes(call.method))).toBe(false);
    expect(test.released()).toBe(1);
  });
});
