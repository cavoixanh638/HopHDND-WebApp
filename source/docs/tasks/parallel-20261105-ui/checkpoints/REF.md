# REF checkpoint — 05/11/2026

Trạng thái: **IN_PROGRESS (đã có code/test/script; thiếu runtime acceptance và selector bổ sung)**. Writer: REF. Nhánh `ui/20261105-ref-codes`. Baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`.

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

## Commits & phạm vi đã push
- Survey checkpoint: [aa865ee4](https://github.com/cavoixanh638/HopHDND-WebApp/commit/aa865ee467c28eca72c42e05553e1b492cd7378e).
- Registry mới: [65fa4b9](https://github.com/cavoixanh638/HopHDND-WebApp/commit/65fa4b96319cd7a1d1baf0d0863de88a5054b9b5); overlay chỉ có **một** badge trong active hover/focus, nút copy riêng, feedback và ngăn clipboard sai ID. Refinement focus: [162174f](https://github.com/cavoixanh638/HopHDND-WebApp/commit/162174fefa0b096601bd51dbe5b07288a52a8d2a).
- CSS in-cell/copy accessibility: [9ba79d8](https://github.com/cavoixanh638/HopHDND-WebApp/commit/9ba79d8feab90b28d59bd65e5d70bc8bef74bac8) / [877b309](https://github.com/cavoixanh638/HopHDND-WebApp/commit/877b309543382fa24c919fea3f7540b41d2ce78a).
- Unit registry/instance/role: [06d3b37](https://github.com/cavoixanh638/HopHDND-WebApp/commit/06d3b37e97ed4e78c7d5e3db294bba6dc54f4aff) (fixture sửa ở [71df0d4](https://github.com/cavoixanh638/HopHDND-WebApp/commit/71df0d4d2bfdb519660af7f0bd93534fccba6b35)).
- Real Chrome QA script đã chuyển từ all-markers sang one-hover: [19ccde6](https://github.com/cavoixanh638/HopHDND-WebApp/commit/19ccde6d29718f0260717cd0054a9a5f21eb907e), fix selector [cfed32e](https://github.com/cavoixanh638/HopHDND-WebApp/commit/cfed32e385ca9fbe97395ce24e1408047a51c82c).
- Diff từ HEAD ban đầu chỉ gồm 5 file REF: `src/qa/ui-reference-codes.tsx`, `src/qa/ui-reference-codes.css`, `tests/pr95-ui-v4-l3-reference-codes.test.ts`, `scripts/pr95-v4-l3-reference-browser.mjs` và checkpoint này. Không sửa các file của worker khác; không ghi Firebase.

## Mã mẫu/semantic đã cố định
| Vị trí | Mã semantic | Mã instance khi DOM có stable recordId `rid-34` |
|---|---|---|
| Tiến độ 3 khâu (header/vùng) | `L03` | — |
| Cấp trình TU | `L03.1.LEVEL` | `L03.1.LEVEL@rid-34` |
| Tiến độ Thành ủy | `L03.1.STATUS` | `L03.1.STATUS@rid-34` |
| Trình Xây dựng NQ | `L03.2.STATUS` | `L03.2.STATUS@rid-34` |
| Trình ban hành NQ | `L03.3.STATUS` | `L03.3.STATUS@rid-34` |
| Lãnh đạo/Phòng/CV | `L04` | `L04.1@rid-34` UBND, `L04.2@rid-34` VP, `L04.3@rid-34` phòng, `L04.4@rid-34` chuyên viên |
| Ghi chú | `L06` | `L06.1@rid-34` |
| Metadata L01/cột nội dung | `L02` | `L02.1@rid-34` nội dung, `L02.2@rid-34` sở, `L02.3@rid-34` loại VB |
| Popup | `P03`/`P04`/`P06` | `P03.2.STATUS@rid-34`, `P04.1@rid-34`, `P06.1@rid-34` |

Ví dụ đổi thứ tự `note` với `specificProgress`: resolver vẫn lấy `data-col-key=note` hoặc `data-ui-reference-part`, nên `L06.1@rid-34` không đổi. Đây là **đặc tả/logic**, chưa là bằng chứng screenshot từ Chrome.

## Test/evidence tại mốc này
| Hạng mục | Code SHA | Test SHA | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| Git diff/scope | `cfed32e` | — | PASS | [Diff branch](https://github.com/cavoixanh638/HopHDND-WebApp/compare/aa135cfb07fbc29fe642da8710bfb11d61941927...cfed32e385ca9fbe97395ce24e1408047a51c82c) |
| Static verification 9 invariants | `cfed32e` | `cfed32e` | PASS (static only) | Connector read at exact branch: all 9 assertions true; không phải Vitest |
| Typecheck, Vitest, build | `cfed32e` | `cfed32e` | **NOT RUN** | Container không kết nối github.com, không có local repository checkout/deps; connector không chạy CI |
| Real Chrome admin/guest, focus, copy, popup, 1440/900/390 screenshots, resize/reorder/scroll | `cfed32e` | `cfed32e` | **NOT RUN** | Browser script có commit nhưng chưa được thực thi; chưa có screenshot/artifact |
| GitHub CI exact SHA | `cfed32e` | `cfed32e` | **NOT RUN** | GitHub combined statuses/runs trên code SHA ban đầu rỗng; cần PR/workflow run mới |

## Trở ngại và handoff cụ thể
1. **Bắt buộc** UI worker/commander thêm `data-ui-reference-record-id={item.recordId}` lên `tr` ở list và popup. Không có attribute, REF **chủ động ẩn mã instance** (không tạo mã giả từ displayed ID, STT hay hàng thứ N). Khi có attribute, unit mới kiểm định suffix `@recordId` và script Chrome sẽ bắt đầu kiểm instance.
2. Bổ sung `data-ui-reference-part` theo contract phía trên vào các member của `CompactGroupedValue`, nhất là L04 và metadata. Fallback đọc class hiện tại chỉ là tương thích tạm, **không đáp ứng coverage mọi subfield**.
3. `ReportTable` chưa có semantic identifiers cho mọi giao điểm. Không sao chép mã từng số khi thiếu cặp khóa hàng/cột; cung cấp `data-ui-reference-report-row` và `data-ui-reference-report-column` nếu mục tiêu bao phủ cả ô số.
4. Cần checkout thật rồi `npm ci`, `npm run typecheck`, `npm exec -- vitest run tests/pr95-ui-v4-l3-reference-codes.test.ts`, `npm run build:compact:qa`, `node scripts/pr95-v4-l3-reference-browser.mjs` và screenshot 1440/900/390; fix mọi FAIL trên đúng SHA, chỉ gắn PASS khi có output/run URL.
5. Chưa chạy thử clipboard thật trong Chrome; `navigator.clipboard.writeText` đòi secure context/permission. Feedback khi browser từ chối là `Không thể sao chép`. Không có dữ liệu nghiệp vụ trong clipboard/log ngoài mã REF + opaque stable recordId.

**Không DONE, không merge/deploy, không dùng Firebase live.** Cần tiếp quản từ HEAD hiện tại, không reset baseline.
