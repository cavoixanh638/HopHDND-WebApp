import {searchMatchRanges} from '../../domain/search';
import './search-highlight.css';

/** Marks all occurrences visually while preserving the exact source text.
 * Only use for display text; never insert markup into editable input values. */
export function SearchHighlight({value,query}:{value:string;query?:string}){
  // A single element is essential: Fragment text/mark/text children become
  // separate anonymous flex/grid items in buttons and merged value controls.
  // Both highlighted and plain values must have the exact same formatting box.
  if(!query?.trim())return <span className="item-search-flow">{value}</span>;
  const ranges=searchMatchRanges(value,query);
  if(!ranges.length)return <span className="item-search-flow">{value}</span>;
  function renderMark(part:string,index:number){
    // Keep the *exact* searchMatchRanges offsets/substring; never normalize
    // source text just to make a highlighted mark fit a layout.
    const atomic=/^\S{1,24}$/u.test(part);
    return <mark key={index} className={'item-search-match'+(atomic?' item-search-match-atomic':'')}>{part}</mark>;
  }
  /** Split only at the ORIGINAL UTF-16 match ranges. A nested numeric token
   * can keep a partial hit like "25" and its remaining "4" together. */
  const renderPart=(start:number,end:number)=>{
    const nodes:Array<string|ReturnType<typeof renderMark>>=[];
    let cursor=start;
    ranges.forEach(({start:hitStart,end:hitEnd},index)=>{
      if(hitStart<start||hitEnd>end)return;
      if(hitStart>cursor)nodes.push(value.slice(cursor,hitStart));
      nodes.push(renderMark(value.slice(hitStart,hitEnd),index));
      cursor=hitEnd;
    });
    if(cursor<end)nodes.push(value.slice(cursor,end));
    return nodes;
  };
  const numericRuns=[...value.matchAll(/\p{N}+/gu)].map(match=>({
    start:match.index,end:match.index+match[0].length,
    codePoints:[...match[0]].length
  })).filter(run=>
    run.codePoints<=24 &&
    ranges.some(hit=>hit.start>=run.start&&hit.end<=run.end) &&
    !ranges.some(hit=>hit.start<run.end&&hit.end>run.start&&
      (hit.start<run.start||hit.end>run.end)));
  const fragments:Array<string|ReturnType<typeof renderMark>>=[];
  let cursor=0;
  for(const run of numericRuns){
    fragments.push(...renderPart(cursor,run.start));
    fragments.push(<span className="item-search-number" key={'number-'+run.start}>
      {renderPart(run.start,run.end)}
    </span>);
    cursor=run.end;
  }
  fragments.push(...renderPart(cursor,value.length));
  return <span className="item-search-flow">{fragments}</span>;
}
