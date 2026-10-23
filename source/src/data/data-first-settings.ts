/** Guest-only experiment. Never suppress authentication or authorize edits.
 * A/B is explicit and read-only until Firebase rights/control have arrived. */
export function deferGuestEditMetadata(search:string,isAnonymous:boolean):boolean{
  if(!isAnonymous)return false;
  const params=new URLSearchParams(search);
  return params.get('startupMetrics')==='1'&&
    params.get('guestMetadata')==='defer'&&
    !['excel','database'].includes(params.get('compareSource')??'');
}
