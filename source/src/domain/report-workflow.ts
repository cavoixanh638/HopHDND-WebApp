import type {ReportConfig} from '../../shared/types';
import {normalizeSearch} from './search';

export type ReportStage='source'|'office'|'next'|'completed'|'withdrawn'|'other';
/** Presentation only. No SLA/deadline can be inferred from these status labels. */
export function reportStage(label:string,config:ReportConfig):ReportStage{
  const value=normalizeSearch(label);
  if(value===normalizeSearch('Sở chưa trình'))return 'source';
  if(value===normalizeSearch('VP đang thực hiện'))return 'office';
  if(value===normalizeSearch('Sở xin rút'))return 'withdrawn';
  if(config.completed.some(status=>normalizeSearch(status)===value))return 'completed';
  if(config.columns.some(status=>normalizeSearch(status)===value))return 'next';
  return 'other';
}
export const reportStageLabels:Record<ReportStage,string>={
  source:'Sở chưa trình',office:'Văn phòng đang thực hiện',
  next:'Bước tiếp theo',completed:'Đã hoàn thành',withdrawn:'Đề nghị rút',
  other:'Chưa khớp danh mục'
};
