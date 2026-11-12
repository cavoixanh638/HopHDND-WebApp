# Luồng B — nghiệm thu E2E thật trên Chrome + Firebase Emulator, 04/11/2026

## Bằng chứng chính xác

- **UI source SHA (không thay sau bàn giao lần trước):** `9ca1101edeabe942a5ce4daeee15c96b05795a99`.
- **Bộ E2E + UI tested SHA cuối:** `b35611a7d452313e9e33536d5be3a1309f9d6605` — [commit](https://github.com/cavoixanh638/HopHDND-WebApp/commit/b35611a7d452313e9e33536d5be3a1309f9d6605).
- **Workflow E2E:** [GitHub Actions #41770322927](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41770322927), job `real-app-admin-controls` **SUCCESS**, đã xác minh exact `B_TEST_CODE_SHA`, `node --check`, `npm run typecheck`, `npm run build:pages:test`, rồi chạy real Chrome với Auth/Database/Functions Emulators.
- **PNG screenshot artifact:** [#13293834814 — ui-20261104-b-admin-controls-41770322927](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41770322927/artifacts/13293834814), `sha256:ee333316115b4473afd747a01c260375c33e5e70acc543799a046f9c174142aa` (**digest ZIP**, không phải hash từng ảnh), 2,406,668 byte, artifact `head_sha` chính xác `b35611a7d452313e9e33536d5be3a1309f9d6605`.
- **Script/CI nguồn:** `source/scripts/ui-20261104-b-admin-controls-e2e.mjs`; `.github/workflows/ui-20261104-b-admin-e2e.yml`.
- **PR DRAFT CHỈ ĐỂ CHẠY CI:** [#156](https://github.com/cavoixanh638/HopHDND-WebApp/pull/156), không merge, không deploy.

## Ma trận gate có log PASS trên cùng SHA

| Tiêu chí | Log/Evidence | Kết quả |
|---|---|---|
| Rules thực trong Emulator khớp candidate; 3 dòng giả | `UI_B_ADMIN_RULES_EXACT_PASS`; `SYNTHETIC_SEED_PASS` | PASS |
| Admin thấy 3 checkbox + lối sửa tên; guest không thấy admin controls, không tràn trang | 6 dòng `UI_B_ADMIN_VIEWPORT_PASS`: admin + guest tại **1440, 900, 390px** | PASS |
| Tên rỗng báo lỗi, không làm tăng profile revision; tên đã xác nhận giữ nguyên | `UI_B_ADMIN_EMPTY_TITLE_DENIED_PASS`, revision 1 | PASS |
| Đổi tên bằng pointer và nhập Chrome, lưu đến server, admin tab/title và guest cập nhật | `UI_B_ADMIN_TITLE_SAVE_LIVE_GUEST_PASS`, revision 2 | PASS |
| Tải lại cả hai browser, xác minh Auth Emulator admin và tên từ profile vẫn đúng | `RELOAD_REAL_EMULATOR_ADMIN_REAUTH_PASS`; `TITLE_RELOAD_PASS` | PASS |
| C01 (party), C02 (build), C03 (nq) tắt riêng bằng pointer, bật lại bằng phím Space; mỗi lượt lưu RTDB | 3 dòng `CARD_TOGGLE_MOUSE_KEYBOARD_PASS`, revision 4/6/8 | PASS |
| C00 luôn hiện; thống kê bộ lọc, 3 dòng nghiệp vụ, 5 báo cáo và source RTDB không đổi | `DATA_REPORTS_FILTERS_UNCHANGED_PASS` và các assert số liệu/snapshot | PASS |
| Hai phiên Chrome admin thật tranh chấp tên cùng field, CAS không đè âm thầm; giải quyết bằng lựa chọn remote | `TWO_REAL_TABS_CAS_RESOLVED_PASS` | PASS |
| Giả lập Firebase Rules từ chối ghi profile, UI rollback và revision không tăng; Rules được khôi phục | `EMULATOR_DENIED_ROLLBACK_PASS`, revision 10 | PASS |
| Chrome ngắt mạng: admin write control gated, không ghi RTDB, không thông báo đã lưu giả | `OFFLINE_CONTROL_GATED_PASS`, `OFFLINE_NO_FALSE_ACK_PASS`, revision 10 | PASS |
| Trở lại online: controls có lại; C02 lưu được và khôi phục trạng thái, server ACK theo revision 12 | `OFFLINE_RECOVERY_PASS {verifiedWriteAfterReconnect:true}` | PASS |
| Chỉ localhost, không request production Firebase/Sheets | `E2E_PASS {noProductionNetwork:true}` | PASS |

Các ảnh đóng gói gồm admin/guest ba viewport, tên không hợp lệ, tên sau lưu, từng card tắt, report, CAS conflict, bị từ chối quyền, offline và sau khi nối mạng + xác nhận lưu.

## Xử lý các lần test script FAIL trước khi PASS

- [#41768117999](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41768117999): CDP Ctrl+A không chọn được tên cũ; dùng native input selection + CDP Input.insertText.
- [#41768313368](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41768313368), [#41768459465](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41768459465): điều hướng reload dùng tên cũ / DOM trước unload; xác nhận new document và chọn route theo vị trí thực.
- [#41768840749](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41768840749): Auth test origin không luôn giữ Google admin sau reload; gọi lại helper **Google Emulator verified** và đợi App xác nhận.
- [#41769645358](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41769645358), [#41769952944](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41769952944): phiên Chrome admin thứ hai login khi `ensureGuestAuth` còn đang khởi tạo có thể bị anonymous sign-in ghi đè. Đã chặn race bằng cách chờ **real App guest UID đã xác nhận** trước khi signInWithCredential và chờ real App `isAdmin=true`. Không fake quyền hoặc hạ assert.
- [#41769141626](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41769141626) và [#41769395375](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41769395375) từng PASS toàn bộ gate lúc đó; bản cuối `#41770322927` bổ sung kiểm tra save sau reconnect và cùng PASS.

## Phạm vi, an toàn và trạng thái

- **Không sửa production app, backend, Rules, dữ liệu thực, file A hoặc tracker.** Diff mới riêng luồng B chỉ test script + workflow + tài liệu evidence/checkpoint.
- Firebase Emulator dùng project `demo-hdnd`, namespace giả lập, owner REST chỉ trỏ `127.0.0.1:9000`; Google test credential được Auth Emulator xác thực; không thực hiện Google OAuth thật. Ngay cả bước denied là sửa Rules **bên trong Emulator**, khôi phục sau thử, không sửa candidate Rules trong repo.
- **Worker B: DONE, E2E gate PASS trên B SHA.** Việc tổng chỉ huy rebase/nhận test và nghiệm thu trên **SHA tích hợp cuối**, dựng private demo, lấy HTML file hash và cập nhật release vẫn là nhiệm vụ của tổng chỉ huy; chưa có bằng chứng production.
