import {describe,expect,it} from 'vitest';
import {shouldClearRoomSpecialistFilter} from './RoomSpecialistFilterCell';

describe('Room/CV compact filter Escape',()=>{
  it('clears an active Vietnamese room or specialist query',()=>{
    expect(shouldClearRoomSpecialistFilter('Escape','Phòng Tổng hợp')).toBe(true);
    expect(shouldClearRoomSpecialistFilter('Escape','Nguyễn Văn A')).toBe(true);
  });
  it('passes Escape through when the focused field is already empty',()=>{
    expect(shouldClearRoomSpecialistFilter('Escape','')).toBe(false);
    expect(shouldClearRoomSpecialistFilter('Enter','Phòng Tổng hợp')).toBe(false);
  });
});
