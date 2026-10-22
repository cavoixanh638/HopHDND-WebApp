import {describe,it,expect} from 'vitest';
import {progressTone} from '../src/domain/progress-visual';

describe('Data table workflow colors agree with official report stages',()=>{
  it.each([
    ['Sở chưa trình','not-submitted'],
    ['SỞ CHƯA TRÌNH','not-submitted'],
    ['VP đang thực hiện','office'],
    ['Đang ở Văn phòng','office'],
    ['Văn phòng đang thực hiện','office'],
    ['Hoàn thành','done'],
    ['Đã hoàn thành','done'],
  ] as const)('maps %s to %s in workflow fields',(label,tone)=>{
    for(const field of ['progressParty','progressBuild','progressCouncil','specificProgress'])
      expect(progressTone(field,label)).toBe(tone);
    for(const field of ['content','note','department','vpLeader'])
      expect(progressTone(field,label)).toBeNull();
  });
  it('marks exact terminal or exempt statuses in their own column only',()=>{
    for(const label of ['Không phải xin ý kiến','Không xin ý kiến','Đã có TBKL']){
      expect(progressTone('progressParty',label)).toBe('done');
      expect(progressTone('progressBuild',label)).toBeNull();
      expect(progressTone('progressCouncil',label)).toBeNull();
    }
    for(const label of ['Không phải trình','Không phải trình xây dựng NQ','Đã có QĐ chấp thuận']){
      expect(progressTone('progressBuild',label)).toBe('done');
      expect(progressTone('progressParty',label)).toBeNull();
      expect(progressTone('progressCouncil',label)).toBeNull();
    }
    expect(progressTone('progressCouncil','Đã trình HĐND thành phố')).toBe('done');
    expect(progressTone('progressParty','Đã trình HĐND thành phố')).toBeNull();
    expect(progressTone('progressBuild','Đã trình HĐND thành phố')).toBeNull();
  });
  it('never highlights intermediate or irrelevant statuses',()=>{
    for(const val of ['Đã gửi ĐU','ĐU đã gửi TU, chưa họp',
      'Đã họp/xin phiếu, chưa có TBKL','Đã trình HĐND, chưa có QĐ',
      'Sở đang thực hiện','Không phải trình?', 'Hoàn thành bước dự thảo','']){
      for(const field of ['progressParty','progressBuild','progressCouncil','specificProgress'])
        expect(progressTone(field,val)).toBeNull();
    }
  });
});
