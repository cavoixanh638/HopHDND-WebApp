# G05 — Checkpoint quản trị cột và danh mục (18/11/2026)

## Git và ranh giới
- Branch: `g05/20261118-column-catalog`
- PR: https://github.com/cavoixanh638/HopHDND-WebApp/pull/209 (Draft, chưa merge)
- BASE: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`
- **Code SHA trước checkpoint:** `ffb75b53f5af01011208bc8d28e37fdbdca7ed30`
- **Tested SHA (GitHub Actions đã chạy vòng đầu):** `fa3786776ee70942930ff2e4f991784983b471f8`; các commit tiếp theo cần CI xác nhận lại; không suy diễn PASS cho SHA chưa chạy.
- Các tệp đổi: `ItemColumnPanel.tsx`, `CatalogPanel.tsx`, hai tệp `inline-g05-*.css`, `inline-g05-choice-editor.tsx`, `inline-g05-catalog-logic.ts`, `tests/inline-admin-g05-catalog.test.ts` và checkpoint này. Không sửa tệp G01/G02/G04, main, Firebase Rules, workflow hay package.

## Phần đã lập trình
1. Mini-editor nằm ngay cấu hình cột: tìm không dấu, thêm, đổi tên lựa chọn chưa dùng, xóa chưa dùng, kéo/thả hoặc lên/xuống, đếm số lần nguồn dùng, cuộn riêng, giữ tìm kiếm ở trên, Enter/Escape, thao tác trên draft và hoàn tác thao tác gần nhất.
2. Các danh mục `partyLevel`, `progressParty`, `progressBuild`, `progressCouncil` bị khóa chỉnh sửa; cảnh báo/khóa thao tác cả trong panel nâng cao.
3. Kiểm tra tên trống, giới hạn độ dài, trùng sau bỏ dấu/chuẩn hóa Unicode/NFC, khoảng trắng, phân biệt đang dùng và chưa dùng; cấm xóa phòng/chuyên viên còn liên kết.
4. Đổi tên danh mục chuyên viên/phòng chưa dùng vẫn bảo toàn quan hệ; nhóm báo cáo tiếp tục dùng `renameReportGroupIdentity`, giữ ID và alias; cấu hình catalog được sao chép cả `groupIdentities`.
5. Cột custom có loại nhập Văn bản/Danh sách, giới hạn 20 cột dựa trên validator cũ, giá trị nguồn A–O không bị sửa. `focusColumnKey` là API riêng cho G00 nối thao tác header.
6. Chỉ thao tác lưu hiện hữu `onSaveCatalog` và `onSaveLayout`/permissions; không gọi Firebase SDK mới hoặc chạm dữ liệu sản xuất.

## Evidence / CI
- **PASS (SHA `fa378677...`):** `npm run typecheck`; unit mới `inline-admin-g05-catalog.test.ts` 8/8; tổng 1.049 test khác PASS; CI `schema`, `original-excel-parser`, `chromium-fixture` PASS tại lần quan sát.
- **FAIL (SHA `fa378677...`):** 3 bài hồi quy cũ ở `tests/item-viewport-width.test.tsx`. Các test này tìm `ColumnChoiceEditor` cũ; hai test còn yêu cầu *thêm giá trị tuỳ ý* vào danh mục trạng thái `progressParty`. Yêu cầu cũ xung đột chỉ thị G05 khóa danh mục trạng thái. Không sửa tệp test không thuộc quyền G05, không tạo đường tắt cho phép sửa trạng thái nghiệp vụ chỉ để PASS test. G00 cần điều chỉnh test cũ theo contract mới sau tích hợp.
- **NOT_RUN tại thời điểm ghi:** Vòng đầy đủ `npm run typecheck && npm test` của Code SHA mới nhất; `npm run test:spark` ở đúng SHA cuối, Chrome keyboard/scroll 7/4 trong giao diện tích hợp, hai tài khoản Firebase thật và kiểm tra production (không được phép).
- **Không xác nhận DONE tích hợp:** CI tại đúng SHA cuối và Chrome/E2E cần đối chiếu thêm. Vòng CI đầu đã có FAIL cần được G00 xử lý vì test contract cũ.

## Rủi ro / điểm tích hợp G00
- Header inline: nối action mở quản lý cột đến `ItemColumnPanel.focusColumnKey` qua `ItemList.tsx` (owner G01); G05 không sửa ItemList.
- Writer: giữ callback `onSaveCatalog` đang được `ItemList`/App cấp quyền, CAS/revision và rollback; component chỉ cập nhật nháp.
- Test legacy: `tests/item-viewport-width.test.tsx` đang giả định danh mục trạng thái cho phép thêm lựa chọn; phải đổi assertion thành *khóa lựa chọn*, đồng thời dùng `G05ChoiceEditor` thay vì `ColumnChoiceEditor`.
- Nhánh G05 không tự merge, không publish, không thay release biến, không deploy Firebase.
