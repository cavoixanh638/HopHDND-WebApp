# Checkpoint — Chat 4: Sao lưu, kiểm tra snapshot và phục hồi

- **Trạng thái: DONE_WITH_EXTERNAL_GAPS** (offline + Emulator DONE, production HOLD)
- **Ngày:** 02/11/2026, Asia/Saigon.
- **File nhiệm vụ:** [CHAT_4_BACKUP.md](../CHAT_4_BACKUP.md)
- **Repo/branch:** `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat4-backup`.
- **Mốc runtime chung:** `0a04b81dbb00979fb87aee7fc497e802058d8518`; runtime/Rules giữ nguyên.
- **Tested code SHA:** `7d2525451dbb48699784b13291becd3fecf49582`.
- **CI:** [Run #41409437881 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409437881), exact SHA trên, demo only.
- **Docs-only commits sau tested SHA:** report/checkpoint mới nhất xem lịch sử trên nhánh; không làm thay đổi code đã test.
- **Writer / worktree:** thao tác qua GitHub connector, không có local worktree/uncommitted state; không thể xác minh writer chưa push khác.
- **Draft PR:** chưa tạo; không merge/deploy.

## Đã hoàn tất
1. Khôi phục đúng các file công cụ/runbook/tests PR149 thuộc vùng sở hữu, không cherry-pick runtime/Rules.
2. Gia cố auditor `source/docs/operations/pr149/offline-audit-core.mjs`: phát hiện thiếu generation, legacy delta, drift của freeze/legacy/rights/leases/journal/candidates/backups giữa checkpoints; kiểm candidate/backup bằng contract thật.
3. Gia cố `source/scripts/firebase-backup-emulator-restore.mjs`: cần manifest pair matching filename, bytes, SHA256, project; offline audit PASS trước PUT; snapshot mới khác bản cũ dẫn đến STOP; chỉ cho demo localhost `127.0.0.1:9198`.
4. QA mới `source/parallel-qa/chat4/restore-gate.fixture.mjs` phủ missing/corrupt manifest, ACK mới sau snapshot cũ, thiếu current-checkpoint pair.
5. Tạo `.github/workflows/parallel-chat4-backup-rehearsal.yml` (test-only), mở runbook G7 với hướng dẫn và trỏ first import của Chat 3.
6. Kết quả và lệnh trong [reports/CHAT_4.md](../reports/CHAT_4.md).

## Kiểm thử
| Gate | SHA | Kết quả |
|---|---|---|
| Node syntax, npm ci của source + hai Functions | `7d252545` | PASS |
| Offline source A–O fixtures + CLI operator | `7d252545` | PASS |
| Negative snapshot/restore guards | `7d252545` | PASS |
| Auth + RTDB + 2 Functions, FULL Rules; S1-S3/FRCR-01/DR02 | `7d252545` | PASS |
| Admin first bootstrap qua protected API emulator | `7d252545` | PASS |
| Original backup verifier fixture | `7d252545` | PASS |
| Actual full-root restore `demo-hdnd-restore`, readback rights/history/journal/checksum | `7d252545` | PASS |
| Production IAM/live state/Rules/private checkpoint/UAT/deploy | — | NOT RUN — HARD HOLD |

## Quyết định và giới hạn
- Mọi PASS thuộc dữ liệu tổng hợp và Emulator. Không đọc/ghi production, không triển khai Rules/Functions/Pages.
- Không coi JSON manifest tự khai hash là provenance độc lập. Operator phải xác minh nguồn Rules + checkpoint từ hệ thống thật được cấp quyền.
- Chỉnh sửa server ACK sau snapshot = STOP, tạo snapshot mới và đối soát; không khôi phục backup cũ đè dữ liệu.
- D1: nguồn nghiệp vụ chính thức; D2: mapping ID và quyền/history; D3: người/thời gian GO là ba nhóm quyết định owner. Tham số kỹ thuật thuộc operator.
- First import do Chat 3 sở hữu: `source/scripts/operator-first-import.mjs` và `source/docs/operations/PR147_OPERATOR_FIRST_IMPORT.md`. Không sửa.

## Đã thử nhưng không hiệu quả
- Git clone trong container không kết nối GitHub do DNS; dùng GitHub connector và GitHub Actions để kiểm thử.
- CI push đầu `53885d...` fail vì lỗi YAML khi tạo file; đã sửa ở `7d252545...`, workflow được chấp nhận và SUCCESS.

## Vấn đề ngoài phạm vi
- Production real Rules/data IAM/verified private backup, quyết định GO và UAT: operator/owner/người điều phối; không thể gọi DONE phát hành. `NOT RUN` được ghi minh bạch.

## Bước tiếp theo cho chat sau
1. **Nếu chỉ tiếp quản Chat 4: không mở vòng sửa mới**; trạng thái `DONE_WITH_EXTERNAL_GAPS`, tool/Emulator đã PASS.
2. Điều phối tích hợp đọc báo cáo và [CI #41409437881](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409437881). Khi tích hợp nhánh khác phải chạy lại SHA mới; không sử dụng kết quả cũ làm release proof.
3. Chỉ operator được phê duyệt mới thực hiện production read-only backup, Rules provenance, reconciliation và trình GO riêng.

## Bàn giao cuối
- Nhánh: `parallel/20261102-chat4-backup`. Tested SHA: `7d2525451dbb48699784b13291becd3fecf49582`.
- Report: [CHAT_4.md](../reports/CHAT_4.md). Runbook: [RUNBOOK.md](../../../operations/pr149/RUNBOOK.md).
