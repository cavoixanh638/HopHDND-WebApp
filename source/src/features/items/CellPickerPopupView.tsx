import type {KeyboardEvent,RefObject} from 'react';

/**
 * PRESENTATION-ONLY boundary for CellPicker.
 *
 * This file renders existing options and forwards user interaction to guarded
 * handlers owned by CellPicker.tsx. It must not import edit/session managers,
 * mutate data, perform I/O, or introduce new selectable values. Keeping this
 * narrow allows UI refinements to be released automatically without granting
 * the same privilege to the lease/CAS/permission path in CellPicker.tsx.
 */
export type PickerVisualOption={value:string;label:string};

export type CellPickerPopupViewProps={
  label:string;
  value:string;
  query:string;
  options:readonly PickerVisualOption[];
  searchable:boolean;
  department:boolean;
  waiting:boolean;
  selectedIsFilteredOut:boolean;
  popoverRef:RefObject<HTMLDivElement|null>;
  searchRef:RefObject<HTMLInputElement|null>;
  optionRefs:RefObject<Array<HTMLButtonElement|null>>;
  onBlur:()=>void;
  onQueryChange:(value:string)=>void;
  onQueryKeyDown:(event:KeyboardEvent<HTMLInputElement>)=>void;
  onChoose:(value:string)=>void;
  onOptionKeyDown:(event:KeyboardEvent<HTMLButtonElement>,index:number,value:string)=>void;
};

export function CellPickerPopupView({
  label,value,query,options,searchable,department,waiting,selectedIsFilteredOut,
  popoverRef,searchRef,optionRefs,onBlur,onQueryChange,onQueryKeyDown,onChoose,onOptionKeyDown,
}:CellPickerPopupViewProps){
  return <div
    ref={popoverRef}
    className="cell-picker-popover"
    data-choices-only={!searchable ? 'true' : undefined}
    popover="manual"
    role="dialog"
    aria-busy={waiting}
    aria-label={label}
    onBlur={onBlur}
  >
    {searchable&&<label className="cell-picker-search">
      {department?'Tìm Sở, ngành':'Tìm lựa chọn'}
      <input
        ref={searchRef}
        type="search"
        value={query}
        onChange={event=>onQueryChange(event.target.value)}
        onKeyDown={onQueryKeyDown}
        placeholder={department?'Tìm tên Sở, ngành (không dấu)':'Nhập để lọc'}
      />
    </label>}
    <div className="cell-picker-options" role="listbox" aria-label={label}>
      {options.map((option,index)=>(
        <button
          key={`${option.value}:${index}`}
          ref={element=>{optionRefs.current[index]=element;}}
          type="button"
          role="option"
          disabled={waiting}
          aria-disabled={waiting}
          aria-selected={value===option.value}
          data-picker-aux={option.value===''||(selectedIsFilteredOut&&option.value===value)?'true':undefined}
          className="cell-picker-option"
          onClick={()=>onChoose(option.value)}
          onKeyDown={event=>onOptionKeyDown(event,index,option.value)}
        >{option.label}</button>
      ))}
      {!options.length&&<p className="cell-picker-empty">Không có lựa chọn phù hợp.</p>}
    </div>
  </div>;
}
