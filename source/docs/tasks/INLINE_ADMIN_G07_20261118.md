# G07 — Chuẩn hóa thao tác kéo chỉnh độ rộng (18/11/2026)

## Mốc và trạng thái

- **Luồng / owner:** G07 — chỉ sửa component `ColumnResizeHandle`, CSS/component/test `inline-g07-*` và chính checkpoint này.
- **Repository / nhánh:** `cavoixanh638/HopHDND-WebApp` / `g07/20261118-resize-gestures`.
- **BASE cố định:** `2ace3304a299d23ca6414c6ba6dc30f16266e9c2` (không rebase/reset).
- **PR:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/214 — **Draft, chưa merge**.
- **Code SHA:** `85f2183775b258242741e342cff1c1d8ce45982d` (commit cuối thay đổi source/tests trước checkpoint).
- **Tested SHA:** `85f2183775b258242741e342cff1c1d8ce45982d` — **10/10 workflow GitHub Actions SUCCESS** trên đúng Code SHA; danh sách bên dưới.
- **Checkpoint SHA:** commit ghi file này, lấy qua HEAD của nhánh sau khi push (chỉ docs, không sửa code từ Tested SHA).
- **Trạng thái độc lập G07:** **DONE — module + fixture + CI**. **Tích hợp/ nghiệm thu ứng dụng: HOLD (G00 quyết định)**. Không tự merge, publish, tác động Firebase production hay biến phát hành.

## Mã đã triển khai và sửa lỗi

1. `source/src/components/ColumnResizeHandle.tsx`: pointer session; native capture và window fallback (pointer id được kiểm tra trên move/up/cancel); hủy bằng Esc / cancel / blur / lost capture / unmount, trả nguyên trạng tất cả inline style; tránh double commit khi window và component cùng nhận pointerup; preview chỉ DOM/local, commit đúng một lần khi thao tác kết thúc.
2. Giữ nguyên `planAdjacentTransfer` / adjacent-first ở Danh sách, compensator bình thường của nơi gọi, giới hạn consumer (70/800, 80/1200, 60/1600), không sửa ItemList/ReportTable/ReportDetailGrid, không ghi Firebase theo pixel.
3. Trình bày và thao tác: CSS zoom/transform scale bằng tỷ số layout/visual, RTL, touch/pen primary, keyboard Arrow/Shift+Arrow/Enter/blur/Escape, ARIA min/max/current, tiêu đề và focus ring.
4. `source/src/components/inline-g07-resize.css`: vùng chạm vô hình 18px/24px cho coarse pointer, không thay vạch gutter; selector focus ring đặc hiệu hơn CSS cũ `outline:none` ở ItemList.
5. `source/src/components/inline-g07-DeferredWidthInput.tsx`: adapter **opt-in**, draft khi gõ, kiểm tra số nguyên + min/max, Enter/blur gọi tối đa một lần, Escape không lưu, giữ nháp khi host rerender.
6. `source/tests/inline-admin-g07-resize-gestures.test.tsx` (13 tests) và `source/tests/inline-admin-g07-deferred-width.test.tsx` (4 tests) kiểm tra pointer, touch/pen, cancel, outside window, adjacent+fallback, 70/800/1600, RTL/zoom, keyboard, unmount, không callback write trong preview, nhập số.
7. **Sửa blocker của G00:** thay 13 ký tự escape `\\n` ghi sai thành newline thật trong test (không bỏ test), sửa TypeScript `TS18048`/`TS2345` khi thu hẹp `options.adjacent` và `TS2554` ở fixture onBlur. Mọi lỗi này đã hết trên Tested SHA.

## Bằng chứng PASS chính xác trên Tested SHA

| Bài / nguồn GitHub Actions | Kết quả | Phạm vi |
| --- | --- | --- |
| [Verify source #44293209899](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293209899) | **PASS** | `npm run typecheck`, `npm test`, `npm run test:firebase`, Pages build, `npm run build:compact:qa`, Chrome smoke, dropdown Chrome |
| Vitest trong Verify source | **PASS** | 149 files / 1.061 tests PASS; 17 files / 170 tests SKIPPED từ suite chung, không báo nhầm thành FAIL |
| Fixture G07 trong Vitest | **PASS 17/17** | 13 tests gesture + 4 tests deferred input; không gọi Firebase trong test |
| [Real Spark List UI parity #44293210186](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293210186) | **PASS** | UI, Auth/RTDB emulator, build |
| [Chromium A4/paste #44293210037](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293210037) | **PASS** | Chromium giao diện thực với dữ liệu giả lập; in A4/PDF |
| [Firebase operational QA #44293209750](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293209750) | **PASS** | Emulator đa tài khoản, không production |
| [Direct CAS security #44293210296](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293210296) | **PASS** | CAS và two-process Chromium |
| [Two-browser ACK #44293209786](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293209786) | **PASS** | hai browser |
| [Guest save #44293210115](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293210115) | **PASS** | lưu quyền guest/employee |
| [Excel A–O #44293210044](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293210044) / [schema #44293210089](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293210089) | **PASS** | bảo toàn Excel và schema |
| [Simple Admin backup #44293209915](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293209915) | **PASS** | backup/maintenance trong môi trường kiểm thử |

**PASS khác:** đối chiếu GitHub compare BASE..HEAD chỉ thay 6 file thuộc phạm vi G07, 0 commit behind; PR #214 base main, Draft, chưa merge.

## NOT_RUN / phạm vi chưa được chứng minh

- **NOT_RUN:** Bài Playwright/Chrome **kéo trực tiếp từng tay cầm G07** bằng thiết bị cảm ứng/bút thật hoặc Safari/Windows high-DPI/RTL; Chrome smoke của hệ thống đã PASS nhưng không được quảng bá là đã mô phỏng toàn bộ chuỗi G07 trong browser thật.
- **NOT_RUN:** Chạy trực tiếp riêng lệnh `npm run test:spark`; các workflow Firebase/RTDB Emulator nêu trên đã PASS nhưng phải phân biệt tên lệnh.
- **NOT_RUN theo chỉ đạo:** Firebase production/real credentials, Rules deploy, merge/publish, approval variable; không thực hiện.

## Điểm nối giao G00

- `ColumnResizeHandle` giữ props cũ, không cần sửa nơi dùng; prop `onPreview` mới **chỉ cho local preview** và tuyệt đối không chuyển vào writer Firebase. Mọi commit vẫn được host quyết định CAS / quyền / localStorage theo hành vi gốc.
- File input hiện hữu `source/src/features/items/DeferredWidthInput.tsx` **không thuộc quyền sửa G07**: adapter `InlineG07DeferredWidthInput` có thể được G00/G04 import thay thế sau khi kiểm chứng popup thực tế. G07 không đổi host.
- G00/G09 kiểm tra thêm gesture chuyên biệt trong Chrome 900/1920/2K, high-DPI/zoom, touch/pen thật, scroll ngang và màn hình popup/list/report; không gộp PoC độc lập với nghiệm thu toàn ứng dụng.

**Kết luận:** G07 DONE ở mức mã độc lập + fixture + CI trên Tested SHA; tổng ứng dụng vẫn **HOLD**, G00 chủ trì tích hợp và quyết định phát hành.
