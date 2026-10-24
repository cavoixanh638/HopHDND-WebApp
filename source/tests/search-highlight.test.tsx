import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {normalizeSearch,searchMatchRanges} from '../src/domain/search';
import {SearchHighlight} from '../src/features/items/SearchHighlight';

describe('Vietnamese search text highlighting',()=>{
  it('matches every accent-insensitive occurrence and preserves source punctuation',()=>{
    const source='Quy hoạch phân khu và QUY HOẠCH 1/500; quy hoach mở rộng';
    const ranges=searchMatchRanges(source,'quy hoach');
    expect(ranges.map(({start,end})=>source.slice(start,end)))
      .toEqual(['Quy hoạch','QUY HOẠCH','quy hoach']);
    expect(renderToStaticMarkup(<SearchHighlight value={source} query="quy hoach"/>))
      .toContain('<mark class="item-search-match">Quy hoạch</mark>');
  });
  it('preserves displayed text exactly, even when HTML-like content appears',()=>{
    const source='A <script>alert(1)</script> & Quy hoạch';
    const ranges=searchMatchRanges(source,'QUY HOẠCH');
    expect(ranges).toHaveLength(1);
    const html=renderToStaticMarkup(<SearchHighlight value={source} query="QUY HOẠCH"/>);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<mark class="item-search-match">Quy hoạch</mark>');
    expect(html).not.toContain('<script>');
    expect(renderToStaticMarkup(<SearchHighlight value={source} query="  "/>))
      .not.toContain('<mark');
  });
  it('handles Đ and decomposed Vietnamese combining marks',()=>{
    const text='Đất đai và đất đai'; // Contains intentionally decomposed letters
    expect(searchMatchRanges(text,'dat')).toHaveLength(2);
    expect(searchMatchRanges(text,'dat dai')).toHaveLength(2);
    expect(normalizeSearch('ĐẤT ĐAI')).toBe('dat dai');
  });
});
