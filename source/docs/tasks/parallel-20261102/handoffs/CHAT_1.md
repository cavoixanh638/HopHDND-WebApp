# Checkpoint — Chat 1: Backend, Rules và tính toàn vẹn dữ liệu

- Trạng thái: **IN_PROGRESS** — đã commit regression + workflow, CI chưa kết luận.
- Cập nhật: 02/11/2026 (Asia/Saigon).
- File nhiệm vụ: [CHAT_1_BACKEND.md](../CHAT_1_BACKEND.md).
- Repository/branch: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat1-backend`.
- Base: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Code SHA regression: `5210876eb04be23c1ee611e985f82fd2bc684ceb`; CI workflow sửa Chromium tại `46e916f31976cbbf3451ff67c22832627ca28e82`.
- Docs-only sau code: `ae2c2146eb1cba1b644fe7df7b48e7862419f868` (report); commit checkpoint hiện tại tiếp theo.
- Tested SHA mới: `46e916f31976cbbf3451ff67c22832627ca28e82` **QUEUED/RUNNING, KHÔNG PHẢI PASS**.
- Worktree: không có local checkout. Git clone bị lỗi DNS; chỉnh GitHub bằng connector.
- Draft PR: chưa tạo; nhánh độc lập, không merge.
- Writer khác: chưa thể xác minh ngoài phiên này; không mở thêm chat ghi cùng nhánh.

## Đã hoàn tất
- Đã đọc nhiệm vụ/quy ước/AGENTS/mẫu, kiểm tra HEAD/permissions.
- Đã đối chiếu backend handler, parent contract, manifest, FULL candidate Rules và test hiện hữu.
- Đã thêm regression **two-row chained A→B→restore C→D→restore E** tại `source/parent-commit-service/test/integration.test.ts`; helper guest edit chọn recordId (default r1). Kiểm canonical digest vs raw backup, audit/lease/proof, rights/historical, guest mới và tamper.
- Đã thêm workflow riêng `.github/workflows/parallel-chat1-backend.yml`, chạy cùng cấu hình FULL candidate + hai Functions Emulator. Không deploy/publish.
- Đã viết báo cáo: [reports/CHAT_1.md](../reports/CHAT_1.md).

## Đang làm/chưa commit
- Không có file chưa commit tại local. Các thay đổi nhánh trên GitHub đã commit.
- Lượt 1 FAIL do thiếu Playwright Chromium (không phải backend); cell service 32 PASS/0 FAIL: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407577364
- Đã sửa riêng workflow cài Chromium; lượt 2 đang QUEUED: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643
- Lượt 1: setup/dependencies/static/typecheck PASS, cell 32/32 PASS; browser CHROME FATAL thiếu binary, parent NOT RUN. Lượt 2 chưa có kết quả.

## Kiểm thử
| Gate | SHA | Trạng thái | Bằng chứng |
|---|---|---|---|
| Parent/unified nền | `0a04b81` | PASS nền (không phải mã mới) | #41390964223 / #41390964227 |
| Chat1 lần 1 | `472a9425` | FAIL: browser thiếu Chromium; cell 32 PASS | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407577364 |
| Chat1 lần 2 (sửa CI cài Chromium) | `46e916f3` | QUEUED/RUNNING | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643 |
| Local emulator | — | NOT RUN | git clone DNS lỗi, không checkout local |

## Quyết định giữ
- Không thay đổi API UI, domain, operator, backup tool hay Rules production.
- Không coi checksum raw A như canonical C; canonical C tự tính từ server readback.
- Giữ idempotency, CAS, audit tamper deny, FRCR-01/DR-01/DR-02.
- Chỉ nghiệm thu kết quả cuối trên code SHA đã test.

## Đã thử nhưng không hiệu quả
- `git clone --filter=blob:none ...` ở container: `Could not resolve host: github.com`; connector GitHub đọc/ghi được.
- Fetch theo workflow cụ thể có URL GitHub connector chặn; đọc được actions/runs theo nhánh và jobs theo run ID.

## Vấn đề ngoài phạm vi
- Chưa xác nhận lỗi ngoài phạm vi.

## Bước tiếp theo
1. Gọi GitHub `mcp__GitHub__fetch_workflow_run_jobs` với `repo_full_name=cavoixanh638/HopHDND-WebApp`, `run_id=41407721643` để theo dõi job `backend-real-emulators`.
2. Nếu FAIL, đọc job ID thực tế của run mới qua `fetch_workflow_run_jobs`, rồi `fetch_workflow_job_logs`; sửa trong phạm vi, commit và chạy lại.
3. Nếu PASS, đối chiếu log witness `CHAT1_MULTIROW_CHAINED_RESTORE_PASS`, `PR142_INTEGRATED_SERVICES_FULL_RULES_PASS`, xác thực không skipped; cập nhật báo cáo + checkpoint thành DONE (hoặc DONE_WITH_EXTERNAL_GAPS khi có gap thật).
4. Trước DONE rà giới hạn CI: không merge, không deploy, không tác động môi trường thật.

## Bàn giao cuối
- Nếu vẫn RUNNING, người tiếp theo KHÔNG được gọi DONE dựa trên CI nền. Test mới đã được gửi lên GitHub; không cần hỏi lại người dùng.
