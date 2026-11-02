# Checkpoint — Chat 1: Backend, Rules và tính toàn vẹn dữ liệu

- Trạng thái: **IN_PROGRESS** — đã commit regression + workflow, CI chưa kết luận.
- Cập nhật: 02/11/2026 (Asia/Saigon).
- File nhiệm vụ: [CHAT_1_BACKEND.md](../CHAT_1_BACKEND.md).
- Repository/branch: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat1-backend`.
- Base: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- HEAD code + workflow được kiểm thử: `472a942533ab57446a725800a6f82e0b6477f951`.
- Docs-only sau code: `ae2c2146eb1cba1b644fe7df7b48e7862419f868` (report); commit checkpoint hiện tại tiếp theo.
- Tested SHA: `472a942533ab57446a725800a6f82e0b6477f951` **RUNNING, KHÔNG PHẢI PASS**.
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
- CI mới chưa hoàn tất: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407577364
- Tại lần kiểm cuối: setup/dependencies/static/typecheck PASS, integrated Emulator RUNNING.

## Kiểm thử
| Gate | SHA | Trạng thái | Bằng chứng |
|---|---|---|---|
| Parent/unified nền | `0a04b81` | PASS nền (không phải mã mới) | #41390964223 / #41390964227 |
| Chat1 Auth+2 Functions+FULL Rules | `472a9425` | RUNNING | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407577364 |
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
1. Gọi GitHub `mcp__GitHub__fetch_workflow_run_jobs` với `repo_full_name=cavoixanh638/HopHDND-WebApp`, `run_id=41407577364` để theo dõi job `backend-real-emulators`.
2. Nếu FAIL, đọc `fetch_workflow_job_logs` với job ID `125152988396`, sửa test/backend thuộc phạm vi, commit rồi chờ CI mới.
3. Nếu PASS, đối chiếu log witness `CHAT1_MULTIROW_CHAINED_RESTORE_PASS`, `PR142_INTEGRATED_SERVICES_FULL_RULES_PASS`, xác thực không skipped; cập nhật báo cáo + checkpoint thành DONE (hoặc DONE_WITH_EXTERNAL_GAPS khi có gap thật).
4. Trước DONE rà giới hạn CI: không merge, không deploy, không tác động môi trường thật.

## Bàn giao cuối
- Nếu vẫn RUNNING, người tiếp theo KHÔNG được gọi DONE dựa trên CI nền. Test mới đã được gửi lên GitHub; không cần hỏi lại người dùng.
