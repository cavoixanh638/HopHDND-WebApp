/**
 * Forward a click on the empty area of ONE editable List-table cell to its
 * inner editor. Never forward clicks from existing interactive descendants,
 * locked/read-only cells or merged cells containing multiple editors.
 * Inner editors keep their own permission and saving logic.
 */
export function activateEditableCell(event:{
  currentTarget:HTMLTableCellElement;target:EventTarget|null;
}):void{
  const cell=event.currentTarget;
  if(!cell.classList.contains('editable-cell'))return;
  const target=event.target;
  if(!(target instanceof Element))return;
  // A real click on a control must not be forwarded twice (or hijack history).
  if(target.closest('button,input,textarea,select,a,[role="button"],[contenteditable="true"]'))return;
  const controls=[...cell.querySelectorAll<HTMLButtonElement|HTMLInputElement>(
    'button.cell-picker-trigger,button.inline-note-trigger,button.content-button,input.custom-cell-input'
  )].filter(control=>!control.disabled);
  // Combined cells may contain two editors; guessing one could modify wrong data.
  if(controls.length!==1)return;
  const control=controls[0];
  if(control instanceof HTMLInputElement){control.focus();return;}
  control.click();
}
