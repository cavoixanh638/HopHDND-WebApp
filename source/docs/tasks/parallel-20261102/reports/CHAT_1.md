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
| Chat 1 lượt 1 | `472a942533ab57446a725800a6f82e0b6477f951` | FAIL: thiếu Chromium ở workflow; cell-edit 32/32 PASS | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407577364 |
| Chat 1 lượt 2 | `46e916f31976cbbf3451ff67c22832627ca28e82` | **PASS**: Auth + hai Functions + FULL Rules; cell-edit 32/32; Chrome 4/4; parent 14/14; full-app 5/5 | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643 |
| Local clone / Emulator | — | NOT RUN | Container DNS không phân giải github.com, không có checkout/deps. Không được thay bằng mock để gọi PASS |

## Nghiệm thu và giới hạn
- Lượt 1 thất bại vì thiếu Chromium ở runner; đã sửa trong workflow riêng của Chat 1 bằng `npx --prefix cell-edit-service playwright install --with-deps chromium`.
- **Lượt 2 PASS tại chính xác SHA `46e916f31976cbbf3451ff67c22832627ca28e82`**: log có `PR142_SHARED_FULL_RULES_LIVE_EXACT`, `SUMMARY 32 PASS / 0 FAIL`, `CHROME SUMMARY 4 PASS / 0 FAIL`, `14 passed (14)`, `PARENT_ACTUAL_ONREQUEST_FUNCTIONS_EMULATOR PASS`, `PR142_FULL_APP_SUMMARY 5 0`, `PR142_INTEGRATED_SERVICES_FULL_RULES_PASS`.
- Test bổ sung xác nhận `CHAT1_MULTIROW_CHAINED_RESTORE_PASS` trên cùng SHA: hai bản ghi, nhiều thế hệ, digest raw A độc lập canonical C/E, bảo toàn backup và audit, guest tạo audit mới sau cả hai lần restore. Thao tác sửa audit lịch sử và quyền thế hệ C cũ đều `PERMISSION_DENIED` với hash snapshot server không đổi.
- [CI PASS #41407721643](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643) và [artifact witness #13124356699](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643/artifacts/13124356699).
- Không phát hiện lỗi xác nhận cần sửa tiếp trong phạm vi backend ở gate này; không sửa runtime/Rules vì mã hiện tại cùng regression đạt PASS. Gate là Emulator/CI, **không** phải xác nhận production đã sẵn sàng. Không merge/deploy/publish/production.
- Chỉ chỉnh test, workflow riêng và tài liệu Chat 1; commit sau code-test là docs-only. Trạng thái Chat 1: **DONE**, không tự khởi động vòng sửa mới.
