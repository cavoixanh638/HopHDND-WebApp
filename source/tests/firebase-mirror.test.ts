import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {parseSheetConfig,DEFAULT_SHEET_URL} from '../src/data/sheet-config';
import {mirrorPath,validateExcelMirror} from '../src/data/firebase-mirror-repository';

const source=parseSheetConfig(DEFAULT_SHEET_URL);
const row={...createDemoItems(1)[0],recordId:source.spreadsheetId+':'+source.gid+':row:7'};
const good={schemaVersion:1,source:source.spreadsheetId+':'+source.gid,
  syncedAt:'2026-10-23T03:00:00Z',sourceModifiedAt:'2026-10-23T02:00:00Z',
  sha256:'a'.repeat(64),rows:[row]};

describe('Firebase mirror is read-only, source-bound and never accepts empty/corrupt snapshots',()=>{
  it('uses a stable path scoped by Excel file id and gid',()=>{
    expect(mirrorPath(source)).toBe('hdnd/mirrors/'+source.spreadsheetId+'/'+source.gid);
    expect(validateExcelMirror(good,source).rows).toHaveLength(1);
  });
  it('fails closed on missing, empty, stale-shape, wrong source and duplicate rows',()=>{
    for(const bad of [null,{...good,rows:[]},{...good,schemaVersion:2},
      {...good,source:'different:3'},{...good,sha256:'xyz'},
      {...good,rows:[row,row]},{...good,rows:[{...row,note:14}]}])
      expect(()=>validateExcelMirror(bad,source)).toThrow();
  });
});
