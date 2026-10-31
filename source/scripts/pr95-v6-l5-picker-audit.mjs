/** V6 L5: assert & retain real baseline browser measurements, not HTML mocks.
 * Inputs are unmodified V5 Chrome logs generated at the EXACT checked-out SHA.
 * A browser-start failure or missing assertion is a failure (never green).
 */
import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';

const [listPath,racePath,scrollPath]=process.argv.slice(2);
if(!listPath||!racePath||!scrollPath)
  throw Error('Usage: node scripts/pr95-v6-l5-picker-audit.mjs <ListChrome.log> <ControlledAckChrome.log> <ScrollChrome.log>');
const list=readFileSync(listPath,'utf8').split(/\r?\n/);
const race=readFileSync(racePath,'utf8').split(/\r?\n/);
const scroll=readFileSync(scrollPath,'utf8').split(/\r?\n/);
const fail=message=>{throw Error('PR95_V6_L5_PICKER_AUDIT_FAIL '+message);};
const extract=(lines,prefix)=>lines.flatMap(line=>{
  if(!line.startsWith(prefix+' '))return [];
  try{return [JSON.parse(line.slice(prefix.length+1))];}
  catch{fail('malformed JSON '+prefix);}
});
const unique=(lines,prefix)=>{
  const found=extract(lines,prefix);
  if(found.length!==1)fail('required exactly one '+prefix+', got '+found.length);
  return found[0];
};
const rectPattern=/^PR95_V5_L1_RECT (\S+) (\{.+\})$/;
const rects={};
for(const line of list){
  const match=line.match(rectPattern);
  if(!match)continue;
  if(Object.hasOwn(rects,match[1]))fail('duplicate rect '+match[1]);
  const g=JSON.parse(match[2]);
  if(!Number.isFinite(g.gap)||g.gap<3||g.gap>9||
    !Number.isFinite(g.menu?.height)||g.menu.height<=0||
    g.menu.y<g.viewport.top+5||
    g.menu.bottom>g.viewport.top+g.viewport.height-5)
    fail('invalid anchor/menu/viewport for '+match[1]+' '+JSON.stringify(g));
  rects[match[1]]=g;
}
const requiredRects=[
  'main-status-before-handoff',
  'main-one-pointer-status-to-leader',
  'main-one-pointer-leader-to-department',
  'bottom-edge-seven-choices',
  'searchable-before-filter','searchable-after-filter',
  'granted-leader-only',
  'popup-leader','popup-one-click-switch',
  'mobile-390-status','mobile-390-popup'
];
for(const name of requiredRects)if(!rects[name])fail('browser rect missing: '+name);
if(rects['searchable-after-filter'].menu.height>=
   rects['searchable-before-filter'].menu.height)
  fail('search filter did not shrink menu');
const handoff=unique(list,'PR95_V5_L1_REAL_POINTER_SINGLE_CLICK_HANDOFF_PASS');
const main=unique(list,'PR95_V5_L1_REAL_CHROME_PASS');
const popup=unique(list,'PR95_V5_L1_POPUP_HANDOFF_PASS');
const mobile=unique(list,'PR95_V5_L1_MOBILE_POPUP_PASS');
if(handoff.noPatch?.open!==1||handoff.noPatch?.dirty||
  handoff.noPatch?.patch!==null)fail('click handoff altered raw/draft or opened two menus');
if(main.pointerHandoffs<2||main.popupHandoffs<1||
  main.productionRequests!==0||!main.enterTabEscape||
  !main.permissionGrant||!main.main||!main.popup)
  fail('required real Chrome suite assertion absent');
if(!popup.popupA||!popup.popupB||!mobile.menu?.height)fail('popup geometry absent');
if(!list.some(x=>x.startsWith('PR95_V5_L1_GRANT_DENY_NOOP_PASS'))||
   !list.some(x=>x.startsWith('PR95_V5_L1_ENTER_TAB_ESC_NOOP_PASS')))
  fail('permission or keyboard/noop proof absent');
