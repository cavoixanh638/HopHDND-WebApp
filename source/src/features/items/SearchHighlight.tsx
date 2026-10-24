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
    // Numeric/short word hits must stay in one piece. A matching "254" must
    // never become "25" on one line and "4" on the next. Longer phrases may
    // wrap naturally; none of these spans may alter the original source text.
    const atomic=/^\S{1,24}$/u.test(part);
    return <mark key={index} className={'item-search-match'+(atomic?' item-search-match-atomic':'')}>{part}</mark>;
  }
  ranges.forEach(({start,end},index)=>{
    if(start>cursor)fragments.push(value.slice(cursor,start));
    fragments.push(renderMark(value.slice(start,end),index));
    cursor=end;
  });
  if(cursor<value.length)fragments.push(value.slice(cursor));
  return <>{fragments}</>;
}
