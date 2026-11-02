# Checkpoint — Chat 1: Backend, Rules và tính toàn vẹn dữ liệu

- Trạng thái: **DONE** — không mở vòng sửa mới khi chat sau đọc checkpoint.
- Ngày: **02/11/2026** (Asia/Saigon).
- Vai trò/file nhiệm vụ: [CHAT_1_BACKEND.md](../CHAT_1_BACKEND.md); quy ước [QUY_UOC_CHUNG.md](../QUY_UOC_CHUNG.md).
- Repository: `cavoixanh638/HopHDND-WebApp`; nhánh `parallel/20261102-chat1-backend`.
- Mốc chung: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Regression code commit: `5210876eb04be23c1ee611e985f82fd2bc684ceb`.
- Code + workflow được kiểm thử (tested SHA): **`46e916f31976cbbf3451ff67c22832627ca28e82`**.
- Docs-only tiếp theo: báo cáo nghiệm thu tại `c22ca562a732790ffe2acc60423eb526e96122aa`; checkpoint trong commit kế tiếp.
- Worktree: không có checkout local; mọi code/checkpoint đã commit trên GitHub.
- Draft PR: không; không merge.
- Writer khác trên nhánh: không phát hiện qua lịch sử nhánh; không thể xác minh mọi phiên bên ngoài.

## Đã hoàn tất
- Đối chiếu code service, contract, Rules, lịch sử, các gate FRCR-01, DR-01, DR-02, idempotency/backup/CAS/audit.
- Xác định khoảng trống multirow + chained restore; thêm regression `CHAT1 chained multirow A→B→restore C→D→restore E with independent guest audit` vào `source/parent-commit-service/test/integration.test.ts`; mở rộng helper guest theo `recordId` (default `r1`), không đổi giao diện API.
- Kiểm thực sự nhiều hàng r1/r2 qua signed-in Auth, hai Functions, FULL RTDB Rules: A guest audit → replace B → restore C (cũ không mang proof) → guest C audit → replace D → restore E → guest E audit. Kiểm canonical C/E độc lập checksum raw A, backup, journal, quyền/lease/history bất biến, tamper DENIED.
- Thêm workflow không deploy `.github/workflows/parallel-chat1-backend.yml`, cài Chromium đúng cho Chrome regression.
- Báo cáo [reports/CHAT_1.md](../reports/CHAT_1.md) đã cập nhật kết quả.

## Kiểm thử nghiệm thu chính xác
| Gate | SHA | Kết quả | Link/bằng chứng |
|---|---|---|---|
| Parent 13/13, unified 4/4 nền | `0a04b81` | PASS nền, không tính cho code mới | CI #41390964223 / #41390964227 |
| Chat 1 lượt đầu | `472a942533ab57446a725800a6f82e0b6477f951` | FAIL do thiếu Chromium runner; cell-edit 32/32 PASS | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407577364 |
| **Chat 1 cuối** | **`46e916f31976cbbf3451ff67c22832627ca28e82`** | **PASS**: cell 32/32; Chrome 4/4; parent 14/14; full App 5/5; typecheck; FULL Rules Auth + 2 Functions | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643 |

- CI log: `PR142_SHARED_FULL_RULES_LIVE_EXACT` → `CHAT1_MULTIROW_CHAINED_RESTORE_PASS` → `PR142_INTEGRATED_SERVICES_FULL_RULES_PASS`.
- Audit tamper và sửa quyền historical C: `PERMISSION_DENIED`, hash trạng thái server không đổi.
- Artifact witness: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643/artifacts/13124356699.

## Quyết định và giới hạn
- Giữ nguyên runtime/Rules/API vì chưa xác nhận lỗ hổng trong phạm vi sau test; chỉ bổ sung kiểm chứng và CI.
- Digest canonical C/E không đồng nhất với checksum raw backup A; test tính độc lập từ snapshot dữ liệu thực đọc lại.
- Không merge, deploy, publish, production write, hoặc tự phê duyệt GO; nghiệm thu Emulator ≠ đủ điều kiện production.
- Không sửa file luồng khác/UI/data domain/backup operator/config dùng chung.

## Đã thử nhưng không hiệu quả
- `git clone` local: DNS container không phân giải `github.com`; GitHub connector + Actions đã đọc, ghi, test thành công.
- CI lượt 1 thiếu Chromium; workflow đã khắc phục, CI lượt 2 PASS.

## Vấn đề ngoài phạm vi
- Không có blocker còn mở cho phạm vi Chat 1. Quyết định production và tích hợp tổng thuộc người điều phối.

## Bước tiếp theo
1. **Không có việc cần tiếp tục trong Chat 1** (DONE); người điều phối tích hợp/review nhánh sau khi các luồng khác hoàn tất.
2. Nếu phát sinh bug mới có tái hiện, người điều phối mở nhiệm vụ riêng; không tự sửa lại khi chỉ được yêu cầu đọc checkpoint.

## Bàn giao cuối
- Báo cáo: [reports/CHAT_1.md](../reports/CHAT_1.md).
- Tested code SHA: `46e916f31976cbbf3451ff67c22832627ca28e82`; các commit sau chỉ là tài liệu bàn giao.
