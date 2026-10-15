import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSheetConfig,
  DEFAULT_SHEET_URL,
  loadSheetConfig,
  parseSheetConfig,
  saveSheetConfig,
} from '../src/data/sheet-config';

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

afterEach(() => vi.unstubAllGlobals());

describe('parseSheetConfig', () => {
  it('parses the full Sheets URL and emits a canonical edit URL', () => {
    const config = parseSheetConfig('https://docs.google.com/spreadsheets/d/Abc_123-xy/edit?gid=42&usp=sharing&ouid=7');
    expect(config).toEqual({
      spreadsheetId: 'Abc_123-xy',
      gid: '42',
      url: 'https://docs.google.com/spreadsheets/d/Abc_123-xy/edit?gid=42',
    });
    expect(config.url).not.toContain('ouid');
    expect(config.url).not.toContain('usp=');
  });

  it('reads gid from the hash, honors a nonblank override, and defaults a different tab to zero', () => {
    expect(parseSheetConfig('https://docs.google.com/spreadsheets/d/abc/view#gid=27').gid).toBe('27');
    expect(parseSheetConfig('https://docs.google.com/spreadsheets/d/abc/edit?gid=27', '  91 ').gid).toBe('91');
    expect(parseSheetConfig('https://docs.google.com/spreadsheets/d/abc/edit?gid=27', ' ').gid).toBe('27');
    expect(parseSheetConfig('https://docs.google.com/spreadsheets/d/another-file/edit').gid).toBe('0');
  });

  it('accepts a suffixless /d/ID link and the configured default URL', () => {
    expect(parseSheetConfig('https://docs.google.com/spreadsheets/d/abc').url)
      .toBe('https://docs.google.com/spreadsheets/d/abc/edit?gid=0');
    expect(parseSheetConfig(DEFAULT_SHEET_URL).gid).toBe('60961344');
  });

  it.each([
    'http://docs.google.com/spreadsheets/d/abc/edit',
    'https://evil.example/spreadsheets/d/abc/edit',
    'javascript:alert(1)',
    'https://docs.google.com/spreadsheets/d/e/published-id/edit',
    'https://user:pass@docs.google.com/spreadsheets/d/abc/edit',
    'https://docs.google.com:8443/spreadsheets/d/abc/edit',
    'https://docs.google.com/spreadsheets/d/abc/edit?gid=not-a-number',
    'https://docs.google.com/spreadsheets/d/abc/edit?gid=-1',
  ])('rejects unsupported or unsafe URL %s', (url) => {
    expect(() => parseSheetConfig(url)).toThrow();
  });

  it('rejects a nondigit gid override', () => {
    expect(() => parseSheetConfig('https://docs.google.com/spreadsheets/d/abc/edit', '1x')).toThrow();
  });
});

describe('local sheet configuration', () => {
  it('saves canonical configuration and loads it back', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const config = parseSheetConfig('https://docs.google.com/spreadsheets/d/abc/edit?gid=5&usp=sharing');
    saveSheetConfig(config);
    expect(loadSheetConfig()).toEqual(config);
  });

  it('returns null for missing or corrupted storage and clears saved configuration', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    expect(loadSheetConfig()).toBeNull();
    storage.setItem('hdnd.sheet-config.v1', '{bad json');
    expect(loadSheetConfig()).toBeNull();
    saveSheetConfig(parseSheetConfig('https://docs.google.com/spreadsheets/d/abc/edit'));
    clearSheetConfig();
    expect(loadSheetConfig()).toBeNull();
  });

  it('does not let storage access errors escape', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    });
    expect(loadSheetConfig()).toBeNull();
    expect(() => saveSheetConfig(parseSheetConfig('https://docs.google.com/spreadsheets/d/abc/edit'))).not.toThrow();
    expect(() => clearSheetConfig()).not.toThrow();
  });
});