const pending=unique(race,'R_V5_02_PENDING_A');
const late=unique(race,'R_V5_02_LATE_ACK_SINGLE_CLICK_SAME_FIELD_PASS');
const leak=unique(race,'R_V5_02_LEASE_NOOP_LISTENER_CLEANUP_PASS');
const end=unique(race,'R_V5_02_REAL_CELL_PICKER_CHROME_PASS');
const scrollProof=unique(scroll,'PR95_V6_L5_SCROLL_VISUAL_VIEWPORT_PASS');
if(scrollProof.patchCount!==0||scrollProof.productionRequests!==0||
  scrollProof.screenshots!==3||!scrollProof.after?.menu||
  !(scrollProof.after.trigger.y<scrollProof.before?.trigger?.y-2)||
  scrollProof.offscreen?.menu!==null||
  !(scrollProof.mobileAfter?.viewport?.scale>scrollProof.mobileBefore?.viewport?.scale+0.1))
  fail('scroll/visual viewport evidence invalid '+JSON.stringify(scrollProof));
if(pending.count!==1||pending.patches!==0||
  late.held!=='B'||late.canceledA!==1||late.canceledB!==0||
  late.patches!==0||late.visiblePopovers!==1||
  leak.held!==null||leak.patches!==0||
  end.productionRequests!==0||end.patchCount!==0)
  fail('late ACK/cancel/no-patch fence invariant mismatch');
for(const name of ['pointerdown','keydown','scroll','resize']){
  if((leak.listenerCounts?.[name]??0)!==0)
    fail('listener leak '+name+' '+JSON.stringify(leak.listenerCounts));
}
const images=[
  'pr95-v5-l1-main-status-open.png',
  'pr95-v5-l1-main-one-click-leader.png',
  'pr95-v5-l1-main-one-click-department.png',
  'pr95-v5-l1-bottom-flip-desktop.png',
  'pr95-v5-l1-search-filter-reposition.png',
  'pr95-v5-l1-popup-open-desktop.png',
  'pr95-v5-l1-popup-one-click-switch.png',
  'pr95-v5-l1-mobile-390-status.png',
  'pr95-v5-l1-mobile-390-popup.png',
  'pr95-v5-l1-race-pending-popup-unmount.png',
  'pr95-v5-l1-race-late-ack-b-open.png',
  'pr95-v6-l5-before-scroll.png',
  'pr95-v6-l5-after-scroll.png',
  'pr95-v6-l5-visual-viewport.png'
];
for(const path of images){
  if(!existsSync(path)||statSync(path).size<2000||
    readFileSync(path).subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
    fail('missing/invalid actual Chrome screenshot '+path);
}
const evidence={
  baselineSource:'actual ItemList + ReportDetailGrid from checked-out SHA',
  controlledAck:'real mounted React CellPicker with stub lease manager; NOT Firebase',
  sha:process.env.GITHUB_SHA??'local-checkout',
  listFixture:'synthetic compact-qa',
  popup:true,mobile390:true,
  physicalPointerHandoffs:main.pointerHandoffs,
  physicalPopupHandoffs:main.popupHandoffs,
  triggerMenuRectCount:Object.keys(rects).length,
  rects,
  keyboardNoop:true,
  patchCountNoop:0,
  leaseTimeline:late.events,
  canceledOld:late.canceledA,
  canceledNewBeforeEsc:late.canceledB,
  leaseAfterEsc:leak.held,
  listenerCounts:leak.listenerCounts,
  productionRequests:0,
  screenshots:images,
  scrollAndVisualViewport:{before:scrollProof.before,after:scrollProof.after,
    offscreen:scrollProof.offscreen,mobileBefore:scrollProof.mobileBefore,
    mobileAfter:scrollProof.mobileAfter},
  unitChoiceLengths:[3,5,7],
  caution:'3/5/7 verified by unit; lease ACK is controlled stub. Firebase security has separate Emulator suite.'
};
writeFileSync('pr95-v6-l5-picker-evidence.json',JSON.stringify(evidence,null,2)+'\n');
console.log('PR95_V6_L5_REAL_BROWSER_AUDIT_PASS '+JSON.stringify({
  sha:evidence.sha,rectCount:evidence.triggerMenuRectCount,
  minGap:Math.min(...Object.values(rects).map(r=>r.gap)),
  maxGap:Math.max(...Object.values(rects).map(r=>r.gap)),
  pointerHandoffs:evidence.physicalPointerHandoffs,
  popupHandoffs:evidence.physicalPopupHandoffs,
  patchCountNoop:0,leaseTimeline:evidence.leaseTimeline,
  listenerCounts:evidence.listenerCounts,
  screenshots:evidence.screenshots.length,scrollReposition:true,
  visualViewportPinch:true,productionRequests:0
}));
