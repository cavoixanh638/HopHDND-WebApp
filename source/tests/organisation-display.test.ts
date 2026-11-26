import {describe,it,expect} from 'vitest';
import {displayOrganisationName,organisationSearchText} from '../src/domain/organisation-display';
import {statusDisplayValue,statusReadOnlyValue,statusFilterText,statusEditSelection} from '../src/features/items/status-display';
import {filterToolbarRows,exactChoices,newToolbarState} from '../src/features/items/list-toolbar-filters';
import {createDemoItems} from '../src/data/demo-items';
import {aggregateReport,DEFAULT_REPORTS} from '../src/domain/reporting';

const original='Các phòng thuộc VP UBND TP';
describe('VPUB TP display alias',()=>{
  it('changes only exact organisation labels, not editable values, status or notes',()=>{
    expect(displayOrganisationName('department',original)).toBe('VPUB TP');
    expect(displayOrganisationName('room',original)).toBe('VPUB TP');
    expect(displayOrganisationName('content',original)).toBe(original);
    expect(displayOrganisationName('department',original+' khác')).toBe(original+' khác');
    expect(statusReadOnlyValue('department',original)).toBe('VPUB TP');
    expect(statusDisplayValue('department',original)).toBe(original);
    expect(statusEditSelection('department',original,original)).toBeNull();
    expect(statusFilterText('department',original)).toContain('VPUB TP');
    expect(organisationSearchText('department',original)).toContain(original);
  });
  it('finds the short or original name while exact filter choices and report grouping retain the source key',()=>{
    const items=createDemoItems(2);
    const target={...items[0],department:original};
    const other={...items[1],department:'Sở mẫu khác'};
    const rows=[target,other];
    expect(exactChoices(rows,'department')).toContain(original);
    expect(filterToolbarRows(rows,{...newToolbarState(),department:original})).toEqual([target]);
    for(const search of [original,'VPUB TP','vpub tp']){
      expect(filterToolbarRows(rows,{...newToolbarState(),search})).toEqual([target]);
      expect(filterToolbarRows(rows,{...newToolbarState(),search,field:'department'})).toEqual([target]);
    }
    const report=aggregateReport(rows,{...DEFAULT_REPORTS[0],source:'all',includeNotRequired:true},'department');
    expect(report.rows.has(original)).toBe(true);
    expect(report.rows.has('VPUB TP')).toBe(false);
    expect(target.department).toBe(original);
  });
});
