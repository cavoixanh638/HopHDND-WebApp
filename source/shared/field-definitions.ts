import type { GroupField, StatusField, TextField } from './types';

export const TEXT_FIELDS: readonly { key: TextField; label: string; editor: 'text' | 'textarea' | 'select' }[] = [
  { key: 'content', label: 'Nội dung trình', editor: 'textarea' },
  { key: 'department', label: 'Sở, ngành chủ trì', editor: 'select' },
  { key: 'type', label: 'Loại VB (HC/QPPL/BC)', editor: 'select' },
  { key: 'partyLevel', label: 'Cấp Thành ủy cho ý kiến', editor: 'select' },
  { key: 'progressParty', label: 'Tiến độ xin ý kiến Thành ủy', editor: 'select' },
  { key: 'progressBuild', label: 'Tiến độ trình HĐND xây dựng NQ', editor: 'select' },
  { key: 'progressCouncil', label: 'Tiến độ trình HĐND ban hành NQ/BC', editor: 'select' },
  { key: 'specialist', label: 'Chuyên viên VPUB', editor: 'select' },
  { key: 'room', label: 'Phòng chuyên môn', editor: 'select' },
  { key: 'vpLeader', label: 'Lãnh đạo VP', editor: 'select' },
  { key: 'ubndLeader', label: 'Lãnh đạo UBND TP', editor: 'select' },
  { key: 'specificProgress', label: 'Tiến độ hiện tại', editor: 'select' },
  { key: 'note', label: 'Ghi chú', editor: 'textarea' },
];

export const GROUP_OPTIONS: readonly { key: GroupField; label: string }[] = [
  { key: 'department', label: 'Sở, ngành chủ trì' },
  { key: 'room', label: 'Phòng chuyên môn' },
  { key: 'vpLeader', label: 'Lãnh đạo VP' },
  { key: 'ubndLeader', label: 'Lãnh đạo UBND TP' },
];

export const STATUS_OPTIONS: Record<StatusField, string[]> = {
  progressParty: ['Sở chưa trình', 'VP đang thực hiện', 'Đã gửi ĐU', 'ĐU đã gửi TU chưa họp', 'Đã họp chưa có TBKL', 'Đã báo cáo TU', 'Không phải xin ý kiến', 'Sở xin rút'],
  progressBuild: ['Không phải trình xây dựng NQ', 'Trình xây dựng NQ', 'Đã trình HĐND chưa có QĐ', 'Đã có QĐ chấp thuận'],
  progressCouncil: ['Sở chưa trình', 'VP đang thực hiện', 'Đã trình HĐND', 'Hoàn thành', 'Sở xin rút'],
};

