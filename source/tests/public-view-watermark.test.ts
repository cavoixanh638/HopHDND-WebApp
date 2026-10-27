import {describe,it,expect} from 'vitest';
import {acceptsPublicViewWatermark as accept} from '../src/data/public-view-watermark';
describe('Trusted publisher never lets stale events overwrite public report/list',()=>{
  const old={profileRevision:10,recordRevisions:{a:2,b:5}};
  it('accepts bootstrap/new row, latest layout, and a new cell update',()=>{
    expect(accept(null,old)).toBe(true);
    expect(accept(old,{profileRevision:11,recordRevisions:{a:2,b:5}})).toBe(true);
    expect(accept(old,{profileRevision:10,recordRevisions:{a:2,b:6,c:1}})).toBe(true);
  });
  it('rejects old snapshots, partial reads, invalid revisions and same-data retries',()=>{
    expect(accept(old,{profileRevision:9,recordRevisions:{a:4,b:6}})).toBe(false);
    expect(accept(old,{profileRevision:10,recordRevisions:{a:2,b:4}})).toBe(false);
    expect(accept(old,{profileRevision:10,recordRevisions:{a:2}})).toBe(false);
    expect(accept(old,{profileRevision:10,recordRevisions:{a:2,b:5}})).toBe(false);
    expect(accept(null,{profileRevision:0,recordRevisions:{a:1}})).toBe(false);
    expect(accept(null,{profileRevision:1,recordRevisions:{a:0}})).toBe(false);
  });
});
