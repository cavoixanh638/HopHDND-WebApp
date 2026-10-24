import {searchMatchRanges} from '../../domain/search';

/** Marks all occurrences visually while preserving the exact source text.
 * Only use for display text; never insert markup into editable input values. */
export function SearchHighlight({value,query}:{value:string;query?:string}){
  if(!query?.trim())return <>{value}</>;
  const ranges=searchMatchRanges(value,query);
  if(!ranges.length)return <>{value}</>;
  let cursor=0;
  const fragments:Array<string|ReturnType<typeof renderMark>>=[];
  function renderMark(part:string,index:number){
    return <mark key={index} className="item-search-match">{part}</mark>;
  }
  ranges.forEach(({start,end},index)=>{
    if(start>cursor)fragments.push(value.slice(cursor,start));
    fragments.push(renderMark(value.slice(start,end),index));
    cursor=end;
  });
  if(cursor<value.length)fragments.push(value.slice(cursor));
  return <>{fragments}</>;
}
