/** Intentionally historical and negative source values for regression tests ONLY.
 * The default createDemoItems() must never use these labels again.
 * Do not import this file from App, QA preview or production code.
 */
import type {Item} from '../../shared/types';
import {createDemoItems} from '../../src/data/demo-items';

const oldParty=[
  'Sở chưa trình','VP đang thực hiện','Đã gửi ĐU',
  'ĐU đã gửi TU, chưa họp','Đã họp/xin phiếu, chưa có TBKL','Đã có TBKL',
] as const;
const oldCouncil=['Sở chưa trình','VP đang thực hiện','Hoàn thành'] as const;
const oldBuild=[
  'Không phải trình xây dựng NQ','Sở chưa trình',
  'VP đang thực hiện','Đã trình HĐND, chưa có QĐ',
  'Đã có QĐ chấp thuận',
] as const;

/** Rebuild exactly the four legacy source fields from the pre-V4 synthetic
 * generator, including the original 4-step build cycle (not the fifth value).
 * Every other field is copied from the new generator, proving it is unchanged.
 */
export function createLegacyDemoItemsForTests(count=27):Item[]{
  return createDemoItems(count).map((item,index)=>{
    const ordinal=index+1;
    return {
      ...item,
      partyLevel:ordinal%5===0?'Không phải xin ý kiến':
        ['Ban Chấp hành','BTV','TTTU'][(ordinal-1)%3],
      progressParty:ordinal%5===0?'Không phải xin ý kiến':
        oldParty[(ordinal-1)%oldParty.length],
      progressBuild:oldBuild[(ordinal-1)%4],
      progressCouncil:oldCouncil[(ordinal-1)%oldCouncil.length],
    };
  });
}

/** Negative/unrecognized/blank values and known legacy terminal aliases are
 * deliberately isolated here; they are not default demo records.
 */
export function legacyUnknownBlankFixtureForTests():Item[]{
  const [unknown,blank,knownTerminal]=createDemoItems(3);
  return [
    {...unknown,recordId:'legacy-unknown',displayCode:'NQ-LEGACY-UNKNOWN',
      partyLevel:'Ban khác',progressParty:'TU đã cho ý kiến',
      progressBuild:'Đang xin ý kiến',progressCouncil:'Đã xử lý xong'},
    {...blank,recordId:'legacy-blank',displayCode:'NQ-LEGACY-BLANK',
      partyLevel:'',progressParty:'',progressBuild:'',progressCouncil:''},
    {...knownTerminal,recordId:'legacy-known-terminal',displayCode:'BC-LEGACY-TERMINAL',
      partyLevel:'Ban Chấp hành',progressParty:'Đã họp/xin phiếu, chưa có TBKL',
      progressBuild:'Đã có QĐ chấp thuận',
      progressCouncil:'Đã trình HĐND TP'},
  ];
}
