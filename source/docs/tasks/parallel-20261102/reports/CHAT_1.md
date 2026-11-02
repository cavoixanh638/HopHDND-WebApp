# Báo cáo Chat 1 — Backend, Rules và toàn vẹn dữ liệu

Ngày: 02/11/2026 (Asia/Saigon). Nhánh: `parallel/20261102-chat1-backend`.

## Phạm vi, căn cứ
Đã đọc `CHAT_1_BACKEND.md`, `QUY_UOC_CHUNG.md`, `AGENTS.md`, checkpoint và các nguồn:
- `cell-edit-service/core.js`, `test/integration.mjs`.
- `parent-commit-service/src/{commit,handler,manifest,parent-contract}.mjs`, `test/integration.test.ts`.
- `firebase/database.exclusive-candidate.rules.json`, hai workflow/service configs, integration launcher.

## Đối chiếu thực tế
- A→B→C có test thực Auth/Callable/onRequest/FULL Rules trong integration parent; đường guest A audit, restore C, guest C audit, raw A checksum và C canonical digest được đối chiếu bằng dữ liệu đọc lại.
- DR-01 stale renew/release/save kiểm tại cell integration. FRCR-01 historical rights, queued pointer race, DR-02 forged backup, idempotent HTTP lost ACK và audit tamper có test hiện hữu.
- Parent `verifyCommittedRestoreSource` ràng buộc backup với journal COMMITTED, immutable historical rows/rights/leases; `rowsWithProvenance` bỏ `editProofs` cũ khỏi C. `assertSafeParentTransition` so khớp generation/permission/ledger/backup.
- Khoảng trống kiểm thử được chọn: nhiều hàng có history khác nhau + restore tiếp theo sau khi C lại được guest chỉnh sửa.

## Thay đổi trên nhánh
1. `source/parent-commit-service/test/integration.test.ts`: helper guest edit nhận recordId tùy chọn (mặc định r1, không đổi API người dùng) và test `CHAT1 chained multirow A→B→restore C→D→restore E with independent guest audit`: hai hàng r1/r2, audit A, B sửa, C restore, C có hai audit mới, D thay thế, E restore, guest audit E, checksum/canonical tách biệt, backup/historical permission/lease bất biến, history tamper bị Rules DENY.
2. `.github/workflows/parallel-chat1-backend.yml`: push branch riêng, Auth+RTDB+2 Functions với FULL candidate Rules, typecheck, backend checks, integrated runner và upload witness; không deploy/publish.
3. `handoffs/CHAT_1.md`: checkpoint trên nhánh.

## Kiểm thử, chứng cứ
| Gate | SHA | Trạng thái | Bằng chứng |
|---|---|---|---|
| Baseline parent 13/13, unified 4/4 | `0a04b81` | PASS nền do nhiệm vụ dẫn | CI #41390964223 và #41390964227; không gán cho code mới |
| Chat 1 thực Auth+2 Functions+FULL Rules | `472a942533ab57446a725800a6f82e0b6477f951` | RUNNING tại thời điểm báo cáo | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407577364 |
| Local clone / Emulator | — | NOT RUN | Container DNS không phân giải github.com, không có checkout/deps. Không được thay bằng mock để gọi PASS |

## Giới hạn và bước cuối
- Chưa có chứng cứ PASS cho test mới; không được gọi luồng DONE trước CI.
- Chờ job `backend-real-emulators` hoàn tất, đọc kết quả/log; nếu FAIL phải sửa trong vùng sở hữu, đẩy commit tiếp và chạy lại.
- Nếu chỉ trở ngại thực thi ngoài phạm vi, ghi chính xác BLOCKED; không đụng UI/operator/backup tools/config chung, không merge/deploy/production.
- Code SHA của bản tạo CI hiện tại: `472a942533ab57446a725800a6f82e0b6477f951`.
