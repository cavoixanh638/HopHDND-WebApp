import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {datasetPreviewFingerprint} from '../src/data/dataset-preview-fingerprint';

describe('preview invalidation on live row changes',()=>{
  it('does not invalidate for a change in row ordering only',()=>{
    const rows=createDemoItems(3);
    expect(datasetPreviewFingerprint(rows)).toBe(datasetPreviewFingerprint([...rows].reverse()));
  });
  it('invalidates for any edited business field, including unchanged revision',()=>{
    const rows=createDemoItems(2);
    const before=datasetPreviewFingerprint(rows);
    expect(datasetPreviewFingerprint([{...rows[0],note:'Nội dung khác'},rows[1]])).not.toBe(before);
    expect(datasetPreviewFingerprint([{...rows[0],revision:rows[0].revision+1},rows[1]])).not.toBe(before);
    expect(datasetPreviewFingerprint(rows.slice(0,1))).not.toBe(before);
  });
});
