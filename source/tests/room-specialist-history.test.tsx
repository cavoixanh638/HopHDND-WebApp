import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {RoomSpecialistFilterCell} from '../src/features/items/RoomSpecialistFilterCell';
import {NOTE_HISTORY_DEMO,HistoryDialog,historyForField} from '../src/features/history/HistoryDialog';
import {createDemoItems} from '../src/data/demo-items';
import type {Repository} from '../src/data/repository';

describe('Phòng/CV merged search and illustrative Ghi chú history',()=>{
  it('has both independent stacked controls, with full name search and room dropdown',()=>{
    const item={...createDemoItems(1)[0],room:'Phòng Kinh tế',specialist:'Nguyễn Ngọc Hùng'};
    const html=renderToStaticMarkup(<table><thead><tr>
      <RoomSpecialistFilterCell items={[item]} room="Phòng Kinh tế" person="Nguyễn Ngọc"
        onRoom={()=>{}} onPerson={()=>{}}/>
    </tr></thead></table>);
    expect(html).toContain('aria-label="Lọc theo Phòng"');
    expect(html).toContain('>Lọc theo Phòng</option>');
    expect(html).toContain('aria-label="Tìm kiếm tên CV"');
    expect(html).toContain('value="Nguyễn Ngọc"');
    expect(html).toContain('value="Phòng Kinh tế"');
    expect(html).toContain('room-specialist-filter-stack');
    expect(html.match(/item-filter-input-wrap/g)).toHaveLength(2);
  });
  it('returns ALL real field edits newest first, without unrelated columns',()=>{
    const base={recordId:'sample',changes:{note:'A'},oldValues:{note:'X'}};
    const entries=[
      {...base,operationId:'old',at:'2026-10-01T00:00:00Z'},
      {...base,operationId:'new',at:'2026-10-03T00:00:00Z',changes:{note:'C'}},
      {...base,operationId:'other',at:'2026-10-02T00:00:00Z',changes:{room:'P'}},
    ];
    expect(historyForField(entries,'note').map(e=>e.operationId)).toEqual(['new','old']);
    expect(historyForField(entries,'specificProgress')).toEqual([]);
  });
  it('has exactly three dated demo values and labels them separately from real audit',()=>{
    expect(NOTE_HISTORY_DEMO).toHaveLength(3);
    expect(new Set(NOTE_HISTORY_DEMO.map(e=>e.at)).size).toBe(3);
    expect(new Set(NOTE_HISTORY_DEMO.map(e=>e.value)).size).toBe(3);
    expect(NOTE_HISTORY_DEMO.every(e=>!Number.isNaN(Date.parse(e.at)))).toBe(true);
    const item=createDemoItems(1)[0];
    const repo={history:async()=>[],list:async()=>[],save:async()=>[]} as Repository;
    const html=renderToStaticMarkup(<HistoryDialog item={item} field="note"
      repository={repo} onClose={()=>{}}/>);
    expect(html).toContain('DỮ LIỆU DEMO');
    expect(html).toContain('Ba lần sửa ghi chú minh họa');
    for(const e of NOTE_HISTORY_DEMO)expect(html).toContain(e.value);
    expect(html).toContain('không phải lịch sử thật');
    expect(html).not.toMatch(/Lần\\s+[123]\\s*[·:]/);
    expect(html.indexOf(NOTE_HISTORY_DEMO[2].value)).toBeLessThan(html.indexOf(NOTE_HISTORY_DEMO[0].value));
    expect(html).toContain('history-timestamp');
    expect(html).toContain('history-change-content');
    expect(html).not.toContain('giả định là lịch sử đã lưu');
  });
});
