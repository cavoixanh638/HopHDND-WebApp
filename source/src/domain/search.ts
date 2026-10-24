import type { Item } from '../../shared/types';
import { displayId } from './display-id';

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export function createSearchIndex(items: Item[]): Map<string, string> {
  return new Map(items.map((item) => [
    item.recordId,
    normalizeSearch([item.displayCode, displayId(item), item.content, item.department, item.room, item.specialist].join(' ')),
  ]));
}

export function matchesSearch(item: Item, query: string, index: Map<string, string>): boolean {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  const searchable = index.get(item.recordId)
    ?? normalizeSearch([item.displayCode, displayId(item), item.content, item.department, item.room, item.specialist].join(' '));
  return searchable.includes(normalizedQuery);
}

/** UTF-16 offsets in the unmodified displayed text.  The normalized search
 * preserves spaces and maps decomposed Vietnamese marks back to their glyphs.
 * Highlighting never mutates the original text (or its edit value). */
export function searchMatchRanges(value:string,query:string):Array<{start:number;end:number}>{
  const needle=normalizeSearch(query);
  if(!needle||!value)return [];
  let haystack='';
  const starts:number[]=[],ends:number[]=[];
  for(let pos=0;pos<value.length;){
    const point=String.fromCodePoint(value.codePointAt(pos)!);
    const next=pos+point.length;
    const folded=point.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[đĐ]/g,'d').toLowerCase();
    for(let i=0;i<folded.length;i++){
      haystack+=folded[i];starts.push(pos);ends.push(next);
    }
    pos=next;
  }
  const found:Array<{start:number;end:number}>=[];
  let from=0;
  while(from<haystack.length){
    const at=haystack.indexOf(needle,from);
    if(at<0)break;
    found.push({start:starts[at],end:ends[at+needle.length-1]});
    from=at+needle.length;
  }
  return found;
}
