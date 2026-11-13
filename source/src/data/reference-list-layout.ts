/** Explicit administrator-approved display preset matching the RAM-only demo.
 * This transforms ItemLayout only; never records, permissions or history.
 * Call it ONLY after confirmation and persist through the existing Firebase CAS.
 */
import {defaultItemLayout,validateItemLayout} from './item-preferences';
import type {ItemLayout} from './item-preferences';

export function createReferenceListLayout(baseline:ItemLayout):ItemLayout {
  const current=validateItemLayout(baseline);
  const canonical=defaultItemLayout();
  const existing=new Map(current.columns.map(column=>[column.key,column]));
  const defaultKeys=new Set(canonical.columns.map(column=>column.key));
  const standardColumns=canonical.columns.map(column=>{
    const saved=existing.get(column.key);
    // Reset only visible source-column order and width. Keep any renamed labels,
    // field types, custom display metadata, validation options and cell values.
    return saved
      ?{...saved,width:column.width,visible:true,removed:false}
      :{...column,visible:true};
  });
  const customColumns=current.columns.filter(column=>!defaultKeys.has(column.key))
    .map(column=>({...column}));
  return validateItemLayout({
    ...current,
    columns:[...standardColumns,...customColumns],
    tableWidth:canonical.tableWidth,
    frameWidth:'auto',
    summaryCards:{party:true,build:true,nq:true},
    compactDisplay:{...canonical.compactDisplay,
      contentDetails:true,partyTogether:true,councilTogether:true,
      teamTogether:true,shortLeaders:true,shortSpecialist:true},
    partyGroupWidths:{...canonical.partyGroupWidths},
    partyTrackWidths:{
      readonly:{...canonical.partyTrackWidths!.readonly},
      editable:{...canonical.partyTrackWidths!.editable},
    },
  });
}

/** Read-only comparison of the persisted shared layout against the approved
 * visual preset. No Firebase writes and no business data comparison. */
export function referenceListLayoutNeedsSync(source:ItemLayout):boolean{
  const selected=validateItemLayout(source),target=createReferenceListLayout(selected);
  const signature=(layout:ItemLayout)=>JSON.stringify({
    columns:layout.columns.map(col=>[col.key,col.width,col.visible,col.removed??false]),
    tableWidth:layout.tableWidth,
    frameWidth:layout.frameWidth,
    summaryCards:[layout.summaryCards?.party,layout.summaryCards?.build,layout.summaryCards?.nq],
    compactDisplay:Object.entries(layout.compactDisplay??{}).sort(([a],[b])=>a.localeCompare(b)),
    partyGroupWidths:layout.partyGroupWidths,
    partyTrackWidths:layout.partyTrackWidths
  });
  return signature(selected)!==signature(target);
}
