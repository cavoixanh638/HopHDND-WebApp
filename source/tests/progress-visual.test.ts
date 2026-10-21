import {describe,it,expect} from 'vitest';
import {progressTone} from '../src/domain/progress-visual';

describe('Workflow status visual groups are strict and accent insensitive',()=>{
  it.each([
    ['Sở chưa trình','not-submitted'],
    ['SỞ CHƯA TRÌNH','not-submitted'],
    ['VP đang thực hiện','office'],
    ['Đang ở Văn phòng','office'],
    ['Văn phòng đang thực hiện','office'],
    ['Hoàn thành','done'],
    ['Đã hoàn thành','done'],
  ] as const)('maps %s to %s only in workflow columns',(label,tone)=>{
    for(const field of ['progressParty','progressBuild','progressCouncil','specificProgress']){
      expect(progressTone(field,label)).toBe(tone);
    }
    expect(progressTone('content',label)).toBeNull();
    expect(progressTone('note',label)).toBeNull();
    expect(progressTone('department',label)).toBeNull();
  });
  it('does not treat intermediate steps or unrelated values as completion',()=>{
    for(const input of ['Đã trình HĐND thành phố','Đã trình HĐND, chưa có QĐ',
      'Đã có TBKL','Sở đang thực hiện','Không phải trình xây dựng NQ','']){
      expect(progressTone('progressCouncil',input)).toBeNull();
    }
  });
});
