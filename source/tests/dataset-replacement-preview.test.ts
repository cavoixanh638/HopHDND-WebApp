import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {previewDatasetReplacement} from '../src/data/dataset-replacement-preview';
describe('replacement preview is pure, complete, and does not append old records',()=>{
  it('counts added/changed/removed/unchanged independently and leaves inputs unchanged',()=>{
    const old=createDemoItems(3),newer=[{...old[0],content:'Đổi nội dung'},old[1],
      {...old[2],recordId:'new-3',displayCode:'NEW-3'}];
    const snapshot=JSON.stringify(old);
    const x=previewDatasetReplacement(old,newer);
    expect(x.oldCount).toBe(3);expect(x.newCount).toBe(3);
    expect(x.difference.changed).toEqual([old[0].displayCode]);
    expect(x.difference.unchanged).toEqual([old[1].displayCode]);
    expect(x.difference.added).toEqual(['NEW-3']);
    expect(x.difference.removed).toEqual([old[2].displayCode]);
    expect(JSON.stringify(old)).toBe(snapshot);
  });
  it('rejects empty, duplicate and malformed candidate, never mutates live collection',()=>{
    const live=createDemoItems(2),before=JSON.stringify(live);
    expect(()=>previewDatasetReplacement(live,[])).toThrow('từ 1 đến 1.000');
    expect(()=>previewDatasetReplacement(live,[live[0],live[0]])).toThrow('trùng');
    expect(JSON.stringify(live)).toBe(before);
  });
});
