# G00 | Chiến dịch chỉnh giao diện Admin trực tiếp (18/11/2026)

## Mốc và quy tắc bất biến

- Repository: `cavoixanh638/HopHDND-WebApp`; source `source/`.
- **BASE cố định** của TẤT CẢ workstreams: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2` (main Pages đang phát hành, `version.json.source_sha=2b4f252aa34d0662524f6933c652921528ce7b39`).
- **Mốc bảo toàn:** branch `checkpoint/20261118-before-inline-admin-review`, commit `859b8e931637a54be5af4b66855999718a2a0934`. Tree không thay đổi so với BASE.
- **10 luồng tổng cộng**: G00 Tổng chỉ huy + G01–G09 thực hiện; chín nhánh đã tạo từ đúng BASE; không được dùng `main`/branch của luồng khác làm base.
- Đây là TÁC VỤ LẬP TRÌNH độc lập: mỗi nhóm hoàn thiện code + fixture/test + checkpoint + commit/push + PR; không dừng ở mô tả kế hoạch; không cần chờ luồng khác. Test thiếu môi trường phải ghi NOT_RUN, không báo PASS.
- Không sửa `source/AGENTS.md`, `README.md`, `package.json`, GitHub workflows, `source/scripts/pages-release-policy.mjs`, Firebase Rules, schema/auth/CAS/lease, nguồn Excel/dữ liệu sản xuất, `version.json`, `main`, hay `HOPHDND_PAGES_APPROVED_MAIN_SHA`; tuyệt đối không tự merge/publish/deploy. Bất kỳ thay đổi nhạy cảm phải nêu blockers và giao G00 quyết định. Không force-push, không reset nhánh khác.
- Chỉ người quản trị có quyền mới thấy controls chỉnh giao diện dùng chung; guest/nhân viên không có quyền tuyệt đối không thể thay đổi cấu hình qua DOM giả. Chế độ chỉnh giao diện không được bật chế độ chỉnh hồ sơ.
- Mọi thay đổi giao diện có **xem trước/nháp** khi thích hợp và **chỉ ghi khi thao tác kết thúc** (drop, Enter, xác nhận). Không ghi từng pixel/keystroke. Với cấu hình dùng chung, dùng lại writer Firebase revision/CAS và xử lý conflict/rollback hiện có; không tự ghi trực tiếp Firebase từ component.
- Không biến sở thích cá nhân localStorage (bộ màu/mẫu popup) thành cấu hình chung. Không làm thay đổi số liệu, định nghĩa “Không phải trình”, danh mục trạng thái khóa hay quyền nguồn.
- Tiêu chuẩn test: `cd source && npm run typecheck && npm test`; `npm run build:compact:qa` với smoke/Chrome fixture phù hợp, `npm run test:spark` (Firebase emulator). Nếu môi trường không có khả năng chạy thật, ghi `NOT_RUN` + lý do, code/test fixtures vẫn phải được bàn giao. Phân biệt Code SHA và Tested SHA; **không DONE** khi chưa có đúng bằng chứng (hoặc nêu rõ PoC NOT_RUN).
- Kích thước/UX: desktop 1920x1080, 2K, 900px và màn hình hẹp; keyboard (Tab, Enter, Esc, Alt+arrow khi phù hợp), focus/ARIA, text wrap, drag vs sort vs edit, scroll không nhảy, prefers-reduced-motion.
- Mỗi luồng dùng file báo cáo riêng `source/docs/tasks/INLINE_ADMIN_GXX_20261118.md`; ghi việc đã làm, các file đổi, tests + PASS/FAIL/NOT_RUN, ghi SHA, ảnh/fixture khi có, rủi ro, PR URL. Không sửa cùng file báo cáo hay COMMON của người khác.
- Báo cáo khi hoàn tất vào chat: `GXX | BRANCH | PR | Code SHA | Tested SHA | PASS / FAIL / NOT_RUN | phần đã chạy thực sự | blockers`. Một nhánh PoC độc lập đã PASS không đồng nghĩa đã tích hợp và nghiệm thu website thực tế.
- G00 chủ trì cherry-pick/merge/corridor integration, QA toàn hệ thống, giải quyết giao diện nối callback, cuối cùng phát hành đúng Pages gate; chỉ xin phê duyệt SHA một lần cho đợt phát hành tổng hợp nếu chính sách bắt buộc.

## Ranh giới tệp: CHỈ một owner

| Luồng | Nhánh đã tạo | File được phép sửa trong source/src (ngoài file mới & test/docs mới riêng) | Mục tiêu |
| --- | --- | --- | --- |
| G01 | `g01/20261118-inline-list` | `features/items/ItemList.tsx`, `features/items/ColumnHeader.tsx`, `features/items/ItemSummaryCards.tsx` | Tên danh sách/đầu cột/nhóm, ẩn–hiện cột/thẻ, phạm vi tìm cạnh ô search |
| G02 | `g02/20261118-inline-report-tables` | `app/App.tsx`, `features/reports/ReportTable.tsx` | Chỉnh tên/hiện/ẩn và kéo thứ tự báo cáo, kéo/ẩn/reorder cột tại report đang hiển thị |
| G03 | `g03/20261118-report-visual-toolbar` | `features/settings/ReportLayoutPanel.tsx`, `features/settings/ReportSettings.tsx` | Thanh phong cách/màu/font báo cáo độc lập, áp dụng vào preview + callback; G00 nối vào trang chạy nếu chạm App |
| G04 | `g04/20261118-popup-direct-edit` | `features/reports/ReportDetailGrid.tsx`, `data/report-detail-preferences.ts` (nếu cần) | Popup rộng kéo cạnh, tên nhóm/cột, ẩn cột, reset, thẻ xem/nháp |
| G05 | `g05/20261118-column-catalog` | `features/items/ItemColumnPanel.tsx`, `features/catalogs/CatalogPanel.tsx` | Quản lý dropdown/cột ngay tại công cụ cột, thêm/sửa/xóa/reorder lựa chọn có kiểm tra |
| G06 | `g06/20261118-status-colors` | `features/items/StatusPaletteManager.tsx`, `data/status-palettes.ts` (nếu cần) | Palette inline gần chú giải, live preview, reset cá nhân, không chạm data |
| G07 | `g07/20261118-resize-gestures` | `components/ColumnResizeHandle.tsx`, `components/DeferredWidthInput.tsx` (nếu tồn tại) | Bộ kéo biên/cỡ cửa sổ dùng chung: pointer, keyboard, touch, clamp, commit-on-end |
| G08 | `g08/20261118-l03-inner-widths` | `features/items/CompactGroupedValue.tsx`, `features/items/compact-columns.ts` (nếu cần), tạo `features/items/L03InlineWidthControl.tsx` riêng | Trực quan 5 độ rộng L03, có API callback/harness độc lập; G00 nối writer từ ItemList |
| G09 | `g09/20261118-inline-ui-qa` | Không sửa source sản phẩm hiện hữu; chỉ tạo `source/scripts/inline-admin-*.mjs`, `source/tests/inline-admin-*.test.tsx`, fixture/ docs nhiệm vụ riêng | Browser QA, role/permission, keyboard, 1920x1080, regression, kiểm tra bảo vệ dữ liệu |

Mỗi luồng tự thêm file component/CSS theo prefix `inline-gXX-` riêng, tự thêm test tên `inline-admin-gXX-*.test.tsx` hoặc `.test.ts`, fixture `inline-admin-gXX-*`. Không đổi tệp người khác sở hữu. G02 là owner DUY NHẤT được sửa App.tsx trong các nhánh thực thi. G03/G08 không chờ G02/G01; tạo prop/callback + fixture thực thi độc lập. G00 tích hợp vào host cuối cùng.

## Tiêu chí nghiệm thu chung

- Không thêm điều khiển rối mắt vào chế độ xem. Admin có "Chỉnh giao diện" rõ ràng, controls chỉ xuất hiện khi thích hợp.
- Giữ các thao tác đã tốt: bảng Danh sách kéo tiêu đề đổi vị trí và kéo mép đổi rộng, popup kéo cột, click sửa ô, report click ô mở popup, các bộ lọc.
- Không trộn **ẩn cột** với **xóa cột**, **ẩn bảng** với **xóa báo cáo**, **ẩn cột Không phải trình** với **thay đổi quy tắc đếm**, hoặc **tô màu** với **sửa trạng thái nghiệp vụ**.
- Không ép auto-release khi source thay đổi ngoài allowlist; chỉ gộp và publish cuối cùng sau khi kiểm thử đầy đủ và đúng quy định phê duyệt một SHA tổng hợp.
- Chỉ G00 kết luận DONE tích hợp và phát hành; nhóm con có thể DONE phần việc độc lập khi test đủ.

## Sổ theo dõi G00 (cập nhật sau báo cáo từng PR)

| G | Branch | PR | Code SHA | Tested SHA | CI | Integration | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G01 | g01/20261118-inline-list | — | — | — | NOT_RUN | HOLD | |
| G02 | g02/20261118-inline-report-tables | — | — | — | NOT_RUN | HOLD | |
| G03 | g03/20261118-report-visual-toolbar | — | — | — | NOT_RUN | HOLD | |
| G04 | g04/20261118-popup-direct-edit | — | — | — | NOT_RUN | HOLD | |
| G05 | g05/20261118-column-catalog | — | — | — | NOT_RUN | HOLD | |
| G06 | g06/20261118-status-colors | — | — | — | NOT_RUN | HOLD | |
| G07 | g07/20261118-resize-gestures | — | — | — | NOT_RUN | HOLD | |
| G08 | g08/20261118-l03-inner-widths | — | — | — | NOT_RUN | HOLD | |
| G09 | g09/20261118-inline-ui-qa | — | — | — | NOT_RUN | HOLD | |
