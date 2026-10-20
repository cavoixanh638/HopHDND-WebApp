import {renderToStaticMarkup} from 'react-dom/server';
import {ColumnHeader} from '../src/features/items/ColumnHeader';
import {describe,it,expect,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {ColumnFilterCell,filterChoices,filterValue} from '../src/features/items/ColumnFilterCell';
import {matchesColumnFilters} from '../src/data/list-views';
const items=createDemoItems(3);
describe('always-visible column filter row',()=>{
  it('uses a search input for long free text columns and a select for concise categories',()=>{
    const text=ColumnFilterCell({field:'content',label:'Nội dung',items,value:'',onChange:vi.fn()});
    const search=text.props.children.props.children[0];
    expect(search.type).toBe('input');
    expect(search.props['aria-label']).toBe('Tìm kiếm cột Nội dung');
    expect(search.props.placeholder).toBe('Tìm kiếm');
    const compact=ColumnFilterCell({field:'displayCode',label:'ID',items,value:'',onChange:vi.fn()});
    expect(compact.props.className).toContain('compact-filter');
    expect(compact.props.children.props.children[0].props.placeholder).toBe('');
    const ordinal=ColumnFilterCell({field:'stt',label:'STT',items,value:'',onChange:vi.fn()});
    expect(ordinal.props.children.props.children[0].props.placeholder).toBe('');
    expect(filterChoices(items,'content')).toBeNull();
    const drop=ColumnFilterCell({field:'isDropped',label:'Rút',items,value:'',onChange:vi.fn()});
    const selector=drop.props.children.props.children[0];
    expect(selector.type).toBe('select');
    expect(selector.props.children[0].props.children).toBe('Chọn để lọc');
    expect(filterChoices(items,'isDropped')).toEqual(['Đã rút']);
  });
  it('ignores an obsolete Rút saved filter since the current A–O source no longer includes it',()=>{
    const a=items[0];
    expect(filterValue({...a,isDropped:false,archivedAt:''},'isDropped')).toBe('');
    expect(filterValue({...a,isDropped:true,archivedAt:''},'isDropped')).toBe('Đã rút');
    expect(matchesColumnFilters({...a,isDropped:true,archivedAt:''},{isDropped:'Đã rút'})).toBe(true);
    expect(matchesColumnFilters({...a,isDropped:false,archivedAt:''},{isDropped:'Đã rút'})).toBe(true);
  });
  it('reset button removes one column filter without modifying other filter values',()=>{
    const change=vi.fn();
    const element=ColumnFilterCell({field:'content',label:'Nội dung',items,value:'test',onChange:change});
    const clear=element.props.children.props.children[1];
    expect(clear.props['aria-label']).toBe('Xóa tìm kiếm cột Nội dung');
    clear.props.onClick();
    expect(change).toHaveBeenCalledWith('');
  });
});


describe('sort icon only for edit-mode columns',()=>{
  it('suppresses sort indicator when disabled by the caller',()=>{
    const read=renderToStaticMarkup(<ColumnHeader columnKey="room" disabled onMove={()=>{}}>Phòng</ColumnHeader>);
    expect(read).not.toContain('column-sort-button');
    expect(read).not.toContain('Bấm tiêu đề để sắp xếp');
    const edit=renderToStaticMarkup(<ColumnHeader columnKey="room" onSort={()=>{}} onMove={()=>{}}>Phòng</ColumnHeader>);
    expect(edit).toContain('column-sort-button');
  });
});
