# G05 — Checkpoint quản trị cột và danh mục (18/11/2026)

## Git và phân định phạm vi
- Branch: `g05/20261118-column-catalog`
- PR DRAFT: https://github.com/cavoixanh638/HopHDND-WebApp/pull/209 (chưa merge/publish)
- BASE cố định: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`
- **Code SHA (commit source/test trước khi cập nhật checkpoint):** `6147ca9340f9d19ed255fd4ea0255cd156f144da`
- **Tested SHA (GitHub Actions chạy chính SHA đó):** `6147ca9340f9d19ed255fd4ea0255cd156f144da`
- **Trạng thái nghiệm thu:** `HOLD` — code/fixture G05 có PASS nhưng Verify tổng thể FAIL do 3 test cũ không cùng hợp đồng với trạng thái bị khóa. GitHub Actions cho Code SHA: **9 SUCCESS / 1 FAILURE**, đầy đủ 10 workflow đã kết thúc.
- File thay đổi thuộc quyền G05: `source/src/features/items/ItemColumnPanel.tsx`, `source/src/features/catalogs/CatalogPanel.tsx`, component/CSS `inline-g05-*`, test riêng `source/tests/inline-admin-g05-*.test.ts(x)` và checkpoint này.
- Không sửa `ItemList.tsx`, `App.tsx`, `CellPicker*`, schema/auth/CAS/lease, workflow, Rules, release policy hoặc `main`.

## Việc đã thực hiện
1. Mini-editor danh sách ngay trong chi tiết cột: tìm không dấu, thêm/đổi tên/xóa giá trị chưa dùng, kéo thả hoặc mũi tên lên/xuống, đếm số lần dùng, thông báo lỗi, cuộn riêng và vùng tìm kiếm cố định.
2. Bảo vệ `partyLevel`, `progressParty`, `progressBuild`, `progressCouncil` cả ở mini-editor lẫn `CatalogPanel`: chỉ xem/tìm, không được thêm/sửa/xóa/reorder trạng thái chuẩn.
3. Kiểm tra rỗng, trùng sau chuẩn hóa bỏ dấu, Unicode NFC, khoảng trắng cuối, giới hạn dài, những giá trị đã sử dụng, quan hệ chuyên viên–phòng và ID nhóm báo cáo. Không sửa hàng Excel chỉ vì sửa một nhãn danh mục.
4. Đổi tên chuyên viên/phòng chưa dùng giữ liên kết; đổi tên nhóm báo cáo giữ ID và aliases; sao chép catalog giữ `groupIdentities`.
5. Giữ chuyển kiểu văn bản/danh sách, tối đa 20 cột custom, bảo toàn dữ liệu A–O, quyền từng ô và callback lưu dùng CAS hiện có.
6. Bổ sung khả năng hoàn tác *nháp* một thao tác và `focusColumnKey` để G00 nối hành động từ header cột.
7. Sửa Enter/Escape cho nhập tiếng Việt: không commit khi bàn phím đang trong IME composition hoặc keyCode 229; Enter chỉ commit khi hoàn tất, Esc hủy rename và không vô tình đóng cha.

## Chứng cứ kiểm thử (đúng Tested SHA)
- **PASS — `npm run typecheck`** trong [Verify workflow](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293458955) tại `6147ca9340f9d19ed255fd4ea0255cd156f144da`.
- **PASS — 16/16 tests riêng G05**: `inline-admin-g05-catalog.test.ts` 8/8; `inline-admin-g05-editor.test.tsx` 8/8. Bao gồm used/unused, duplicate Unicode/không dấu, status locked, chuyên viên–phòng, ID nhóm, 20 custom columns, Enter/Escape, IME, drag/drop, undo, danh mục 140 lựa chọn, serialize/deserialize reload fixture.
- **PASS — các kiểm thử không xung đột:** `npm test` ghi nhận 1.057 PASS; 170 SKIPPED; không có bài G05 FAIL.
- **FAIL — toàn bộ `npm test` / Verify:** 3 assertions *cũ* tại `tests/item-viewport-width.test.tsx`, đang tìm `ColumnChoiceEditor` cũ và cố thêm giá trị tùy tiện vào `progressParty` chuẩn. [Nhật ký lỗi](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293458955/job/134764283146). Không nới danh sách trạng thái để qua test. **G00 đã nhận cập nhật fixture này tại nhánh integration** trong comment PR #209; G05 không sửa test thuộc phạm vi khác.
- **PASS (CI tự động trên cùng SHA):** `schema`, `original-excel-parser`, `chromium-fixture`, `real-spark-list`, `guest-save`, `two-browser`, `simple-admin`, `direct-status-security`, `Permissions/lock/realtime/audit/freeze/import`. Đây là các workflow có sẵn, **không phải** Chrome QA live G05 riêng.
- **NOT_RUN:** `npm run test:spark` tự chạy cục bộ tại SHA G05; Chrome thực tế danh mục dài và keyboard với editor G05 đã tích hợp; 7/4 dropdown threshold, viewport 1920/2K/900/390, hai phiên CAS catalog đồng thời; production Firebase/UID thật (bị cấm). Test reload hiện là **JSON roundtrip/validator fixture**, chưa phải reload trình duyệt thật.

## Phân công tích hợp G00
1. Gắn action header từ G01-owned `ItemList.tsx`/header vào `ItemColumnPanel.focusColumnKey` (không chuyển dữ liệu sang editor; chỉ mở trang quản lý). `ItemColumnPanel` vẫn dùng `onSaveCatalog`, `onSaveLayout`, permissions writer của host.
2. Cập nhật 3 legacy assertions tại `tests/item-viewport-width.test.tsx` cho `G05ChoiceEditor` và hợp đồng *không chỉnh trạng thái chuẩn*, sau đó chạy lại full tests/CI trên **integration SHA**. Không làm giả PASS ở G05 PR.
3. Chrome QA integrated: Admin có nút chỉnh; guest/staff không mở editor; keyboard/IME; danh mục >100 mục search sticky/scroll, drag vs sort, không phát sinh network write chỉ do search/scroll, reload/2 admin CAS; kiểm ngưỡng dropdown 7/4 không hồi quy.
4. Không tự merge, không deploy, không thay production Firebase, release gate hoặc cấu hình cá nhân localStorage.

**G05 độc lập đã bổ sung code và fixture, nhưng PR vẫn DRAFT/HOLD cho đến khi G00 hoàn thành hợp đồng test và nghiệm thu integration.**
