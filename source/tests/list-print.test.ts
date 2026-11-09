import {describe,it,expect} from 'vitest';
import {LIST_A4_PRINT_CSS} from '../src/features/items/list-print';
describe('A4 print content contract',()=>{
  it('uses landscape A4 and only heading + copied visible table, no extra labels',()=>{
    expect(LIST_A4_PRINT_CSS).toContain('@page{size:A4 landscape;margin:8mm}');
    expect(LIST_A4_PRINT_CSS).toContain('thead{display:table-header-group}');
    expect(LIST_A4_PRINT_CSS).toContain('break-inside:avoid');
    expect(LIST_A4_PRINT_CSS).toContain('body[data-hdnd-a4-print="true"]>*:not(#hdnd-a4-print-root){display:none!important}');
    expect(LIST_A4_PRINT_CSS).not.toContain('Ngày in');
    expect(LIST_A4_PRINT_CSS).not.toContain('Trang số');
  });
});
