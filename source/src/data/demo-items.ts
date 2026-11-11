import type { Item } from '../../shared/types';

const assignments = [
  { department: 'Sở mẫu A', room: 'Phòng mẫu 1', specialist: 'Chuyên viên mẫu A' },
  { department: 'Sở mẫu B', room: 'Phòng mẫu 2', specialist: 'Chuyên viên mẫu B' },
  { department: 'Sở mẫu C', room: 'Phòng mẫu 3', specialist: 'Chuyên viên mẫu C' },
  { department: 'Đơn vị mẫu D', room: 'Phòng mẫu 1', specialist: 'Chuyên viên mẫu D' },
];
const councilStatuses = ['Sở chưa trình', 'VP đang xử lý', 'Hoàn thành'];
const partyStatuses = ['Sở chưa trình', 'VP đang xử lý', 'Đã gửi ĐU', 'ĐU gửi TU, chưa họp', 'Đã xin ý kiến, chờ TBKL', 'Đã có TBKL'];
const contents = {
  nq: [
  'MẪU: Quy định chính sách hỗ trợ phát triển sản xuất nông nghiệp tại địa phương.',
  'MẪU: Điều chỉnh kế hoạch đầu tư công trung hạn từ nguồn ngân sách địa phương.',
  'MẪU: Ban hành quy định mức chi cho công tác đào tạo, bồi dưỡng cán bộ.',
  ],
  bc: [
  'MẪU: Báo cáo kết quả thực hiện nhiệm vụ phát triển kinh tế - xã hội quý gần nhất.',
  'MẪU: Báo cáo tình hình giải quyết kiến nghị của cử tri trước kỳ họp.',
  'MẪU: Tổng hợp tình hình thực hiện các chương trình mục tiêu trên địa bàn.',
  ],
};

/** Synthetic default data uses ONLY the current four official status menus.
 * Legacy/ambiguous source samples belong in named regression fixtures, not here.
 * Retain each original ordinal/phase cycle so count, IDs, and filters do not shift.
 */
export function createDemoItems(count = 24): Item[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => {
    const ordinal = index + 1;
    const isReport = ordinal % 3 === 0;
    const dropped = ordinal % 8 === 0;
    const assignment = assignments[(ordinal - 1) % assignments.length];
    return {
      recordId: `demo-${String(ordinal).padStart(4, '0')}`,
      displayCode: `${isReport ? 'BC' : 'NQ'}-MẪU-${String(ordinal).padStart(3, '0')}`,
      stt: ordinal,
      documentKind: isReport ? 'BC' : 'NQ',
      content: contents[isReport ? 'bc' : 'nq'][Math.floor((ordinal - 1) / (isReport ? 3 : 1)) % (isReport ? contents.bc.length : contents.nq.length)],
      department: assignment.department,
      type: isReport ? 'Báo cáo' : ordinal % 2 ? 'QPPL' : 'HC',
      partyLevel: ordinal % 5 === 0 ? 'Không phải trình' : ['BCH', 'BTV TU', 'TTTU'][(ordinal - 1) % 3],
      progressParty: ordinal % 5 === 0 ? 'Không phải trình' : partyStatuses[(ordinal - 1) % partyStatuses.length],
      progressBuild: isReport || ordinal % 2 === 0 ? 'Không phải trình' :
        ['Không phải trình', 'Sở chưa trình', 'VP đang xử lý', 'Đã trình, chờ QĐ', 'Đã có QĐ'][(ordinal - 1) % 4],
      progressCouncil: councilStatuses[(ordinal - 1) % councilStatuses.length],
      specialist: assignment.specialist,
      room: assignment.room,
      vpLeader: `Lãnh đạo mẫu ${((ordinal - 1) % 3) + 1}`,
      ubndLeader: `Lãnh đạo mẫu ${((ordinal - 1) % 4) + 1}`,
      specificProgress: `MẪU: Đang xử lý bước ${((ordinal - 1) % 4) + 1}`,
      note: ordinal % 7 === 0 ? 'MẪU: Cần rà soát hồ sơ trước khi trình.' : 'MẪU: Dữ liệu minh họa.',
      isDropped: dropped,
      archivedAt: ordinal === 23 ? '2025-01-15T08:00:00.000Z' : null,
      revision: 1,
    };
  });
}
