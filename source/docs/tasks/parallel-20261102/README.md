# 5 luồng làm việc song song — bắt đầu hoặc tiếp tục từ đây

Bộ phân công ngày 02/11/2026 cho `cavoixanh638/HopHDND-WebApp`.
Năm luồng có phạm vi riêng, tự làm và tự kiểm đến khi bàn giao.
**Không có luồng chỉ ngồi chờ nghiệm thu đầu ra luồng khác.**

## Chỉ cần gửi một đường dẫn cho mỗi chat

Nói: **“Bạn phụ trách luồng này. Đọc file dưới đây, quy ước chung và checkpoint
mà file dẫn tới, rồi thực hiện/tiếp tục đến khi hoàn tất.”**

| Luồng | Vai trò | File đầu vào (trên nhánh riêng) | Bộ nhớ bền vững |
|---|---|---|---|
| Chat 1 | Backend, Rules và tính toàn vẹn dữ liệu | [Đọc nhiệm vụ](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat1-backend/source/docs/tasks/parallel-20261102/CHAT_1_BACKEND.md) | [Checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat1-backend/source/docs/tasks/parallel-20261102/handoffs/CHAT_1.md) |
| Chat 2 | Giao diện và thao tác người dùng | [Đọc nhiệm vụ](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat2-ui/source/docs/tasks/parallel-20261102/CHAT_2_UI.md) | [Checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat2-ui/source/docs/tasks/parallel-20261102/handoffs/CHAT_2.md) |
| Chat 3 | Công cụ nhập dữ liệu lần đầu | [Đọc nhiệm vụ](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat3-bootstrap/source/docs/tasks/parallel-20261102/CHAT_3_BOOTSTRAP.md) | [Checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat3-bootstrap/source/docs/tasks/parallel-20261102/handoffs/CHAT_3.md) |
| Chat 4 | Sao lưu, kiểm tra snapshot và phục hồi | [Đọc nhiệm vụ](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat4-backup/source/docs/tasks/parallel-20261102/CHAT_4_BACKUP.md) | [Checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat4-backup/source/docs/tasks/parallel-20261102/handoffs/CHAT_4.md) |
| Chat 5 | Đóng gói, cấu hình và chuẩn bị phát hành | [Đọc nhiệm vụ](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat5-release/source/docs/tasks/parallel-20261102/CHAT_5_RELEASE.md) | [Checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat5-release/source/docs/tasks/parallel-20261102/handoffs/CHAT_5.md) |

Dùng đúng các link trong bảng khi tạo chat mới để tiếp tục. File nhiệm vụ dẫn tới
checkpoint mới nhất trên nhánh luồng; không cần chép lại lịch sử hội thoại.
Nếu checkpoint đã DONE, chat mới báo kết quả hiện có, không làm lại.

## Quy ước và cấu trúc

- [QUY_UOC_CHUNG.md](QUY_UOC_CHUNG.md): mốc xuất phát, quyền sửa, cách tự kiểm,
  cách dùng worktree/cổng Emulator riêng, checkpoint và ranh giới production.
- [HANDOFF_TEMPLATE.md](HANDOFF_TEMPLATE.md): mẫu bàn giao ngắn cho lần đổi chat.
- `CHAT_N_*.md`: nhiệm vụ cố định từng luồng.
- `handoffs/CHAT_N.md`: trạng thái tiến độ **do luồng cập nhật trên nhánh của mình**.
- `reports/CHAT_N.md`: báo cáo kết quả do luồng tạo khi có bằng chứng.

Mốc mã nguồn: `0a04b81dbb00979fb87aee7fc497e802058d8518`. Bộ tài liệu và nhánh được chuẩn bị phía trên
mốc này bằng các commit docs-only; không đổi runtime. Nhánh tài liệu gốc
`docs/parallel-workstreams-20261102` chứa bản khởi tạo, **không phải dashboard tiến độ tự đồng bộ**.
Để xem tiến độ, mở checkpoint trên nhánh riêng trong bảng.

## Điều phối và tích hợp

Mỗi nhánh chỉ một writer hoạt động; chat mới thay chat cũ trong cùng luồng,
không mở hai chat cùng sửa một nhánh. Các luồng khác không phải đợi nhau.
Người điều phối đọc các checkpoint/báo cáo, đối chiếu diff, tích hợp cuối và
chạy gate cho bản ghép; không biến việc tích hợp cuối thành điều kiện bắt đầu
của năm luồng.

Không tự merge/deploy/publish hoặc truy cập production. Bằng chứng code và
Emulator không phải phê duyệt production. Không tự đánh dấu nhiệm vụ xong
chỉ vì bộ tài liệu này đã được tạo.
