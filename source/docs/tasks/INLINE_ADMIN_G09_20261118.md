# G09 — README chạy QA độc lập và checkpoint (18/11/2026)

**Luồng:** G09 — QA đa cửa sổ, quyền và regression. **BASE cố định:** `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`.
**Nhánh:** `g09/20261118-inline-ui-qa`. **Phạm vi:** chỉ fixture, script QA, một tệp test và checkpoint G09, không sửa component/App, writer/Firebase, release hoặc biến.
**Code SHA:** ghi theo commit HEAD nhánh sau cập nhật checkpoint; xem GitHub branch/PR. **Tested SHA:** tách bằng chứng local ở phần dưới; KHÔNG coi SHA branch cuối đã được full integration test.
**PR:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/216 (**DRAFT**, không merge/publish).

## Bàn giao

- `source/scripts/inline-admin-g09-fixture.mjs` — trang HTML fixture cố định 4 hồ sơ giả; writer **chỉ localStorage**, BroadcastChannel + storage event, ba vai trò mô phỏng. Không gọi Firebase/Sheets, không đại diện phân quyền backend.
- `source/scripts/inline-admin-g09-qa.mjs` — runner Node + Chromium CDP không yêu cầu Playwright, server chỉ loopback. Fixture mode: click/pointer/keyboard, rename, reorder, resize, hide, search không dấu, drilldown, popup, personal palette, multi-tab, dropdown Esc, viewports 1920×1080/2560×1440/900/390, reduced motion, horizontal scroll, screenshot, PDF capability. Compact mode: mount **component thật** ở `dist-compact-qa`, kiểm ItemList, guest và ReportDetailGrid bằng dữ liệu RAM.
- `source/tests/inline-admin-g09-regression.test.tsx` — Vitest module thật cho filter tiếng Việt, reorder, adjacent resize, hide không xóa dữ liệu, count report/summary và đường quyền `mayEdit`.
- `source/docs/tasks/INLINE_ADMIN_G09_20261118.md` — tài liệu này, README và matrix sau cherry-pick.

## Cách chạy, từ root repository (không dùng production Firebase)

```sh
cd source
node --check scripts/inline-admin-g09-fixture.mjs
node --check scripts/inline-admin-g09-qa.mjs
node scripts/inline-admin-g09-qa.mjs --mode=contract
npm ci
npm run typecheck
npx vitest run tests/inline-admin-g09-regression.test.tsx
npm test
node scripts/inline-admin-g09-qa.mjs --mode=fixture
npm run build:compact:qa
node scripts/inline-admin-g09-qa.mjs --mode=compact
```

Khi Chrome không tự tìm thấy: `CHROME_PATH=/path/to/chromium node scripts/inline-admin-g09-qa.mjs --mode=fixture`. Dùng Chrome bình thường cho phép `http://127.0.0.1`; trong máy có enterprise `URLBlocklist: ["*"]` phải ghi **NOT_RUN**, KHÔNG tắt chính sách. Kết quả sinh ở `source/qa-results/inline-admin-g09/results.json` và PNG từng viewport; có thể truyền `--out=...` hoặc `--dist=...`. Không commit screenshot/report sinh cục bộ khi chưa kiểm bí mật. Runner **exit 1** khi assertion fail; **exit 2** khi thiếu build/browser hoặc Chrome bị policy chặn; exit 0 khi các bài được chạy PASS, nhưng vẫn có `NOT_RUN` và `PENDING_INTEGRATION` riêng, không có nghĩa app nghiệm thu.

Cần thêm emulator và full app integration test chỉ sau khi G00 nối G01–G08; emulator project phải là `demo-hdnd`, Auth/RTDB loopback, không chạm `hophdnd-8b7b2`. Tuyệt đối không dùng URL production làm QA writer.

## Kết quả thực thi tại môi trường hiện tại — phân biệt chạy thật với dự kiến

| Bài / chứng cứ | Expected | Observed | Kết luận |
| --- | --- | --- | --- |
| Node cú pháp 2 tệp mjs | Không có SyntaxError | `node --check` cho cả hai, exit 0 | **PASS** |
| G09 contract `--mode=contract` | Tất cả contract pass | 7 PASS, 0 FAIL, 1 NOT_RUN, 7 PENDING_INTEGRATION; `results.json` local | **PASS 7** |
| Chrome thật local | Truy cập fixture loopback, UI assert/screenshot | Chromium 144 có enterprise `URLBlocklist: ["*"]`, trả `chrome-error://chromewebdata` cho 127.0.0.1 | **NOT_RUN**, browser policy |
| Unit Vitest G09 | 7 bài module thật | Không có checkout đầy đủ/node_modules ở container; script đã commit | **NOT_RUN** |
| `npm run typecheck`, `npm test` | Exit 0 | Không có full source checkout/dependencies | **NOT_RUN** |
| `npm run build:compact:qa` và compact browser | Component thật hiện trên fixture | Không có full checkout/build; Chrome bị policy | **NOT_RUN** |
| `npm run test:spark` (Auth/RTDB Emulator) | Permission/lease/CAS/test no-data-write | Thiếu Firebase CLI/deps/source checkout; không được kết luận quyền từ fake-role | **NOT_RUN** |
| A4 của WebApp | Đúng trang/không mất số | Chưa chạy app tích hợp và PDF thật | **NOT_RUN** |
| Touch bằng thiết bị thật | Kéo resize/reorder clamp, không đè dữ liệu | Không có thiết bị/tương tác touch thực | **NOT_RUN** |
| Firebase sản xuất | Không truy cập | Không thao tác, không chạy credentials | **PASS** về giới hạn phạm vi, **không phải** bài backend |

