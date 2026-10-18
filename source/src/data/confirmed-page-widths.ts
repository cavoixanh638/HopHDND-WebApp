/** Only confirmed public presentation widths are cached. Never save Firebase
 * credentials, permissions, personal records, or the rest of the profile. */
export type SavedWidth='auto'|number;
export type ConfirmedPageWidths={report:SavedWidth;list:SavedWidth};
const key=(source:string)=>'hdnd.confirmed-widths.v1:'+source;
const valid=(width:unknown):width is SavedWidth=>
  width==='auto'||(typeof width==='number'&&Number.isSafeInteger(width)&&width>=320&&width<=6000);

export function readConfirmedPageWidths(source:string):ConfirmedPageWidths|null{
  try{
    const raw=globalThis.localStorage?.getItem(key(source));
    if(!raw)return null;
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object')return null;
    const candidate=value as Record<string,unknown>;
    if(candidate.schema!==1||candidate.source!==source||
       !valid(candidate.report)||!valid(candidate.list))return null;
    return {report:candidate.report,list:candidate.list};
  }catch{return null;}
}
export function rememberConfirmedPageWidths(source:string,widths:ConfirmedPageWidths):void{
  if(!valid(widths.report)||!valid(widths.list))return;
  try{
    globalThis.localStorage?.setItem(key(source),JSON.stringify({
      schema:1,source,report:widths.report,list:widths.list
    }));
  }catch{/* Browsing remains possible with storage disabled. */}
}
