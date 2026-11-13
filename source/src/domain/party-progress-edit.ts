import type {Changes,Item} from '../../shared/types';
import {canonicalStatus} from './status-contract';

/** UI choices must agree with the Spark transaction's party-level contract.
 * A level of Không derives Không phải trình on the server as part of a
 * partyLevel-only edit; selecting the same status independently is invalid.
 * This is not a stored-data projection or a change to original Excel values.
 */
export function selectablePartyProgress(level:string,values:readonly string[]):string[]{
  if(canonicalStatus('partyLevel',level)==='Không')return [];
  return values.filter(value=>
    canonicalStatus('progressParty',value)!=='Không phải trình');
}

/** Fail before creating a draft or marking a cell lease pending. The server
 * remains the final authority: this helps guests avoid invalid optimistic UI.
 */
export function partyProgressEditIssue(
  item:Pick<Item,'partyLevel'|'progressParty'>,changes:Changes
):string|null{
  if('partyLevel' in changes&&'progressParty' in changes)
    return 'Chỉ sửa Cấp trình; máy chủ tự cập nhật tiến độ Thành ủy cùng giao dịch.';
  if('progressParty' in changes){
    if(canonicalStatus('partyLevel',item.partyLevel)==='Không')
      return 'Cấp trình Không: tiến độ Thành ủy do máy chủ quản lý, không sửa trực tiếp.';
    if(canonicalStatus('progressParty',String(changes.progressParty))==='Không phải trình')
      return 'Trạng thái “Không phải trình” chỉ được đặt bằng cách đổi Cấp trình sang “Không”. Hãy chọn một tiến độ Thành ủy phù hợp.';
  }
  return null;
}
