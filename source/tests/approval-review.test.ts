import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {compareApprovedSnapshot,snapshotFromItems,approvalIdentityWarnings,serializeReviewSnapshot,validateReviewSnapshot} from '../src/domain/approval-review';
describe('approval baselines',()=>{
  it('blocks ambiguous approval baselines with missing or repeated content codes',()=>{
    const items=createDemoItems(3);
    const ambiguous=snapshotFromItems([{...items[0],displayCode:'Dòng 9 (thiếu mã)'},{...items[1],displayCode:'NQ09'},{...items[2],displayCode:'NQ09'}],'sheet:42');
    expect(approvalIdentityWarnings(ambiguous)).toHaveLength(2);
    expect(approvalIdentityWarnings(snapshotFromItems(items,'sheet:42'))).toEqual([]);
  });
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
    const recoded=snapshotFromItems([{...items[0],displayCode:'NQ99'},items[1]],'sheet:42');
    expect(compareApprovedSnapshot(base,recoded).some(d=>d.changes.some(c=>c.field==='displayCode'))).toBe(true);
    expect(()=>validateReviewSnapshot(base,'another')).toThrow();
  });
});
