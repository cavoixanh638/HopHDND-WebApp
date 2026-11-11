import type { GroupField, StatusField, TextField } from './types';

export const TEXT_FIELDS: readonly { key: TextField; label: string; editor: 'text' | 'textarea' | 'select' }[] = [
  { key: 'content', label: 'Nội dung trình', editor: 'textarea' },
  { key: 'department', label: 'Sở, ngành chủ trì', editor: 'select' },
  { key: 'type', label: 'Loại VB', editor: 'select' },
  { key: 'partyLevel', label: 'Cấp Thành ủy cho ý kiến', editor: 'select' },
  { key: 'progressParty', label: 'Tiến độ xin ý kiến Thành ủy', editor: 'select' },
  { key: 'progressBuild', label: 'Tiến độ trình HĐND xây dựng NQ', editor: 'select' },
  { key: 'progressCouncil', label: 'Tiến độ trình HĐND ban hành NQ/BC', editor: 'select' },
  { key: 'specialist', label: 'Chuyên viên VPUB', editor: 'select' },
  { key: 'room', label: 'Phòng chuyên môn', editor: 'select' },
  { key: 'vpLeader', label: 'Lãnh đạo VP', editor: 'select' },
  { key: 'ubndLeader', label: 'Lãnh đạo UBND TP', editor: 'select' },
  { key: 'specificProgress', label: 'Tiến độ hiện tại', editor: 'textarea' },
  { key: 'note', label: 'Ghi chú', editor: 'textarea' },
];

export const GROUP_OPTIONS: readonly { key: GroupField; label: string }[] = [
  { key: 'department', label: 'Sở, ngành chủ trì' },
  { key: 'room', label: 'Phòng chuyên môn' },
  { key: 'vpLeader', label: 'Lãnh đạo VP' },
  { key: 'ubndLeader', label: 'Lãnh đạo UBND TP' },
];

/** Official V3 menus. Stored Item fields retain their original text; the
 * domain status contract interprets recognized old values at read time only.
 * partyLevel is a catalog (not a StatusField or a new backend schema field).
 */
export const PARTY_LEVEL_OPTIONS:readonly string[]=[
  'TTTU','BTV TU','BCH','Không phải trình'
];
export const STATUS_OPTIONS: Record<StatusField, string[]> = {
  progressParty: [
    'Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU',
    'ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL'
  ],
  progressBuild: [
    'Không phải trình','Sở chưa trình','VP đang xử lý',
    'Đã trình, chờ QĐ','Đã có QĐ'
  ],
  progressCouncil: ['Sở chưa trình','VP đang xử lý','Hoàn thành'],
};

