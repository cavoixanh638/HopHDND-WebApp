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

## Sổ theo dõi G00 — kiểm tra live 18/11/2026

**G00 staging:** `integration/20261118-inline-admin-g00` đã tạo từ `main` `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`, chưa gộp file nào. **Không tích hợp trực tiếp vào main từng PR**: cần gom đủ thành một PR release, tránh tự phát hành giao diện chưa liên kết. Đã kiểm tra diff từ BASE: 9 nhánh đều ahead>0, behind=0, các tệp source sản phẩm thuộc phạm vi owner, không trùng nhau. Tuy nhiên callback/host wiring vẫn cần G00.

| Luồng | PR | PR HEAD 18/11 | CI exact HEAD (mới nhất lúc ghi) | Integration | Ghi chú / chặn |
| --- | --- | --- | --- | --- | --- |
| G01 | [#212](https://github.com/cavoixanh638/HopHDND-WebApp/pull/212) DRAFT | `67caadb30f1d` | 1 PASS / 9 chờ; [Verify #44290471964](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290471964) QUEUED | HOLD | Lỗi TS1005 của SHA cũ đã sửa; chưa có typecheck/test trên HEAD cuối. Nối header G05 và rail G08, xác thực CAS |
| G02 | [#210](https://github.com/cavoixanh638/HopHDND-WebApp/pull/210) DRAFT | `9dc1e7fd68ab` | 5 PASS / 5 chờ; [Verify #44290341826](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290341826) SUCCESS | HOLD | Cần kiểm tra Chrome, A4, quyền và gắn toolbar G03 + quyền G04 vào App |
| G03 | [#211](https://github.com/cavoixanh638/HopHDND-WebApp/pull/211) DRAFT | `be092971fb32` | **9 PASS / 1 FAIL**; [Verify #44290118049](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290118049) FAIL 3 unit | BLOCKED | Trimming title/optional accent trong adapter fixture và test font cũ; G00 comment chi tiết vào PR; đã chuyển lại DRAFT |
| G04 | [#213](https://github.com/cavoixanh638/HopHDND-WebApp/pull/213) DRAFT | `cc99b8c1930f` | 7 PASS / 3 chờ; [Verify #44290198795](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290198795) IN_PROGRESS | HOLD | G00 gắn `canCustomizePopup={adminTools}` trong App, soát localStorage và viewport |
| G05 | [#209](https://github.com/cavoixanh638/HopHDND-WebApp/pull/209) DRAFT | `3cf212a16ba8` | **7 PASS / 1 FAIL / 2 chờ**; [Verify #44290156765](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290156765) FAIL 3 unit | BLOCKED | `item-viewport-width.test.tsx` đòi `ColumnChoiceEditor` cũ và cho thêm status chuẩn; G00 xử lý hợp đồng test khi tích hợp, không mở khóa trạng thái để chạy test; comment PR |
| G06 | [#217](https://github.com/cavoixanh638/HopHDND-WebApp/pull/217) DRAFT | `82a5879ccade` | 0 PASS / 9 chờ; [Verify #44291500170](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44291500170) QUEUED | HOLD | Synthetic Chrome riêng PASS trong checkpoint; real app NOT_RUN; cần kiểm palette trong dialog |
| G07 | [#214](https://github.com/cavoixanh638/HopHDND-WebApp/pull/214) DRAFT | `90c88d95d0c7` | **0 PASS / 1 FAIL / 9 chờ**; [Schema #44290593760](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290593760) FAIL TypeScript | BLOCKED | Các ký tự `\\n` literal trong `inline-admin-g07-resize-gestures.test.tsx` dòng 140/179 gây TS1127/TS1434; đã comment G07 sửa và chạy lại exact HEAD |
| G08 | [#215](https://github.com/cavoixanh638/HopHDND-WebApp/pull/215) DRAFT | `2e9edf9b5a94` | 1 PASS / 9 chờ; [Verify #44290589004](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290589004) QUEUED | HOLD | Chỉ PoC callback độc lập, G00 phải nối L03 widths vào ItemList CAS rồi browser QA |
| G09 | [#216](https://github.com/cavoixanh638/HopHDND-WebApp/pull/216) DRAFT | `82e48b0f937` | 1 PASS / 9 chờ; [Verify #44291693813](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44291693813) QUEUED | HOLD | QA fixture 7 PASS trong Node local; Chrome bị URLBlocklist, không phải app QA. Chạy test script G09 trên integrated HEAD |

**Lưu ý:** số lượng PASS là workflow đã kết thúc SUCCESS, không đồng nghĩa đã đạt các acceptance test G00. Checkpoint của nhiều nhánh mô tả Code SHA trước commit docs; lấy **PR HEAD + CI exact SHA** mới đủ bằng chứng. Các trạng thái ghi tại thời điểm kiểm tra và có thể thay đổi khi worker tiếp tục commit.

## Kế hoạch tích hợp và thứ tự xử lý

1. **P0 unblock ngay:** G07 sửa TS syntax literal backslash-n và chạy Typecheck; G03 chữa 3 unit FAIL (soát title trim, optional accent, legacy 10-font UI test); G05 giữ status chuẩn immutable, G00 cập nhật legacy test dựa trên contract mới. Không nới logic an toàn để qua test.
2. **Đóng đủ CI:** Chờ các nhánh còn lại có GitHub Verify SUCCESS trên đúng SHA gần nhất; không lấy PASS của commit cũ, không coi queued là PASS. Tránh tạo commit checkpoint liên tục để giảm queue Actions.
3. **G00 lắp vào nhánh staging, không đụng main:** đưa QA G09, primitive G07 và các PR độc lập đã PASS; tích hợp G01 + G05 + G08 qua `focusColumnKey` và `l03InlineEditor` dùng `applyViewerLayout` CAS; tích hợp G02 + G03 live toolbar và G04 popup admin gate; G06 palette giữ localStorage cá nhân.
4. **Full integrated regression:** chạy `npm run typecheck`, `npm test`, `npm run test:spark`, Chrome CDP/fixtures G09; viewport 1920x1080, 2560x1440, 900/390, mouse/touch/keyboard, A4, không ghi hồ sơ khi sửa bố cục, guest/staff không có controls, CAS conflict/rollback 2 phiên, số thống kê không đổi.
5. **Chỉ khi toàn bộ PASS:** PR staging duy nhất vào `main`, bảo toàn checkpoint ban đầu; bảo đảm Pages gate nhận đúng SHA sau merge và tự động phát hành nếu đủ điều kiện; thay đổi bảo vệ thì chỉ xin phê duyệt duy nhất SHA bản cuối. Kiểm `publish=SUCCESS`, `version.json.source_sha` và GitHub Pages Deploy trước khi nói đã xuất bản.

**Chưa có PR nào được G00 merge/publish. Không thay dữ liệu/Firebase production.**
