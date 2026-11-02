# Checkpoint — Chat 4: Sao lưu, kiểm tra snapshot và phục hồi

- **Trạng thái:** IN_PROGRESS
- **Cập nhật:** 02/11/2026, Asia/Saigon
- **File nhiệm vụ:** [CHAT_4_BACKUP.md](../CHAT_4_BACKUP.md)
- **Repository / nhánh:** `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat4-backup`
- **Worktree:** không dùng local checkout; thao tác qua GitHub connector trên nhánh riêng.
- **Mốc xuất phát:** `0a04b81dbb00979fb87aee7fc497e802058d8518`; HEAD khi bắt đầu `23c04997af803a6c4af741efb37ee161a9a7c5bc`.
- **Code SHA:** vẫn là runtime mốc xuất phát, chưa sửa runtime hoặc Rules.
- **Tested SHA:** NOT RUN (đang chuẩn bị công cụ/QA).
- **Writer cùng nhánh:** chưa phát hiện commit khác trên nhánh sau HEAD đầu vào; không có cách xác nhận một phiên writer chưa push.
- **Draft PR:** chưa mở.

## Đã hoàn tất
- Đọc nhiệm vụ, quy ước, `source/AGENTS.md`, checkpoint mẫu.
- Kiểm kê công cụ `firebase-backup-*` đã tồn tại trên branch; phần `source/docs/operations/pr149/` còn thiếu.
- Xác nhận các hợp đồng `decodeCandidate`, `verifyBackup`, `verifyCommittedRestoreSource` tồn tại trên source hiện tại.
- Đối chiếu FULL Rules: mốc chung đã chặn ghi quyền historical generation (khác mốc PR147 gốc có FRCR-01). Không thay Rules/backend.

## Đang làm / chưa commit
- Chuẩn bị đưa đúng file công cụ/runbook/test PR149 thuộc phạm vi vào nhánh; gia cố so checkpoint và guard restore riêng Emulator; lập workflow riêng Chat 4.
- Không có thay đổi local chưa commit. Không có dữ liệu thật/credential.

## Kiểm thử
| Lệnh / gate | SHA | Kết quả |
|---|---|---|
| GitHub checkout/kiểm nguồn | `23c0499` | Đã đọc file; chưa thực thi suite |
| Offline auditor và CLI A–O | — | NOT RUN |
| Auth/RTDB/2 Functions Emulator & full-root restore | — | NOT RUN |
| Production | — | NOT RUN — CẤM trong phạm vi này |

## Quyết định cần giữ
- Chỉ copy đường dẫn PR149 nằm trong phạm vi; **không** cherry-pick runtime/Rules.
- Giữ dữ liệu giả, port localhost, hash/số liệu kỹ thuật và báo cáo; không sửa first-import code của Chat 3.
- ACK mới sau snapshot cũ là STOP, snapshot mới + đối soát; không khôi phục đè.
- PASS của PR149 trên SHA cũ không tự động là PASS trên code SHA của luồng.

## Đã thử nhưng không hiệu quả
- Local container không phân giải được `github.com`, không thể clone/download repo trực tiếp bằng git; dùng GitHub connector để ghi nhánh và Actions CI để kiểm thử.

## Vấn đề ngoài phạm vi
- Production Rules/live data/IAM/first import thực cần operator được phép, quyết định D1–D3; không đụng trong Chat 4.

## Bước tiếp theo
1. Import auditor/runbook/tests đúng blob PR149, sửa guard backup/restore và test riêng Chat 4.
2. Commit/push qua GitHub connector, chạy CI trên chính SHA thay đổi; kiểm kết quả và sửa lỗi thuộc phạm vi.
3. Ghi report/checkpoint cuối với SHA code đã kiểm, các command và giới hạn production.

## Bàn giao cuối
- Chưa DONE. Tiếp tục từ các bước trên; không gọi PASS khi chưa có run.
