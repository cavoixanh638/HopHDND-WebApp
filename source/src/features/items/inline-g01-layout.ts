import type {ItemLayout} from '../../data/item-preferences';
import {SUMMARY_CARD_KEYS, validateListTitle} from '../../data/item-preferences';

export type InlineSummaryStage = (typeof SUMMARY_CARD_KEYS)[number];

/** A visual hide only changes visible; it must never remove Excel mappings or data. */
export function canHideInlineColumn(layout:ItemLayout,key:string):boolean {
  const column=layout.columns.find(value=>value.key===key&&!value.removed);
  return !!column?.visible&&key!=='displayCode'&&
    layout.columns.filter(value=>value.visible&&!value.removed).length>1;
}

export function setInlineColumnVisibility(layout:ItemLayout,key:string,visible:boolean):ItemLayout {
  const column=layout.columns.find(value=>value.key===key&&!value.removed);
  if(!column)throw new Error('Không tìm thấy cột dữ liệu còn hiệu lực.');
  if(column.visible===visible)return layout;
  if(!visible&&!canHideInlineColumn(layout,key))
    throw new Error('Không được ẩn ID hoặc cột hiển thị cuối cùng.');
  return {...layout,columns:layout.columns.map(value=>value.key===key
    ?{...value,visible}:value)};
}

/** Keep the column key, source Excel mapping, order, width and per-cell values. */
export function renameInlineColumn(layout:ItemLayout,key:string,label:string):ItemLayout {
  const column=layout.columns.find(value=>value.key===key&&!value.removed);
  if(!column)throw new Error('Không tìm thấy cột cần đổi tên.');
  const normalized=validateListTitle(label);
  if(column.label===normalized)return layout;
  return {...layout,columns:layout.columns.map(value=>value.key===key
    ?{...value,label:normalized,renamed:true}:value)};
}

/** C00 is not part of the editable configuration, even for administrators. */
export function setInlineSummaryVisibility(layout:ItemLayout,key:InlineSummaryStage,visible:boolean):ItemLayout {
  if(!(SUMMARY_CARD_KEYS as readonly string[]).includes(key)||typeof visible!=='boolean')
    throw new Error('Chỉ được ẩn/hiện các thẻ C01, C02, C03.');
  return {...layout,summaryCards:{
    party:true,build:true,nq:true,...layout.summaryCards,[key]:visible
  }};
}
