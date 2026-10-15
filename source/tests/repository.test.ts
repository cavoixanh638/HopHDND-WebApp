import { describe, expect, it } from 'vitest';
import { createDemoItems } from '../src/data/demo-items';
import { MockRepository } from '../src/data/mock-repository';
import { updateDraft } from '../src/domain/items';

describe('Bản nháp và lưu patch', () => {
  it('sửa rồi hủy không chạm nguồn; trở về giá trị cũ bỏ nháp', async () => {
    const item = createDemoItems(1)[0];
    const repo = new MockRepository([item]);
    const draft = updateDraft(item, undefined, { content: 'Nội dung mới' });
    expect((await repo.list())[0].content).toBe(item.content);
    expect(updateDraft(item, draft, { content: item.content })).toBeUndefined();
    expect(await repo.history(item.recordId)).toHaveLength(0);
  });
  it('chống ghi đè và ghi lặp, giữ phần thành công của batch', async () => {
    const [a, b] = createDemoItems(2);
    const repo = new MockRepository([a, b]);
    const first = updateDraft(a, undefined, { content: 'Lượt một' })!;
    expect((await repo.save([first]))[0].ok).toBe(true);
    expect((await repo.save([first]))[0].ok).toBe(true);
    expect(await repo.history(a.recordId)).toHaveLength(1);
    const stale = updateDraft(a, undefined, { note: 'Nháp cũ' })!;
    const fresh = updateDraft(b, undefined, { note: 'Dòng B' })!;
    const result = await repo.save([stale, fresh]);
    expect(result[0].error).toBe('CONFLICT');
    expect(result[1].ok).toBe(true);
    const current = await repo.list();
    expect(current[0].content).toBe('Lượt một');
    expect(current[1].note).toBe('Dòng B');
  });
  it('không chấp nhận nội dung rỗng hoặc metadata từ patch', async () => {
    const a = createDemoItems(1)[0];
    const repo = new MockRepository([a]);
    const draft = updateDraft(a, undefined, { content: '  ' })!;
    expect((await repo.save([draft]))[0].error).toBe('VALIDATION');
    const invalid = { ...draft, changes: { revision: 100 } };
    expect((await repo.save([invalid as typeof draft]))[0].error).toBe('VALIDATION');
    expect((await repo.list())[0].revision).toBe(1);
  });
});
