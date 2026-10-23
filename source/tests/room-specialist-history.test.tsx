import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {RoomSpecialistFilterCell} from '../src/features/items/RoomSpecialistFilterCell';
import {NOTE_HISTORY_DEMO,HistoryDialog} from '../src/features/history/HistoryDialog';
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
    expect(html).toContain('aria-label="Tìm kiếm tên CV"');
    expect(html).toContain('value="Nguyễn Ngọc"');
    expect(html).toContain('value="Phòng Kinh tế"');
    expect(html).toContain('room-specialist-filter-stack');
    expect(html.match(/item-filter-input-wrap/g)).toHaveLength(2);
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
    expect(html).not.toContain('giả định là lịch sử đã lưu');
  });
});
