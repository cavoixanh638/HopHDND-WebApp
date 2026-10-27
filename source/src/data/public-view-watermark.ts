/**
 * Source watermark for a trusted server-side public-view publisher.
 * Never embed this record-ID map in hdnd/publicViews/current: it belongs
 * only in hdnd/publicViews/meta (Rules deny client read/write).
 */
export interface PublicViewWatermark {
  profileRevision:number;
  recordRevisions:Record<string,number>;
}
export function acceptsPublicViewWatermark(
  previous:PublicViewWatermark|null|undefined,
  proposed:PublicViewWatermark
):boolean{
  const valid=(value:PublicViewWatermark)=>Number.isSafeInteger(value.profileRevision)&&
    value.profileRevision>0&&!!value.recordRevisions&&
    Object.values(value.recordRevisions).every(rev=>Number.isSafeInteger(rev)&&rev>=1);
  if(!valid(proposed))return false;
  if(!previous)return true;
  if(!valid(previous))return false; // Fail closed on corrupt private publication state.
  if(proposed.profileRevision<previous.profileRevision)return false;
  // A retried, out-of-order event may NOT publish a snapshot made before
  // another row (or admin layout) was updated.
  for(const [id,revision] of Object.entries(previous.recordRevisions))
    if((proposed.recordRevisions[id]??0)<revision)return false;
  return proposed.profileRevision>previous.profileRevision||
    Object.keys(proposed.recordRevisions).length!==Object.keys(previous.recordRevisions).length||
    Object.entries(proposed.recordRevisions).some(([id,rev])=>
      rev>(previous.recordRevisions[id]??0));
}
