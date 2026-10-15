import { validateReportLayout, type ReportLayout } from './report-preferences';
export function validateReportDraft(value:unknown):ReportLayout[] {
  if (!Array.isArray(value) || value.some(row=> !row || typeof row.title !== 'string')) throw new Error('Nháp báo cáo không hợp lệ.');
  const safe=validateReportLayout(value.map(row=>({...row,title:row.title || '(Nháp chưa đặt tên)'})));
  return safe.map(row=>({...row,title:value.find(entry=>entry.id===row.id).title}));
}
