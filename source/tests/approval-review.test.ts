import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {compareApprovedSnapshot,snapshotFromItems,serializeReviewSnapshot,validateReviewSnapshot} from '../src/domain/approval-review';
describe('approval baselines',()=>{
  it('compares only changes since the baseline and resets after another approval',()=>{
    const items=createDemoItems(3),base=snapshotFromItems(items,'sheet:42');
    const current=snapshotFromItems([{...items[0],note:'Đã đổi tiến độ'},{...items[1],specialist:'Người mới'},items[2]],'sheet:42');
    const diffs=compareApprovedSnapshot(base,current);
    expect(diffs).toHaveLength(2);
    expect(diffs.some(d=>d.changes.some(c=>c.field==='specialist'))).toBe(true);
    expect(compareApprovedSnapshot(current,current)).toEqual([]);
    expect(validateReviewSnapshot(JSON.parse(serializeReviewSnapshot(base)),'sheet:42').rows).toHaveLength(3);
  });
  it('tracks inserted and removed items, not row reordering with unique codes',()=>{
    const items=createDemoItems(2),base=snapshotFromItems(items,'sheet:42');
    const moved=snapshotFromItems([items[1],items[0]],'sheet:42');
    expect(compareApprovedSnapshot(base,moved)).toEqual([]);
    expect(compareApprovedSnapshot(base,snapshotFromItems([items[0]],'sheet:42')).map(c=>c.kind)).toEqual(['removed']);
    expect(()=>validateReviewSnapshot(base,'another')).toThrow();
  });
});
