# REF checkpoint — 05/11/2026

Trạng thái: **IN_PROGRESS (khảo sát, chưa nghiệm thu)**. Writer: REF. Nhánh `ui/20261105-ref-codes`. Baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`.

## Sự kiện khảo sát ban đầu
- Remote HEAD kiểm trước sửa: `aa135cfb07fbc29fe642da8710bfb11d61941927`, ahead baseline 2 commit chỉ thêm tài liệu; không có delta code. GitHub remote không có "dirty worktree"; container hiện tại không có checkout Git nên không thể khẳng định trạng thái dirty tree tại một máy khác.
- CI status của HEAD: statuses rỗng; PR-triggered runs rỗng (**NOT RUN**, không suy thành PASS).
- Khảo sát `ui-reference-codes.tsx`: bộ mã semantic L03/L04/L06 ở header có selector gộp; renderer dùng `resolveUiReferenceAnchors` để vẽ tất cả marker quanh bên **ngoài** vùng; riêng mã ô xuất hiện ở một gutter khác, nên gây hiểu nhầm L03/L04 và L06 trông như mất. Chưa có copy action, chưa có focus keyboard; `uiReferenceForCell` lấy ID chữ từ ô displayCode hiện, nên ẩn cột/trùng ID có thể mất phân biệt instance.
- `ItemList` và `ReportDetailGrid` dùng React `key={item.recordId}`, nhưng `tr` **chưa có attribute DOM** chứa ID ổn định; vì vậy REF không thể sinh mã instance chính xác từ DOM khi không được sửa file của UI worker. Đã kiểm các ô gộp L01/L03/L04 trong `CompactGroupedValue`, các cột dynamic trong list/popup.

## Contract cần UI worker/commander thực hiện (không chạm file ngoài sở hữu)
1. Trên **cả hai** `tr key={item.recordId}` tại `ItemList.tsx` và `ReportDetailGrid.tsx`, thêm `data-ui-reference-record-id={item.recordId}`, **không** dùng STT/displayCode/array index. Chỉ chứa stable opaque recordId; không render vào text/aria.
2. Trong `CompactGroupedValue.tsx`: gắn `data-ui-reference-part="content"` vào `.compact-document-content`, `"department"` vào `.compact-document-department`, `"type"` vào `.compact-document-badge`; `"partyLevel"` vào cả `.compact-stage-level` readonly/editable; `"progressParty"`, `"progressBuild"`, `"progressCouncil"` vào các `.compact-stage-state` tương ứng; `"ubndLeader"|"vpLeader"|"room"|"specialist"` vào member element thực tế của các variant.
3. Các selector phần phụ tùy chọn `data-ui-reference-part="label"|"control"|"history"|"resize"|"filter"` đặt đúng phần tử nếu worker thêm mới; REF có fallback semantic bằng DOM hiện tại, tuyệt đối không dựa thứ tự cột.
4. Với `ReportTable` nếu commander muốn mã *từng giao điểm ô số* thay vì chỉ report header/stage: cần `data-ui-reference-report-row` là khóa nhóm không đổi và `data-ui-reference-report-column` là khóa nghiệp vụ, không dùng index hay label.

Mã mẫu đã chốt theo nghĩa: `L03` Tiến độ 3 khâu, `L04` Lãnh đạo/Phòng/CV, `L06` Ghi chú; cùng mapping `P03/P04/P06` trong popup. Dự kiến mã bản ghi đầy đủ dùng suffix `@<encoded recordId>` từ attribute nêu trên, chỉ cho admin tại hover/focus và copy theo thao tác chủ động. Nếu thiếu recordId thì **không sao chép mã instance giả**.

## Test/evidence
| Hạng mục | Code SHA | Test SHA | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| Baseline / survey | `d8c994c` | — | NOT RUN delta | [HEAD khảo sát](https://github.com/cavoixanh638/HopHDND-WebApp/commit/aa135cfb07fbc29fe642da8710bfb11d61941927) |
| Typecheck/unit/build/browser thực App 1440/900/390, admin/guest/popup | — | — | NOT RUN | Chưa sửa code; bước tiếp theo |

## Việc kế tiếp
Sửa registry và overlay tại hai file sở hữu; cập nhật tests chuyên biệt; kiểm CI/Chrome theo exact SHA; bổ sung SHA/artifact và lỗi còn lại trước khi dừng. Không merge/deploy/Firebase live.
