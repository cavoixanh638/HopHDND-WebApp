/** UI V5 L1: one active editor across List and popup, without a backdrop
 * or synthetic click replay. Serialized release also fences fast same-cell
 * handoffs and any pending asynchronous lease acquisition. */
type Claim={trigger:HTMLButtonElement;dismiss:()=>Promise<void>};
let current:Claim|null=null;
let releaseFence:Promise<void>=Promise.resolve();
const settled=(work:Promise<void>):Promise<void>=>work.catch(()=>{});
export function claimCellPicker(trigger:HTMLButtonElement,dismiss:()=>Promise<void>):Promise<void>{
  const previous=current;
  current={trigger,dismiss};
  if(previous&&previous.trigger!==trigger){
    // Close A at B's actual click, not in document pointerdown capture.
    // Even if the previous Firebase release is slow, B waits for it.
    const release=previous.dismiss();
    releaseFence=settled(releaseFence.then(()=>release));
  }
  return releaseFence;
}
export function releaseCellPickerClaim(trigger:HTMLButtonElement|null,release?:Promise<void>):void{
  if(!trigger||current?.trigger!==trigger)return;
  current=null;
  if(release)releaseFence=settled(releaseFence.then(()=>release));
}
