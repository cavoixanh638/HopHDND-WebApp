# HỒ SƠ BÀN GIAO CHO GEMINI — THIẾT KẾ LẠI GIAO DIỆN HopHDND

**Ngày chốt hồ sơ:** 28/10/2026 (Asia/Bangkok). **Loại bàn giao:** UI/UX và frontend; **không** bàn giao quyền vận hành Firebase production.

## 0. Tóm tắt điều hành

- Repository duy nhất: **[cavoixanh638/HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp)**. URL người dùng xem giao diện hiện tại: **https://cavoixanh638.github.io/HopHDND-WebApp/**.
- **Snapshot source trước khi thêm hồ sơ bàn giao:** `c5cc9838c646af39d07b810233d6ea75065b7a25` (main; generated Pages assets commit, parent là `faf649b0f8597c563e7fd378c42ad54cfcc99d4b`).
- Đã hoàn thành UI V2: PR [#84](https://github.com/cavoixanh638/HopHDND-WebApp/pull/84). Sau phản hồi ảnh thật, đã sửa chữ quá nhỏ, loại bỏ mẫu hiển thị cá nhân, sửa cuộn dọc: PR [#86](https://github.com/cavoixanh638/HopHDND-WebApp/pull/86), merge `faf649b0f8597c563e7fd378c42ad54cfcc99d4b`.
- Kiểm thử PR #86: Verify source, unit, browser Chrome, Firebase Emulator đều PASS; Pages publish + deploy exact `faf649b`: [publish #40540518313](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40540518313), [GitHub Pages deploy #40540517515](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40540517515), [Firebase operational QA #40540518324](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40540518324), đều SUCCESS. Việc này không xác nhận Firebase production đã được kiểm thử hoặc kích hoạt.
- PR **[#83 SECURITY HOLD](https://github.com/cavoixanh638/HopHDND-WebApp/pull/83)** còn **DRAFT, CHƯA MERGE/DEPLOY**: cô lập khách vào bản báo cáo/danh sách admin công bố, cấm đọc raw Firebase. Không kéo PR #83 vào nhánh UI. Các PR Supabase #73/#75/#77 tạm dừng.
- Mục tiêu Gemini: **thiết kế lại giao diện đẹp, thoáng, nhất quán, dễ đọc, ít thao tác, phù hợp màn hình làm việc lớn**, không “làm lại từ đầu” phần dữ liệu/nghiệp vụ và không làm mất các chức năng đang dùng.

## 1. Kiến trúc và bản đồ chỉnh sửa

| Phạm vi | Mã nguồn thực tế | Chú ý |
| --- | --- | --- |
| Điểm vào Pages | `source/src/pages-main.tsx` | Không đổi khởi tạo Auth/data trong công việc UI |
| Bố cục ứng dụng, điều hướng, trang thống kê/list | `source/src/app/App.tsx` | Đang được dùng trên GitHub Pages |
| Danh sách chi tiết và chế độ hiển thị | `source/src/features/items/ItemList.tsx` | Nơi quyết định chế độ gọn/cột gốc và quyền editor |
| 3 thẻ tiến độ | `source/src/features/items/ExecutiveProgressCards.tsx` | Dùng chung logic Bảng tổng hợp |
| Bảng gọn 6 cột/4 cụm | `source/src/features/items/ExecutiveDetailTable.tsx` | Phải giữ `renderField` theo quyền từng trường |
| CSS giao diện chi tiết | `source/src/features/items/executive-layout.css` | Các kích thước, cuộn dọc, sticky headers |
| CSS hệ thống và theme | `source/src/styles/app.css`; `source/src/features/items/item-frame.css` | Nhiều lớp CSS có thể override nhau; kiểm tra computed style |
| Bảng báo cáo tổng hợp | `source/src/features/reports/ReportTable.tsx` | Tỷ lệ/trạng thái/đếm phải tương thích thẻ mới |
| Logic báo cáo nghiệp vụ | `source/src/domain/reporting.ts`, `source/src/domain/report-workflow.ts` | **Không sửa để phục vụ mỹ thuật** |
| Gộp cột / viết tắt tên | `source/src/features/items/compact-columns.ts` | Giữ dữ liệu đầy đủ trong editor/search |
| 15 cột Excel nguồn | `source/src/data/item-preferences.ts` | Mã khóa cột không thay đổi |
| Cấu hình/report layout dùng chung | `source/src/data/report-preferences.ts`, `source/src/data/shared-config.ts` | Admin quyết định layout |
| Firebase Auth, dữ liệu và edit | `source/src/state/use-firebase.ts`, `source/src/data/firebase-repository.ts`, `source/src/data/cell-edit-leases.ts` | Ngoài phạm vi UI, bất biến bảo mật |
| Test hồi quy UI | `source/tests/executive-detail-ui.test.tsx`, `source/tests/executive-detail-hotfix.test.ts`, `source/scripts/smoke-pages-browser.mjs` | Bắt buộc giữ xanh |
| CI | `.github/workflows/verify-source.yml`, `.github/workflows/publish-pages.yml` | PR được test; merge main tự publish Pages |

**Không sửa trực tiếp** `index.html` ở root, thư mục `assets/`, file HTML standalone build hoặc preview cũ để thay UI nguồn. Chúng được generate qua Vite/GitHub Actions.

**Đọc thêm:** [đặc tả UI V2](EXECUTIVE_DETAIL_UI_V2_2026-10-27.md), [kiến trúc](../ARCHITECTURE.md), [từ điển dữ liệu](../TU_DIEN_DU_LIEU.md), [hướng dẫn kỹ thuật](../../AGENTS.md), [trạng thái](../CURRENT_STATE.md), [workboard](../WORKBOARD.md).

## 2. ĐẶC TẢ ĐÃ CHỐT — PHẦN A (3 thẻ phía trên danh sách)

Không có nhãn “Khâu 01 / Khâu 02 / Khâu 03”. **Đúng tên:**
1. **Tiến độ xin ý kiến Thành ủy**.
2. **Tiến độ trình xây dựng NQ**.
3. **Tiến độ trình ban hành NQ**.

Mỗi thẻ có: tên, **% hoàn thành**, **đã hoàn thành/tổng số**, thanh ngang phân đoạn (độ dài mỗi đoạn theo số hồ sơ tương ứng), các ô thống kê **bấm được để lọc danh sách**. Đếm dựa trên `reportItems`/`aggregateReport`/`reportStage` với đúng cấu hình; không tạo KPI ảo. Không gộp nhóm khi chưa chắc trạng thái; dữ liệu lạ/không chuẩn hóa phải nêu riêng, không mặc định hoàn thành.

| Thẻ | Thứ tự ô và đoạn bar từ trái sang phải |
| --- | --- |
| Thành ủy | **Sở chưa trình** → **VP đang thực hiện** → **Bước tiếp theo** → **Đã có TBKL** |
| Xây dựng NQ | **Sở chưa trình** → **VP đang thực hiện** → **Đã trình, chưa có QĐ** → **Đã có QĐ chấp thuận** |
| Ban hành NQ | **Sở chưa trình** → **VP đang thực hiện** → **Đã trình HĐND TP** |

**“Bước tiếp theo”** là *một ô tổng hợp*, bằng số ở ba trạng thái `Đã gửi ĐU` + `ĐU đã gửi TU, chưa họp` + `Đã họp/xin phiếu, chưa có TBKL`. **“Đã trình, chưa có QĐ” là một trạng thái duy nhất**, nguồn có nhãn `Đã trình HĐND, chưa có QĐ`. Thẻ ban hành hiện theo `council`, bao gồm **NQ và BC** theo cấu hình báo cáo; không tự loại BC chỉ vì tiêu đề ngắn.

**Màu, thứ tự, phân cấp thị giác bắt buộc:**
- Sở chưa trình: đỏ `#DC2626` (thanh); ô nền `#FEE2E2`, chữ `#B91C1C`.
- VP đang thực hiện: cam `#D97706` (thanh); ô nền `#FEF3C7`, chữ `#92400E`.
- Trạng thái giữa (Bước tiếp theo; Đã trình, chưa có QĐ): **nhạt**, thanh `#BFDBFE`, ô nền `#EFF6FF`, chữ xám trung tính (không nổi bật bằng đỏ/cam/xanh).
- Đã có kết quả cuối: xanh `#059669` (thanh); ô nền `#D1FAE5`, chữ `#047857`.
- Ngoài danh mục: xám trung tính, ghi chú; không cộng vào hoàn thành.

**Không sử dụng các màu trạng thái chính ngẫu nhiên hay đảo thứ tự thanh.** Gemini được làm đẹp khung, typography, khoảng cách, biểu tượng nhưng phải giữ ý nghĩa và độ ưu tiên.

## 3. ĐẶC TẢ ĐÃ CHỐT — PHẦN B (4 cụm / 6 cột)

| Cụm | Cột vật lý | Nội dung không được mất |
| --- | --- | --- |
| **01. Định danh & hồ sơ** | 1. **Mã** | `displayCode` dạng `NQ01` / `BC01` lấy theo Excel; không tự đánh `#01` |
| | 2. **Tên tờ trình & đơn vị chủ trì** | Dòng trên: badge **Loại VB** (`QPPL`/`HC`/`BC`) + **Sở/ngành chủ trì**; dòng dưới: **Nội dung trình** |
| **02. Trách nhiệm** | 3. **Lãnh đạo & chuyên viên** | **UBND**, **LĐVP**, **CV**; viết tắt tên cả 3 theo hàm cũ, giữ chức danh; Phòng ghi **trong ngoặc ngay sau CV**, không có dòng Phòng riêng; không lặp Sở |
| **03. Chuỗi tiến độ 3 khâu** | 4. **Tiến độ 3 khâu** | Dòng 1 `Thành ủy (TTTU) — Sở chưa trình`, cấp TU khác thì thay bằng cấp gốc; dòng 2 **Xây dựng NQ**; dòng 3 **Ban hành NQ**. Mỗi trường tiến độ vẫn tồn tại độc lập |
| **04. Theo dõi & chỉ đạo** | 5. **Tiến độ hiện tại** | Diễn biến; sửa riêng và lịch sử từng ô |
| | 6. **Ghi chú** | Ghi chú; sửa riêng và lịch sử từng ô |

**Gọn là mặc định nhưng KHÔNG bỏ bảng nguồn**. Nút `Tùy chọn từng cột` trở về kiểu xem/tùy chỉnh cũ, có lọc theo trường, ẩn/hiện, đổi vị trí/độ rộng, các tùy chọn gộp cột; `Hiện đủ cột Excel` cho phép xem đầy đủ 15 cột nguồn. **Không gộp dữ liệu backend**, chỉ là trình bày của giao diện.

Giữ tìm kiếm bằng giá trị gốc đầy đủ, phân loại theo mã, sở, người, nội dung, tiến độ, ghi chú; các tên viết tắt chỉ để hiển thị. Giữ người dùng bấm số liệu thẻ báo cáo để lọc đúng hồ sơ và xóa lọc.

## 4. VẤN ĐỀ UI ĐÃ PHÁT HIỆN VÀ ĐÃ SỬA — ĐỪNG TÁI PHÁT

**Ảnh phản hồi thực tế 27/10:**
1. Chữ trong các ô báo cáo quá nhỏ → PR #86 tăng font ô trạng thái lên **12.5px**, bảng **14px** theo CSS ưu tiên, số liệu rõ; không giảm 9px trên màn hình hẹp.
2. Khối **“Mẫu hiển thị cá nhân”** thừa và cản mắt → PR #86 **bỏ khỏi trang**, ngừng tự áp dụng saved preset trong browser. Không khôi phục mặc định hoặc làm phát sinh hai cấu hình cạnh tranh với admin; bảng nguồn theo từng cột vẫn tồn tại.
3. **Không cuộn xuống trong bảng chi tiết** → vùng `.executive-table-scroll` có `overflow-x:auto; overflow-y:auto; max-height:min(70vh,800px)`, scrollbar hữu hình; hai hàng tiêu đề sticky để đọc khi cuộn. Phải giữ cuộn dọc bằng chuột/touchpad/keyboard, cuộn ngang và toàn trang không tạo cuộn trùng khó dùng.

**Yêu cầu UX tiếp theo:** thanh trạng thái phải dễ phân biệt ngay khi nhìn; chữ và nút bấm dễ đọc; tránh công cụ lộ nhiều hàng gây đẩy bảng xuống; đồng bộ giao diện với Báo cáo tổng hợp; tối ưu desktop 1366–1920px nhưng responsive 390/768/1024px; không cắt dữ liệu dài hay tooltip sai vị trí; hỗ trợ zoom trình duyệt và thao tác bằng bàn phím.

## 5. Những gì TUYỆT ĐỐI KHÔNG được “thiết kế lại” cùng UI

- **Không đổi 15 trường nguồn Excel A–O**, `recordId`, `displayCode`, `revision`, mã định danh, công thức đếm, trạng thái gốc, báo cáo/hệ số hoàn thành.
- **Không thay đổi** permissions/Google UID, per-cell edit lease/lock/CAS, audit/history, freeze `OPEN/DRAINING/FROZEN`, đồng bộ realtime, transaction, nhập liệu, xuất Excel. Hai thiết bị đăng nhập **cùng một Google UID là hợp lệ**; không yêu cầu hai UID khác nhau để được xem/sửa theo quyền.
- **Không ghi dữ liệu Firebase production**, không triển khai RTDB Rules, không import/switch nguồn `dataSource=primary` hoặc xóa mirror, không sửa GitHub secret hay credential. App hiện dùng Firebase-only; nhân viên vẫn có thể dùng Google Sheet chuyển tiếp trước cutover có kiểm soát; không phát triển Supabase.
- **Chính sách khách đã chốt (chưa hoàn thành ở Cloud):** bất kỳ khách nào cũng có thể **xem** các bảng báo cáo/danh sách chi tiết theo **đúng layout admin cho phép**; **không được** xem raw `hdnd/items`, mirror Google Sheets, cấu hình, cột tùy chỉnh, quyền, hồ sơ nhân viên, UID, khóa/history nội bộ. Chỉ nhân viên Google được cấp quyền mới sửa trong phạm vi cho phép; admin mới quản lý. Đây là yêu cầu bảo mật bắt buộc, không phải thứ sửa bằng CSS/ẩn nút. PR #83 đang DRAFT và yêu cầu Cloud Rules/publisher + QA riêng; **main chưa được coi là an toàn theo chính sách này**.
- Chỉ áp dụng cá nhân hóa UI **nếu được duyệt lại**. Người dùng đã yêu cầu bỏ “Mẫu hiển thị cá nhân”, không thêm lại.
- **Không hợp nhất** PR #83, #73, #75, #77 và không tuyên bố Firebase production hoạt động chỉ vì GitHub Pages đã publish.

## 6. Định nghĩa hoàn thành của thiết kế Gemini

Một thay đổi UI có thể đề nghị hợp nhất khi đạt toàn bộ:

1. 3 thẻ đúng tên, đúng 3/4 trạng thái, %/tổng trùng Báo cáo tổng hợp theo cùng `ReportConfig`; nhóm giữa hiển thị nhạt; thanh ngang tỷ lệ đúng số hồ sơ, bấm lọc chính xác, trạng thái không rõ không bị âm thầm gộp.
2. Bảng mặc định 6 cột/4 cụm đầy đủ, có mã Excel, Loại VB, sở, rút gọn tên UBND/LĐVP/CV (Phòng), 3 tiến độ, **Tiến độ hiện tại** và **Ghi chú** riêng.
3. Chế độ `Tùy chọn từng cột` và `Hiện đủ cột Excel` còn dùng được; lọc, đổi kích thước, kéo cột và xem quyền hợp lệ; hiển thị cho khách không vượt quá dữ liệu admin duyệt.
4. Không xuất hiện khối mẫu hiển thị cá nhân. Không font 9–10px cho các ô quan trọng. Không mất scrollbar dọc độc lập. Hai hàng header sticky đúng.
5. Không làm gãy click sửa trong ô gộp, lịch sử, khóa ô, thu hồi quyền, lưu nháp, freeze; dữ liệu gốc và báo cáo không đổi.
6. Desktop 1366/1600/1920px, laptop 1024px, mobile 390px, zoom 125%, chuột + touchpad + keyboard được kiểm chứng trong Chrome. Ảnh trước/sau dùng dữ liệu mô phỏng, không tải thông tin nhạy cảm lên issue/PR công khai.
7. `cd source && npm ci && npm run typecheck && npm test && npm run docs:check && npm run build:pages` PASS; kiểm tra `Verify HopHDND source`, Chrome smoke, Firebase Emulator staging. Ghi SHA PR HEAD và bằng chứng chạy. Chỉ merge/publish Pages sau khi được chủ dự án duyệt UI.
8. Không nói “đã nghiệm thu Firebase production”: xác minh Cloud Rules, backup, cutover và hai tài khoản thực là cổng riêng chưa có bằng chứng.

## 7. Quy trình làm việc và commit bắt buộc cho Gemini

1. **Clone/fetch repo**; đọc `GEMINI.md`, `source/AGENTS.md`, tài liệu này, `source/docs/CURRENT_STATE.md`. Lấy mốc handoff cuối trong mục 8. Không dựa vào bản chụp cũ của cuộc chat.
2. Tạo nhánh mới kiểu `feat/gemini-ui-redesign-YYYYMMDD` từ đúng handoff commit, không từ branch security.
3. Đề xuất **wireframe / layout và bảng màu** bằng tài liệu hoặc preview dữ liệu mẫu; không đổi logic/backend trước khi đồng ý. Bắt đầu với ba thẻ và bảng chi tiết; các màn hình khác kiểm tra tương thích.
4. Tách commit nhỏ theo thay đổi (design tokens → thẻ báo cáo → 6 cột → responsive/scroll → QA) và ghi ảnh/changelog bằng dữ liệu giả.
5. Tạo PR vào `main`, chờ CI, đối chiếu ảnh thật, xác nhận người dùng, rồi mới merge. Không đẩy bản nháp thẳng lên production Pages (merge main có workflow deploy).
6. Nếu cần backend/permissions, mở issue/PR **tách biệt** và nêu lý do; không lén thay RTDB Rules trong commit UI.
7. Rollback bằng checkout/revert commit UI gần nhất; rollback code Pages **không** đồng nghĩa restore Firebase database.

## 8. Các mốc an toàn và trạng thái bàn giao

- **Bản nguồn chính trước hồ sơ bàn giao:** `c5cc9838c646af39d07b810233d6ea75065b7a25`. Gốc `index.html` và `assets/` được workflow tự sinh. Mốc này có UI V2 + sửa lỗi chữ/mẫu/cuộn đã publish.
- **Snapshot cũ trước UI V2:** nhánh `checkpoint/pre-ui-2026-10-27`, commit `5db47f0196afa3824a69fc7ca0f480eae12f0a8a`.
- **Mốc sau khi lưu bộ hồ sơ bàn giao (handoff checkpoint):** xem nhánh `checkpoint/gemini-ui-handoff-2026-10-28` và phần đầu `source/docs/CURRENT_STATE.md` sau khi PR tài liệu được merge. Không tự đoán SHA trước khi merge.
- Repo chưa chứng minh có bất kỳ thay đổi *chưa commit* nào trên Windows local; **commit GitHub không tự lấy các file chỉ có trên máy người dùng**. Nếu máy local còn chỉnh sửa phải `git status`/đối chiếu rồi commit riêng trước khi Gemini lấy.
- Dữ liệu Firebase, Rules Published, backup của người dùng, private keys, ảnh màn hình riêng tư không nằm trong commit handoff.

**Đầu ra mong muốn của Gemini:** bản UI cải tiến có preview/screenshot dữ liệu giả, mô tả điểm khác, diff sạch, test PASS, PR an toàn, và xác nhận không đổi nghiệp vụ/bảo mật. Chủ dự án sẽ duyệt giao diện trước khi phát hành.
