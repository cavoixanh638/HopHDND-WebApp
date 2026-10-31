import type {SummarySelection,SummaryStage} from '../../domain/item-summary';
import {EXCEL_SOURCE_COLUMNS} from '../../data/item-preferences';
import {
  DETAIL_FIELDS,SEARCH_FIELDS,type ListKind,type ListToolbarState
} from './list-toolbar-filters';

/** UI-only inventory. IDs identify independent predicates, not stored records.
 * No user input is written into data, layout, Firebase or HTML markup. */
export type ActiveListCondition={
  id:string;
  category:'search'|'department'|'room'|'detail'|'kind'|'summary'|'column';
  label:string;
  value:string;
  key?:string;
};
export type ActiveListConditionsState={
  toolbar:ListToolbarState;
  columnFilters:Record<string,string>;
  kindSelection:ListKind|null;
  summarySelection:SummarySelection|null;
};
type ColumnLabel={key:string;label:string;origin?:string;removed?:boolean};
type InventoryOptions=ActiveListConditionsState&{
  columns:readonly ColumnLabel[];
  summaryStages?:readonly SummaryStage[];
};
const kindNames:Record<ListKind,string>={
  qppl:'NQ QPPL',hc:'NQ HC',bc:'BC',
  'nq-unknown':'NQ chưa phân loại','unclassified':'Chưa phân loại'
};
const officialLabels=new Map<string,string>(EXCEL_SOURCE_COLUMNS.map(column=>[column.key,column.label]));
const nonEmpty=(value:unknown)=>typeof value==='string'&&value.trim()!=='';

/** All effective filters, including saved state for physically hidden columns
 * and a collapsed "Lọc khác" panel. Search field alone is NOT a predicate. */
export function activeListConditions(options:InventoryOptions):ActiveListCondition[]{
  const {toolbar,columnFilters,kindSelection,summarySelection,columns,summaryStages}=options;
  const list:ActiveListCondition[]=[];
  if(nonEmpty(toolbar.search)){
    const field=SEARCH_FIELDS.find(item=>item.key===toolbar.field);
    const custom=columns.find(column=>column.key===toolbar.field&&!column.removed);
    const fieldLabel=field?.label??custom?.label??officialLabels.get(toolbar.field)??'Trường đã chọn';
    list.push({id:'search',category:'search',
      label:'Tìm kiếm · '+fieldLabel,value:toolbar.search.trim()});
  }
  if(nonEmpty(toolbar.department))list.push({
    id:'department',category:'department',label:'Sở, ngành',value:toolbar.department
  });
  if(nonEmpty(toolbar.room))list.push({
    id:'room',category:'room',label:'Phòng',value:toolbar.room
  });
  for(const field of DETAIL_FIELDS){
    const value=toolbar.details[field.key];
    if(nonEmpty(value))list.push({
      id:'detail:'+field.key,category:'detail',key:field.key,label:field.label,value
    });
  }
  if(kindSelection)list.push({
    id:'kind',category:'kind',label:'Loại VB',value:kindNames[kindSelection]
  });
  if(summarySelection){
    const report=summaryStages?.find(stage=>stage.id===summarySelection.report);
    const bucket=report?.buckets.find(entry=>entry.stage===summarySelection.stage);
    list.push({
      id:'summary',category:'summary',
      label:report?.title??'Trạng thái công đoạn',
      value:bucket?.label??summarySelection.stage
    });
  }
  const activeColumns=new Map(columns.filter(column=>!column.removed)
    .map(column=>[column.key,column.label]));
  for(const [key,value] of Object.entries(columnFilters)){
    if(!nonEmpty(value))continue;
    const label=activeColumns.get(key)??officialLabels.get(key);
    // Removed/unknown custom columns cannot actually filter any records.
    if(!label||!activeColumns.has(key))continue;
    list.push({
      id:'column:'+key,category:'column',key,label:'Cột · '+label,value:value.trim()
    });
  }
  return list;
}
/** The search scope inside "Lọc khác" is only active when a query exists. */
export function activeOtherFilterCount(toolbar:ListToolbarState):number{
  return DETAIL_FIELDS.filter(field=>nonEmpty(toolbar.details[field.key])).length+
    (nonEmpty(toolbar.search)&&toolbar.field!=='all'?1:0);
}

/** Pure transition, so each X deletes exactly ONE predicate. All non-target
 * fields preserve their identity and values (including hidden custom filters). */
export function removeActiveListCondition(
  state:ActiveListConditionsState,condition:Pick<ActiveListCondition,'category'|'key'>
):ActiveListConditionsState{
  switch(condition.category){
    case 'search':return {...state,toolbar:{...state.toolbar,search:''}};
    case 'department':return {...state,toolbar:{...state.toolbar,department:''}};
    case 'room':return {...state,toolbar:{...state.toolbar,room:''}};
    case 'detail': {
      if(!condition.key||!DETAIL_FIELDS.some(field=>field.key===condition.key))return state;
      return {...state,toolbar:{...state.toolbar,
        details:{...state.toolbar.details,[condition.key]:''}}};
    }
    case 'kind':return {...state,kindSelection:null};
    case 'summary':return {...state,summarySelection:null};
    case 'column':{
      if(!condition.key)return state;
      const filters={...state.columnFilters};
      delete filters[condition.key];
      return {...state,columnFilters:filters};
    }
  }
}
