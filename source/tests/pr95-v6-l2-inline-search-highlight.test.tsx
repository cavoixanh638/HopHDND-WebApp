import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {SearchHighlight} from '../src/features/items/SearchHighlight';
import {searchMatchRanges,normalizeSearch} from '../src/domain/search';

const source='MẪU: Điều chỉnh kế hoạch đầu tư công trung hạn từ nguồn ngân sách địa phương.';
const html=(value:string,query?:string)=>renderToStaticMarkup(<SearchHighlight value={value} query={query}/>);
const textWithoutTags=(markup:string)=>markup.replace(/<[^>]*>/g,'');

describe('UI V6 L2 — inline text identity, not anonymous flex/grid fragments',()=>{
  it('renders EXACTLY one top-level text-flow element in all query states',()=>{
    for(const query of [undefined,'','  ','không có','ngân sách','ngan sach']){
      const output=html(source,query);
      expect(output.startsWith('<span class="item-search-flow">')).toBe(true);
      expect(output.endsWith('</span>')).toBe(true);
      expect(textWithoutTags(output)).toBe(source);
      expect((output.match(/class="item-search-flow"/g)??[])).toHaveLength(1);
    }
  });
  it('Vietnamese accented/ASCII queries preserve exactly the same source offsets and text',()=>{
    for(const q of ['ngân sách','ngan sach','NGAN SACH']){
      const ranges=searchMatchRanges(source,q);
      expect(ranges).toHaveLength(1);
      expect(ranges.map(x=>source.slice(x.start,x.end))).toEqual(['ngân sách']);
      const output=html(source,q);
      expect(output).toContain('<mark class="item-search-match">ngân sách</mark>');
      expect(textWithoutTags(output)).toBe(source);
      expect(output).not.toContain('<div');
    }
  });
  it('preserves multiple matches, partial-word matches and whitespace without HTML injection',()=>{
    const value='Ngân sách và ngân sách\tở địa phương ngân sách.';
    const ranges=searchMatchRanges(value,'ngan sach');
    expect(ranges.map(x=>value.slice(x.start,x.end))).toEqual(['Ngân sách','ngân sách','ngân sách']);
    const output=html(value,'ngan sach');
    expect((output.match(/<mark /g)??[])).toHaveLength(3);
    expect(textWithoutTags(output)).toBe(value);
    const mid=html('kinhphí ngân sách','sách');
    expect(mid).toContain('<mark class="item-search-match item-search-match-atomic">sách</mark>');
    expect(textWithoutTags(mid)).toBe('kinhphí ngân sách');
    const malicious=html('Đầu tư <script>alert(1)</script> ngân sách','ngan sach');
    expect(malicious).toContain('&lt;script&gt;');
    expect(malicious).not.toContain('<script>');
  });
  it('does not split a partially highlighted 254 into separate breakable inline items',()=>{
    const numeric='Nghị quyết số 254 về ngân sách';
    expect(searchMatchRanges(numeric,'25').map(x=>numeric.slice(x.start,x.end))).toEqual(['25']);
    const output=html(numeric,'25');
    expect(output).toContain('<span class="item-search-number"><mark class="item-search-match item-search-match-atomic">25</mark>4</span>');
    expect(textWithoutTags(output)).toBe(numeric);
    expect(html(numeric,'254')).toContain('<span class="item-search-number"><mark class="item-search-match item-search-match-atomic">254</mark></span>');
    // Do not make long words a giant no-wrap line.
    const longer=html('123456789012345678901234567890 ngân sách','ngân');
    expect(longer).not.toContain('item-search-number');
    expect(textWithoutTags(longer)).toBe('123456789012345678901234567890 ngân sách');
  });
  it('preserves decomposed NFD combining marks and source spaces as-is',()=>{
    const decomposed='Đất đai và nguồn ngân sách 254';
    const ranges=searchMatchRanges(decomposed,'ngan sach');
    expect(ranges).toHaveLength(1);
    const output=html(decomposed,'ngan sach');
    expect(textWithoutTags(output)).toBe(decomposed);
    expect(output).toContain(decomposed.slice(ranges[0].start,ranges[0].end));
    expect(normalizeSearch('NGÂN SÁCH')).toBe('ngan sach');
  });
  it('keeps raw input value, permissions and normalizer outside its display-only scope',()=>{
    const component=readFileSync(new URL('../src/features/items/SearchHighlight.tsx',import.meta.url),'utf8');
    const css=readFileSync(new URL('../src/features/items/search-highlight.css',import.meta.url),'utf8');
    expect(component).toContain('searchMatchRanges(value,query)');
    expect(component).not.toMatch(/dangerouslySetInnerHTML|innerHTML|\.normalize\(|onChange|onUpdate/);
    expect(css).toContain('.item-search-flow');
    expect(css).toContain('display:inline');
    expect(css).toContain('padding:0');
    expect(css).not.toMatch(/display:flex|display:grid|white-space:pre\b/);
  });
});
