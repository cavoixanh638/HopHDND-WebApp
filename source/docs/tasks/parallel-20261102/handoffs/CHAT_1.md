# Checkpoint — Chat 1: Backend, Rules và tính toàn vẹn dữ liệu

- Trạng thái: **IN_PROGRESS**
- Cập nhật: 02/11/2026, Asia/Saigon — bắt đầu tiếp quản qua GitHub connector.
- File nhiệm vụ: [CHAT_1_BACKEND.md](../CHAT_1_BACKEND.md).
- Repository / nhánh: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat1-backend`.
- Mốc mã nguồn xuất phát: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- HEAD khi tiếp quản: `23c04997af803a6c4af741efb37ee161a9a7c5bc` (nhánh tài liệu, chưa có thay đổi runtime của luồng).
- Code SHA gần nhất: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Tested SHA riêng luồng: **NOT RUN**.
- Worktree: không có checkout địa phương; `git clone` từ môi trường chạy bị chặn DNS, GitHub connector đọc/ghi được.
- Writer khác cùng nhánh: chưa xác minh được bên ngoài phiên làm việc này; checkpoint trước là NOT_STARTED.

## Đã hoàn tất
- Đọc nhiệm vụ, quy ước chung, mẫu handoff, `source/AGENTS.md`.
- Xác nhận đúng nhánh, HEAD qua GitHub Git Ref, quyền push qua connector.
- Xác nhận checkpoint trước là NOT_STARTED, không có việc của luồng đã commit.

## Đang làm / chưa commit hoặc chưa push
- Đang kiểm tra backend/Rules và chuỗi thực A → B → C, tiếp tục ngay sau checkpoint này.
- Không có file local cần bảo tồn; mọi thay đổi nhánh phải qua connector.

## Kiểm thử
| Lệnh/workflow | SHA | Trạng thái | Ghi chú |
|---|---|---|---|
| Baseline parent/unified (dẫn từ nhiệm vụ) | `0a04b81` | PASS nền | Không phải PASS của luồng này |
| Kiểm thử tích hợp mới Chat 1 | chưa có | NOT RUN | Cần chạy Auth + Functions + FULL Rules |

## Quyết định cần giữ
- Giữ API/Frontend contract, canonical C digest tách raw A checksum, CAS, audit và history.
- Chỉ sửa file sở hữu của Chat 1, không merge/deploy/production.
- Lỗi ngoài phạm vi phải lưu tái hiện và phân công, không bypass để báo PASS.

## Đã thử nhưng không hiệu quả
- `git clone` trực tiếp từ container không thực hiện được: `Could not resolve host: github.com`.
- GitHub connector đọc được SHA/file và có quyền ghi; sử dụng connector cho commit.

## Vấn đề ngoài phạm vi
- Chưa kết luận; cập nhật khi có kết quả.

## Bước tiếp theo
1. Đọc `cell-edit-service/`, `parent-commit-service/`, `firebase/database.exclusive-candidate.rules.json` và test hiện có.
2. Bổ sung regression/ sửa lỗi có chứng cứ trong phạm vi.
3. Tạo workflow kiểm thử riêng Chat 1 nếu cần; theo dõi chính xác SHA và trạng thái CI.
4. Cập nhật `reports/CHAT_1.md` và checkpoint DONE hoặc DONE_WITH_EXTERNAL_GAPS dựa trên bằng chứng.

## Bàn giao cuối
- Chưa hoàn tất; không coi CI nền là nghiệm thu.
