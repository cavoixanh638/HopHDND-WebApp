import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CellPicker} from '../src/features/items/CellPicker';

/** A cleared content filter can bring ~60 rows × many editable fields back.
 * Their option lists must not be mounted before someone opens a picker. */
describe('lazy cell dropdown creation',()=>{
  it('renders only the triggers for sixty closed dropdowns, not 1800 hidden options',()=>{
    const choices=Array.from({length:30},(_,n)=>'Lựa chọn danh mục số '+n);
    const html=renderToStaticMarkup(<table><tbody>
      {Array.from({length:60},(_,i)=><tr key={i}><td>
        <CellPicker label={'Phòng '+i} value="" options={choices} onChange={()=>{}}/>
      </td></tr>)}
    </tbody></table>);
    expect(html.match(/class="cell-value-button cell-picker-trigger"/g)).toHaveLength(60);
    expect(html).not.toContain('cell-picker-popover');
    expect(html).not.toContain('class="cell-picker-option"');
    expect(html).not.toContain('Lựa chọn danh mục số');
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(60);
  });
  it('still renders the visible editable value and any yellow search match',()=>{
    const html=renderToStaticMarkup(<CellPicker
      label="Trạng thái" value="Đang thực hiện" highlightQuery="thuc hien"
      options={['Chưa trình','Đang thực hiện','Hoàn thành']} onChange={()=>{}}/>);
    expect(html).toContain('<mark class="item-search-match">thực hiện</mark>');
    expect(html).not.toContain('role="dialog"');
  });
});
