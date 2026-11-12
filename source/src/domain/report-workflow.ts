import type {ReportConfig} from '../../shared/types';
import {normalizeSearch} from './search';
import {canonicalStatus} from './status-contract';

export type ReportStage='source'|'office'|'next'|'completed'|'withdrawn'|'excluded'|'other';
/** Presentation only. No SLA/deadline can be inferred from these status labels. */
export function reportStage(label:string,config:ReportConfig):ReportStage{
  const value=normalizeSearch(canonicalStatus(config.statusField,label));
  if(value===normalizeSearch('Sở chưa trình'))return 'source';
  if(value===normalizeSearch('VP đang xử lý'))return 'office';
  if(value===normalizeSearch('Sở xin rút'))return 'withdrawn';
  if(['party','build'].includes(config.id)&&value===normalizeSearch('Không phải trình'))return 'excluded';
  if(config.completed.some(status=>normalizeSearch(canonicalStatus(config.statusField,status))===value))return 'completed';
  if(config.columns.some(status=>normalizeSearch(canonicalStatus(config.statusField,status))===value))return 'next';
  return 'other';
}
export const reportStageLabels:Record<ReportStage,string>={
  source:'Sở chưa trình',office:'Văn phòng đang thực hiện',
  next:'Bước tiếp theo',completed:'Đã hoàn thành',withdrawn:'Đề nghị rút',
  excluded:'Không phải trình',other:'Chưa khớp danh mục'
};
