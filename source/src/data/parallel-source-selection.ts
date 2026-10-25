/**
 * Browser-tab source routing only: NEVER mutates the shared Firebase profile.
 * A backend switch is forbidden while there is anything that could be lost.
 */
export type TabDataSource='excel'|'database'|'primary'|'supabase';
export type SourceSwitchState={
  drafts:number;protectedRecovery:boolean;busy:boolean;cachePending:boolean;
  editorUnsaved:boolean;editorOpen:boolean;heldLeases:number;
};
export function sourceSwitchBlocker(s:SourceSwitchState):string|null{
  if(s.drafts>0||s.protectedRecovery)
    return 'Có nháp chưa lưu hoặc đang chờ đối chiếu. Hãy xử lý tại nguồn hiện tại trước khi đổi nguồn.';
  if(s.heldLeases>0||s.editorUnsaved||s.editorOpen)
    return 'Đang mở ô sửa, khóa chỉnh sửa hoặc cửa sổ chi tiết. Hãy đóng và kết thúc phiên sửa trước khi đổi nguồn.';
  if(s.busy||s.cachePending)
    return 'Nguồn hiện tại đang tải, xác minh hoặc ghi dữ liệu. Chờ hoàn tất trước khi đổi nguồn.';
  return null;
}
export function resolveTabSource(
  override:TabDataSource|null,
  shared:'excel'|'database'|'primary'|undefined,
  comparison:'excel'|'database'|null
):TabDataSource{
  // Historical speed comparison stays read-only and cannot be overridden.
  return comparison??override??shared??'excel';
}
export function sourceNamespace(
  selected:TabDataSource,sourceUrl:string,projectRef:string
):string {
  switch(selected){
    case 'primary': return 'pages:primary';
    case 'database': return 'pages:firebase-mirror:'+sourceUrl;
    case 'supabase': return 'pages:supabase:'+projectRef;
    default: return 'pages:sheets:'+sourceUrl;
  }
}
