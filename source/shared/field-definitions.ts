import type { GroupField, StatusField, TextField } from './types';

export const TEXT_FIELDS: readonly { key: TextField; label: string; editor: 'text' | 'textarea' | 'select' }[] = [
  { key: 'content', label: 'Nội dung', editor: 'textarea' },
  { key: 'department', label: 'Sở/đơn vị', editor: 'select' },
  { key: 'type', label: 'Loại văn bản', editor: 'select' },
  { key: 'partyLevel', label: 'Cấp xin ý kiến', editor: 'select' },
  { key: 'progressParty', label: 'Tiến độ xin ý kiến', editor: 'select' },
  { key: 'progressBuild', label: 'Tiến độ xây dựng', editor: 'select' },
  { key: 'progressCouncil', label: 'Tiến độ trình HĐND', editor: 'select' },
  { key: 'specialist', label: 'Chuyên viên', editor: 'select' },
  { key: 'room', label: 'Phòng', editor: 'select' },
  { key: 'vpLeader', label: 'Lãnh đạo Văn phòng', editor: 'select' },
  { key: 'ubndLeader', label: 'Lãnh đạo UBND', editor: 'select' },
  { key: 'specificProgress', label: 'Tiến độ cụ thể', editor: 'select' },
  { key: 'note', label: 'Ghi chú', editor: 'textarea' },
];

export const GROUP_OPTIONS: readonly { key: GroupField; label: string }[] = [
  { key: 'department', label: 'Sở/đơn vị' },
  { key: 'room', label: 'Phòng' },
  { key: 'vpLeader', label: 'Lãnh đạo VP' },
  { key: 'ubndLeader', label: 'Lãnh đạo UBND' },
];

export const STATUS_OPTIONS: Record<StatusField, string[]> = {
  progressParty: ['Sở chưa trình', 'VP đang thực hiện', 'Đã gửi ĐU', 'ĐU đã gửi TU chưa họp', 'Đã họp chưa có TBKL', 'Đã báo cáo TU', 'Không phải xin ý kiến', 'Sở xin rút'],
  progressBuild: ['Không phải trình xây dựng NQ', 'Trình xây dựng NQ', 'Đã trình HĐND chưa có QĐ', 'Đã có QĐ chấp thuận'],
  progressCouncil: ['Sở chưa trình', 'VP đang thực hiện', 'Đã trình HĐND', 'Hoàn thành', 'Sở xin rút'],
};

