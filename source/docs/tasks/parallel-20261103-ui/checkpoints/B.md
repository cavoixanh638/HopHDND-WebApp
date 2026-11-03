# Luồng B — checkpoint tiếp quản 03/11/2026

Status: **TEST_PENDING**; chưa DONE, không merge/deploy. Branch `ui/20261103-admin-controls`.

## Mốc và thay đổi

- Bàn giao HEAD: `195755f41f43d4b79835b628012aca7fce419ae2`; giữ nguyên phần đã PASS.
- Commit mã: `bbc8f02d2655b4b598fccbf6e21e3caf435421f9`. Chỉ đổi `ItemList.tsx`, `ColumnHeader.tsx`, `admin-list-controls.css`.
- Commit unit bổ sung: `5c2726d4d47375fede9fb11b88c984e0e9bda011` (evidence/B/admin-controls.test.ts).
- PR nháp QA [#151](https://github.com/cavoixanh638/HopHDND-WebApp/pull/151) vào nhánh coordination: **DO NOT MERGE**. Mục đích duy nhất kích hoạt các gate CI không phát hành.
- Mã đã bàn giao trước tiếp tục sử dụng `sort-items.ts`, `item-preferences.ts`, `item-layout-merge.ts` (L01 NQ rồi BC; title/card validation; three-way per-card CAS); không sửa lại.

## Bản sửa mới

- Sort header khách: không hiển thị nút, không `aria-sort`, không focus/click/key sorting khi không có `onSort`; admin mới nhận callback sort.
- Giữ `sharedBase.current` đồng bộ với layout xác thực, dùng baseline đã xác nhận cho các lần thao tác kế tiếp; tránh tắt/bật lại một thẻ bị bỏ qua do prop Firebase cập nhật chậm.
- Thêm lựa chọn giải quyết xung đột `LayoutConflictResolver` cho title/cards/view settings; tự hoàn lại giao diện khi xung đột/lỗi; ghi theo ba bên với lựa chọn cụ thể.
- Đổi tên và C01/C02/C03 không bị vô hiệu chỉ vì đang bật hiển thị đủ Excel. Đường ghi chung vẫn cần `onPersistViewerLayout` của App và quyền admin xác thực; demo RAM không ghi Firebase hay localStorage qua nút này.
- Giữ C00 và DOM công thức/lọc khi ẩn C01–C03; `data-visible-stages` + CSS giúp số thẻ đang hiện dùng đúng số cột grid, responsive <=560px.
- Đã bổ sung unit cho ID tự nhiên NQ/BC tăng/giảm, stable ordering, migration default, cấu hình cá nhân không ghi đè shared title/cards, CAS các thẻ độc lập và SSR guest/admin header.

## Kết quả kiểm thử đúng SHA `5c2726d`

- GitHub Actions verify-source run [41597582237](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41597582237): `npm ci` PASS, `npm run typecheck` PASS, `npm test` PASS, 1600px boundary regression PASS; các bước Firebase/Chrome/build phía sau còn chạy tại thời điểm checkpoint.
- Lỗi palette được ghi trong checkpoint cũ cần phân loại lại: `item-frame.css` và `tests/pr95-ui-v2-l2-palette.test.ts` trên HEAD B có SHA blob **trùng hoàn toàn** baseline `b73643d247b5ee8b58586cd85407b9265004f1c6` (`6fc8c783...`, `73cfb5e5...`). Unit CI trên SHA này PASS; không sửa file của luồng khác.
- Local workspace hiện tại không có DNS GitHub hoặc bộ node_modules của repo; không chạy Chromium local hoặc capture ảnh trong container. Kết quả TypeScript/unit được chứng thực bằng GitHub Actions, **không** tự nhận local Chrome PASS.

## Việc chưa khép

1. Đọc kết quả cuối của run verify-source và các checks PR #151; kiểm tra đặc biệt `build:compact:qa`, Chrome và emulator.
2. Chạy/sưu tầm Chrome có bằng chứng **đúng B final SHA** cho guest/admin sort bằng click + keyboard, title hợp lệ/không hợp lệ, ẩn/hiện từng C01–C03, C00, active filter không mất, reload guest thấy layout chung, drag/resize và mobile/900px.
3. Thử 2 tab admin xung đột thực trên Firebase Emulator và rollback khi denied/offline; không dùng production.
4. Đưa ảnh/trace và tóm tắt run vào `source/docs/tasks/parallel-20261103-ui/evidence/B/`; cập nhật checkpoint `DONE` **chỉ khi** các tiêu chí đã có bằng chứng.
5. Không merge, không deploy, không ghi dữ liệu thật.

## Nguyên tắc bàn giao

Checkpoint này và code đã push trên `ui/20261103-admin-controls`; mọi commit tiếp theo phải nêu gate theo **exact SHA**. Không chạm `item-frame.css`, `CompactGroupedValue.tsx`, `pr95-full-preview.tsx`, `list-filter-toolbar.css`, Excel/Firebase Rules/KPI.
