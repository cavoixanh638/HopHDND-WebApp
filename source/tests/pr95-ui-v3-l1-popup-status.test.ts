import {describe,expect,it} from 'vitest';
import type {CatalogConfig} from '../src/data/catalogs';
import {popupFieldOptions} from '../src/features/reports/pr95-l1-popup-options';

function v3Catalog():CatalogConfig {
  return {options:{
    department:['Sở A'],type:['QPPL'],
    partyLevel:['TTTU','BTV TU','BCH','Không phải trình'],
    progressParty:['Không phải trình','Sở chưa trình','VP đang xử lý',
      'Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL'],
    progressBuild:['Không phải trình','Sở chưa trình','VP đang xử lý',
      'Đã trình, chờ QĐ','Đã có QĐ'],
    progressCouncil:['Sở chưa trình','VP đang xử lý','Hoàn thành'],
    specialist:['Nguyễn Văn A'],room:['Phòng A'],vpLeader:['Phó Chánh VP'],
    ubndLeader:['Phó Chủ tịch'],specificProgress:[]
  },specialistRooms:{}};
}

describe('UI V3 L1 R-V3-03 popup workflow choices',()=>{
  it('permits canonical Council completion from an unfinished source',()=>{
    const catalog=v3Catalog();
    const options=popupFieldOptions('progressCouncil','Sở chưa trình',catalog);
    expect(options).toEqual(['Sở chưa trình','VP đang xử lý','Hoàn thành']);
    expect(options).toContain('Hoàn thành');
    expect(options).not.toContain('Đã trình HĐND thành phố');
    expect(options).not.toContain('VP đang thực hiện');
    expect(options).not.toContain('');
  });
  it('keeps current legacy text as data, never a newly selectable old menu item',()=>{
    const catalog=v3Catalog();
    const raw='Đã trình HĐND thành phố';
    expect(popupFieldOptions('progressCouncil',raw,catalog)).toEqual(
      ['Sở chưa trình','VP đang xử lý','Hoàn thành']);
    expect(raw).toBe('Đã trình HĐND thành phố');
  });
  it('uses each V3 official menu, including PartyLevel, without aggregate labels',()=>{
    const catalog=v3Catalog();
    for(const key of ['partyLevel','progressParty','progressBuild','progressCouncil'] as const){
      const list=popupFieldOptions(key,'Sở chưa trình',catalog);
      expect(list).toEqual(catalog.options[key]);
      expect(list).not.toContain('Bước tiếp theo');
    }
  });
  it('keeps optional personnel field clear and current selections; does not expand grants',()=>{
    const catalog=v3Catalog();
    const options=popupFieldOptions('vpLeader','Lãnh đạo cũ',catalog);
    expect(options).toEqual(['','Phó Chánh VP','Lãnh đạo cũ']);
    // Selection permission remains guarded in ReportDetailGrid's onChange.
  });
  it('preserves a completion option even if no saved catalog was provided',()=>{
    const catalog=v3Catalog();
    catalog.options.progressCouncil=[];
    expect(popupFieldOptions('progressCouncil','Sở chưa trình',catalog))
      .toContain('Hoàn thành');
  });
});
