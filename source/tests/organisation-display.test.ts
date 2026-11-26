import {describe,it,expect} from 'vitest';
import uiPresentation from '../src/presentation/ui-presentation.json';
import {displayOrganisationName,organisationSearchText,resolveOrganisationAlias} from '../src/domain/organisation-display';
import {statusDisplayValue,statusReadOnlyValue,statusFilterText,statusEditSelection} from '../src/features/items/status-display';
import {filterToolbarRows,exactChoices,newToolbarState} from '../src/features/items/list-toolbar-filters';
import {createDemoItems} from '../src/data/demo-items';
import {aggregateReport,DEFAULT_REPORTS} from '../src/domain/reporting';

describe('Organisation display aliases',()=>{
  it('projects only configured fields and exact source strings, independently of current wording',()=>{
    const original='Tên tổ chức thử nghiệm';
    const aliases=[{fields:['department','room'],source:original,label:'TCTN'}];
    expect(resolveOrganisationAlias('department',original,aliases)).toBe('TCTN');
    expect(resolveOrganisationAlias('room',original,aliases)).toBe('TCTN');
    expect(resolveOrganisationAlias('content',original,aliases)).toBe(original);
    expect(resolveOrganisationAlias('department',original+' khác',aliases)).toBe(original+' khác');
    expect(resolveOrganisationAlias('department',original,[])).toBe(original);
    expect(statusDisplayValue('department',original)).toBe(original);
    expect(statusEditSelection('department',original,original)).toBeNull();
  });
  it('renders each configured label while preserving editable values, exact filters, report identities and both search forms',()=>{
    for(const alias of uiPresentation.organisationAliases){
      for(const field of alias.fields as ('department'|'room')[]){
        expect(displayOrganisationName(field,alias.source)).toBe(alias.label);
        expect(displayOrganisationName('content',alias.source)).toBe(alias.source);
        expect(statusReadOnlyValue(field,alias.source)).toBe(alias.label);
        expect(statusDisplayValue(field,alias.source)).toBe(alias.source);
        expect(statusEditSelection(field,alias.source,alias.source)).toBeNull();
        expect(statusFilterText(field,alias.source)).toContain(alias.label);
        expect(organisationSearchText(field,alias.source)).toContain(alias.source);
        const target={...createDemoItems(1)[0],[field]:alias.source};
        const rows=[target];
        expect(exactChoices(rows,field)).toContain(alias.source);
        expect(filterToolbarRows(rows,{...newToolbarState(),[field]:alias.source})).toEqual(rows);
        for(const search of [alias.source,alias.label,alias.label.toLocaleLowerCase('vi')]){
          expect(filterToolbarRows(rows,{...newToolbarState(),search})).toEqual(rows);
          expect(filterToolbarRows(rows,{...newToolbarState(),search,field})).toEqual(rows);
        }
        const report=aggregateReport(rows,{...DEFAULT_REPORTS[0],source:'all',includeNotRequired:true},field);
        expect(report.rows.has(alias.source)).toBe(true);
        if(alias.label!==alias.source)expect(report.rows.has(alias.label)).toBe(false);
        expect(target[field]).toBe(alias.source);
      }
    }
  });
});