**Code SHA gần nhất đã ghi trước checkpoint:** `486878b909d9970d00fe65f6e429bc40f8da319c`.
**Tested SHA trong runner local:** `null` do không có git checkout; nội dung 2 script được chạy trước khi GitHub tạo commit (phiên bản đã tải lên không sửa tiếp). **Verified CI SHA:** **NOT_RUN**; G00/CI cần chạy trên exact final head, đặt `G09_CODE_SHA=$(git rev-parse HEAD)` để log chính xác. Không được tự coi `Code SHA` là `Tested SHA` khi các tests chưa chạy tại SHA đó.

## Bảng acceptance G00 dùng sau khi tích hợp

| ID | Chịu trách nhiệm | Expected (đo thực) | Tình trạng |
| --- | --- | --- | --- |
| A01 Rename inline | G01/G02/G04 | Chỉ admin, Enter/blur xong mới writer 1 lần, Esc hủy, guest/staff không sửa kể cả DOM forgery | PENDING_INTEGRATION |
| A02 Ẩn/hiện và reorder cột/bảng/thẻ | G01/G02 | Thứ tự, khả kiến đổi; tổng số, Excel A–O và ID dữ liệu không đổi, toggle không delete | PENDING_INTEGRATION |
| A03 Report order/resize | G02/G03 | Pointer + keyboard, min/max, không lưu mỗi pixel, count trong ô khớp popup | PENDING_INTEGRATION |
| A04 Màu trạng thái/font | G03/G06 | Chỉ đổi style, không đổi trạng thái nghiệp vụ; palette cá nhân giữ localStorage | PENDING_INTEGRATION |
| A05 Popup width/nhãn | G04/G07 | Resize trên desktop/touch/keyboard, clamp, focus, modal/backdrop, cancel và CAS rollback | PENDING_INTEGRATION |
| A06 Mini catalog | G05 | Cấm trùng, giữ lựa chọn cũ, Escape/focus, dropdown không vượt khung và không trôi khi scroll | PENDING_INTEGRATION |
| A07 L03 năm rail | G08 | Năm độ rộng riêng, clamp min/max, không tràn hay đổi dữ liệu | PENDING_INTEGRATION |
| A08 Quyền 3 role × 2 tab | G00 | Admin shared-config writer CAS revision; staff chỉ quyền dữ liệu hiện hành; guest read-only; tab conflict/rollback | NOT_RUN, Emulator |
| A09 Ma trận viewport | G00 | 1920×1080, 2560×1440, 900px, 390px; focus, reduced motion, horizontal scroll, no clipped dropdown | NOT_RUN cho WebApp |
| A10 A4/print và số liệu | G00 | Bảng/cột/chỉ tiêu không mất, A4, tổng và drilldown chính xác | NOT_RUN cho WebApp |
| A11 Touch và keyboard | G00 | real pointer/touch, Tab/Enter/Esc/Alt+Arrow, clamp; không ghi lúc drag | NOT_RUN cho WebApp |

Đối với **fixture G09**: thao tác mô phỏng, bất biến về ghi dữ liệu nguồn và role là logic QA giả, không đủ chứng cứ kết luận quyền Firebase thật, A4 sản phẩm hoặc Chrome component thật.

## Điểm nối G00 cần thực hiện

1. Cherry-pick PR G09 rồi chạy đầy đủ lệnh README ở **exact integrated SHA**; thu `results.json`, screenshot và CI Artifact, không chỉnh source sản phẩm để phục vụ G09.
2. Bảo đảm thiết lập trình duyệt CI được phép localhost; không cố bypass URL policy của container này. Nếu cần QA App thật, dùng kịch bản Emulator hiện hữu `smoke-pages-browser.mjs` / `final-app-qa-runner.mjs` kèm các assertions A01–A11; G09 fixture chỉ là contract mechanics.
3. Nối từng callback chung G01–G08 vào writer revision/CAS của App do G02/G00 quản lý; G09 không sở hữu host và **chưa test** quyền backend.
4. So sánh trước/sau snapshot dữ liệu giả trong Emulator cho mọi thao tác bố cục, đặc biệt khi 2 tab/2 user, đồng thời xác nhận personal localStorage không bị đưa lên shared config.
5. Kiểm HTML report và PDF A4, drilldown, bảng tổng số thật, dữ liệu Excel nguồn A–O trong phiên bản tích hợp.

**Rủi ro còn mở:** chưa chạy browser Chromium vì managed URLBlocklist; unit/typecheck/Emulator chưa chạy tại exact GitHub SHA; kịch bản staff chưa xác nhận trên UI thật; chưa có visual screenshots; A01–A11 chưa nghiệm thu app tích hợp. **Trạng thái: INDEPENDENT_QA_SCAFFOLD_DELIVERED, INTEGRATION_HOLD**, không tuyên bố DONE toàn hệ thống.

## PR và trạng thái cuối của G09

- **URL PR:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/216
- **Base PR:** `main` tại `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`, không đổi BASE.
- **Code SHA:** SHA của commit checkpoint sau cùng tra tại GitHub PR head; commit `2f6ae91366ac7e35e7004f1836625f89e77cbe07` là mốc trước bổ sung URL PR.
- **Tested SHA:** `NOT_RUN_ON_GIT_CHECKOUT` (runner chạy local chưa có SHA Git), không được ghi bằng Code SHA.
- **Status:** `INTEGRATION_HOLD`; G00 cần xác nhận CI/unit/Chrome/Emulator + chốt các acceptance sau gộp.
