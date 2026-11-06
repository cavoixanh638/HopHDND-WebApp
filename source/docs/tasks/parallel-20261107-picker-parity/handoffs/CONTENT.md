# CONTENT checkpoint — 07/11/2026

Status: **IN_PROGRESS**.
Owner branch: `ui/20261107-picker-parity-content`.
Application/reference baseline: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
Own code SHA: **NONE YET**; tested SHA: **NONE**; typecheck/unit/build/browser: **NOT RUN**.

## Đã đọc / khảo sát
- `CONTENT.md`, đặc tả chung `README.md`, `source/AGENTS.md`, checkpoint gốc READY_NOT_STARTED.
- DOM thực tại `CompactGroupedValue.tsx`: nhánh `contentDetails` có `.compact-document-heading`, `.compact-document-department`, `.compact-document-badge`; dùng `shown('department'/'type')` nên quyền/bút CellPicker nằm ở field, empty writable vẫn hiện.
- CSS baseline tại `item-frame.css`: badge và department còn các rule tập trung surface từ V5/V6; cần override có scope để khớp L04, bảo toàn tone/highlight/mixed/readonly. Không sửa baseline shared.
- Fixture sẵn `ui-20261106-picker-fixture.tsx` dựng real ItemList+ReportDetailGrid trong RAM; có edit/guest/mixed, có thể tái sử dụng để đo 1440/900/390.
- Runtime làm việc cục bộ hiện không có DNS `github.com` (git ls-remote lỗi `Could not resolve host`); đang dùng GitHub connector để ghi nhánh và dự kiến GitHub Actions isolated để chạy npm/browser. **Không tính test PASS cho đến khi có run/log.**

## Đang thực hiện
1. Khảo sát cascade selectors V6/nhân sự, thiết kế CSS scoped L01, readonly không vỏ button và từng nền giữ nguyên.
2. Tạo test role-specific + browser measurement/screenshot (đối chiếu L04 cùng page), CI riêng nếu cần.
3. Chạy typecheck/unit/build/browser trên exact code SHA; sửa khi FAIL; cập nhật checkpoint SHA, file, URL log, ảnh; bàn giao commander.

## Giới hạn
Chỉ sửa `picker-parity-content.css`, import / nhánh `contentDetails` của `CompactGroupedValue.tsx`, test/script/workflow prefix `picker-parity-content`, QA output và checkpoint này. Không sửa L03/L04/shared picker/reference/backend. Không merge hoặc publish.
